CREATE DATABASE IF NOT EXISTS po_agent;
USE po_agent;

CREATE TABLE IF NOT EXISTS agent_user_tokens (
    google_user_id  VARCHAR(255) PRIMARY KEY,
    wso2_email      VARCHAR(255) NOT NULL,
    access_token    TEXT NOT NULL,
    id_token        TEXT,             -- JWT with email + groups, used as Bearer for Choreo APIs
    refresh_token   TEXT,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Every 1:1 DM between Novera and one person: where notifications from other
-- services (POST /internal/notifications) are sent. Kept current from webhook
-- events (added to a DM, any message in a DM, removed); existing DMs were
-- backfilled once with scripts/backfill-dm-spaces.mjs. Separate from
-- agent_user_tokens because a DM exists while Novera is installed, whether or
-- not the person has connected their WSO2 account.
CREATE TABLE IF NOT EXISTS agent_dm_spaces (
    space_name      VARCHAR(255) PRIMARY KEY,   -- "spaces/XXXX"
    google_user_id  VARCHAR(255),               -- "users/123"
    display_name    VARCHAR(255),               -- from Google; refreshed on each interaction
    email           VARCHAR(255),               -- from Chat events; NULL for backfilled rows until they interact
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_google_user_id (google_user_id)
);

-- Threads the bot has either received a webhook from OR posted a message in.
-- Used to decide whether an inbound webhook's thread.name is a reply inside
-- an existing thread (anchor reply to it) vs a brand-new thread Chat auto-
-- created for a top-level message (don't anchor — let reply land in main).
-- The Chat API alternative (spaces.messages.list) doesn't work in DM spaces
-- without Workspace admin approval, so we track this ourselves.
CREATE TABLE IF NOT EXISTS agent_known_threads (
    space_name    VARCHAR(255) NOT NULL,
    thread_name   VARCHAR(255) NOT NULL,
    first_seen_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (space_name, thread_name)
);

CREATE TABLE IF NOT EXISTS agent_oauth_states (
    state            VARCHAR(512) PRIMARY KEY,
    google_user_id   VARCHAR(255) NOT NULL,
    expires_at       TIMESTAMP NOT NULL,
    space_name       VARCHAR(255),        -- Chat space to post proactive reply to
    thread_name      VARCHAR(255),        -- Chat thread to anchor the reply (NULL = post to space's main section)
    original_message TEXT,               -- User's message that triggered auth
    display_name     VARCHAR(255),        -- User's display name
    user_email       VARCHAR(255),        -- User's Google email
    INDEX idx_expires_at (expires_at)
);

-- Migration for existing deployments (no-op on fresh installs where the column
-- is already in the CREATE TABLE above). MySQL has no ADD COLUMN IF NOT EXISTS,
-- so we conditionally build the ALTER via information_schema.
SET @add_thread_name := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE agent_oauth_states ADD COLUMN thread_name VARCHAR(255) AFTER space_name',
        'SELECT 1'
    )
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'agent_oauth_states'
      AND COLUMN_NAME  = 'thread_name'
);
PREPARE stmt FROM @add_thread_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS agent_conversations (
    google_user_id  VARCHAR(255) PRIMARY KEY,
    messages        LONGTEXT NOT NULL,   -- stores AES-256-GCM encrypted JSON
    last_activity   TIMESTAMP NOT NULL,
    INDEX idx_last_activity (last_activity)
);

CREATE TABLE IF NOT EXISTS agent_audit_log (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    google_user_id   VARCHAR(255) NOT NULL,
    wso2_email       VARCHAR(255) NOT NULL,
    action           VARCHAR(100) NOT NULL,
    response_status  VARCHAR(50) NOT NULL,
    response_message VARCHAR(500),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_google_user_id (google_user_id),
    INDEX idx_wso2_email (wso2_email),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS agent_llm_call_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id      VARCHAR(36) NOT NULL,
    google_user_id  VARCHAR(255) NOT NULL,
    wso2_email      VARCHAR(255),
    round           INT NOT NULL,           -- which iteration of the agentic loop (1-indexed)
    stop_reason     VARCHAR(50),            -- end_turn | tool_use
    tools_called    JSON,                   -- array of tool names Claude decided to invoke
    input_tokens    INT,
    output_tokens   INT,
    duration_ms     INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    -- Composite index for the per-user token quota query (SUM over a sliding
    -- window). Keeps the per-turn check cheap even with millions of rows.
    INDEX idx_user_created_at (google_user_id, created_at)
);

-- Migration for existing deployments (no-op on fresh installs where the
-- composite index is in the CREATE TABLE above). MySQL has no
-- ADD INDEX IF NOT EXISTS, so we gate via information_schema.
SET @add_user_time_idx := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE agent_llm_call_log ADD INDEX idx_user_created_at (google_user_id, created_at)',
        'SELECT 1'
    )
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'agent_llm_call_log'
      AND INDEX_NAME   = 'idx_user_created_at'
);
PREPARE stmt FROM @add_user_time_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- PO-policy corpus — synced from Google Drive, included in the agent's
-- system prompt for policy Q&A. Single-row pattern (id = 1 always); every
-- sync UPSERTs over the previous content. Drive is the source of truth for
-- history. To recover from a bad sync: DELETE WHERE id = 1, let next sync refill.
CREATE TABLE IF NOT EXISTS agent_policy_corpus (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    content       MEDIUMTEXT NOT NULL,        -- concatenated policy docs, "=== Title ===" separated
    doc_count     INT NOT NULL,
    total_bytes   INT NOT NULL,
    synced_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_synced_at (synced_at)
);

-- Training & Certification corpus (v1.1.0) — synced from a Drive folder
-- owned by the Training & Certification team. Same single-row UPSERT
-- pattern as agent_policy_corpus. To recover from a bad sync:
-- DELETE WHERE id = 1, let next sync refill.
CREATE TABLE IF NOT EXISTS agent_training_corpus (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    content       MEDIUMTEXT NOT NULL,        -- concatenated training docs, "=== Title ===" separated
    doc_count     INT NOT NULL,
    total_bytes   INT NOT NULL,
    synced_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_synced_at (synced_at)
);

-- Cafeteria menu cache (v1.1.x) — opportunistic, on-demand cache. When a Sri
-- Lanka user asks about today's menu, the get_menu tool call executes as usual
-- (authenticated with that user's id_token) and the successful result is
-- UPSERTed here. Subsequent turns for any user inject this cache into the
-- system prompt so the model can answer menu Qs without a tool round-trip.
-- No background sync — the cache refreshes lazily when it's stale AND a user
-- asks. Single-row UPSERT (id = 1). To recover from a bad row: DELETE WHERE
-- id = 1; next menu question repopulates.
CREATE TABLE IF NOT EXISTS agent_menu_cache (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    menu_json     JSON NOT NULL,              -- full get_menu response (date, breakfast, juice, lunch, dessert, snack)
    synced_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_synced_at (synced_at)
);

-- Requires event_scheduler = ON on the MySQL server
CREATE EVENT IF NOT EXISTS purge_agent_llm_call_log
    ON SCHEDULE EVERY 1 DAY
    STARTS CURRENT_TIMESTAMP
    DO DELETE FROM agent_llm_call_log WHERE created_at < NOW() - INTERVAL 30 DAY;
