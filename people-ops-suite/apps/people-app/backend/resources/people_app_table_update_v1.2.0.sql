-- Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
--
-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- ---------------------------------------------------------------------------
-- Resignation audit trail
--
-- The resignation table carried no audit table and no triggers, so a change to
-- a departure date or reason overwrote the previous value with no record of it.
-- Employee status transitions were already tracked on the employee table, which
-- left the timeline showing half the story: "Active -> Marked leaver" appeared,
-- but the reason behind it could be rewritten silently.
--
-- This adds the same snapshot-per-write trail the employee and personal_info
-- tables already have. History starts here: edits made before this migration
-- were never recorded and cannot be recovered.
--
-- resignation keys on employee_id, so the audit keys on employee_pk_id exactly
-- as employee_audit does, and needs none of the anchor-row indirection that
-- personal_info_audit requires.
-- ---------------------------------------------------------------------------

CREATE TABLE `resignation_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resignation_audit_employee_pk` (`employee_pk_id`),
  KEY `idx_resignation_audit_action_on` (`action_on`),
  CONSTRAINT `fk_resignation_audit_employee` FOREIGN KEY (`employee_pk_id`) REFERENCES `employee` (`id`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Procedure: prc_resignation_audit
--
-- Arguments are passed positionally from both triggers below. Adding a column
-- means adding it at the same ordinal in this signature and in BOTH CALL
-- argument lists, or every later argument shifts and the audit JSON is silently
-- written with values in the wrong keys.
DELIMITER //
CREATE PROCEDURE `prc_resignation_audit`(
  IN p_employee_pk_id           INT,
  IN p_action_type              VARCHAR(10),
  IN p_action_by                VARCHAR(254),
  IN p_final_day_in_office      DATE,
  IN p_final_day_of_employment  DATE,
  IN p_reason                   VARCHAR(300),
  IN p_date                     DATE,
  IN p_created_by               VARCHAR(254),
  IN p_created_on               DATETIME(6),
  IN p_updated_by               VARCHAR(254),
  IN p_updated_on               DATETIME(6)
)
BEGIN
  INSERT INTO resignation_audit
    (employee_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_employee_pk_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'employee_id',             p_employee_pk_id,
      'final_day_in_office',     p_final_day_in_office,
      'final_day_of_employment', p_final_day_of_employment,
      'reason',                  p_reason,
      'date',                    p_date,
      'created_by',              p_created_by,
      'created_on',              p_created_on,
      'updated_by',              p_updated_by,
      'updated_on',              p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_resignation_audit_insert
DELIMITER //
CREATE TRIGGER `trg_resignation_audit_insert`
AFTER INSERT ON `resignation`
FOR EACH ROW
BEGIN
  CALL prc_resignation_audit(
    NEW.employee_id,
    'INSERT',
    COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.final_day_in_office,  NEW.final_day_of_employment,
    NEW.reason,               NEW.date,
    NEW.created_by,           NEW.created_on,
    NEW.updated_by,           NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_resignation_audit_update
DELIMITER //
CREATE TRIGGER `trg_resignation_audit_update`
AFTER UPDATE ON `resignation`
FOR EACH ROW
BEGIN
  CALL prc_resignation_audit(
    NEW.employee_id,
    'UPDATE',
    COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.final_day_in_office,  NEW.final_day_of_employment,
    NEW.reason,               NEW.date,
    NEW.created_by,           NEW.created_on,
    NEW.updated_by,           NEW.updated_on
  );
END//
DELIMITER ;

-- ---------------------------------------------------------------------------
-- Scheduled employee changes
--
-- An edit to an employee's general information can be given a future date
-- instead of being applied on save: a promotion effective the first of the
-- month, a transfer effective when the quarter starts. The row holds the change
-- until that date, and the scheduler applies it through the same update path an
-- immediate save uses.
--
-- `changes` holds only the fields being changed, in the shape the job-info
-- update payload expects, so applying a row is handing it straight to that
-- function rather than translating between two formats.
--
-- `expected` holds what those same fields were when the change was scheduled.
-- A change queued months ahead can be overtaken by an immediate edit to the
-- same field; comparing against this on the day tells the difference between a
-- change that still makes sense and one that would silently undo somebody's
-- more recent decision.
--
-- Statuses:
--   PENDING    -- waiting for its effective date
--   APPLIED    -- written to the employee record
--   CANCELLED  -- withdrawn by a person before it was applied
--   SUPERSEDED -- a field had moved on from `expected`, so it was not applied
--   FAILED     -- the update was attempted and errored; `failure_reason` says why
-- ---------------------------------------------------------------------------

CREATE TABLE `scheduled_employee_change` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` INT NOT NULL,
  `effective_date` DATE NOT NULL,
  `changes` JSON NOT NULL,
  `expected` JSON NOT NULL,
  `status` ENUM('PENDING', 'APPLIED', 'CANCELLED', 'SUPERSEDED', 'FAILED')
    NOT NULL DEFAULT 'PENDING',
  `applied_on` TIMESTAMP(6) NULL,
  `failure_reason` VARCHAR(500) NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  -- The sweep asks one question: which rows are due today? Both columns are in
  -- the index so it is answered without reading the table.
  KEY `idx_sched_change_due` (`status`, `effective_date`),
  -- The profile asks the other: what is pending for this employee?
  KEY `idx_sched_change_employee` (`employee_id`, `status`),
  CONSTRAINT `fk_sched_change_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
