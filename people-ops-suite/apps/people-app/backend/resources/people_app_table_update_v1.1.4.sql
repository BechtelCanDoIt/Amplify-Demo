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

-- Audit trail for the career function / designation master data.
--
-- Follows the same shape as the existing employee_audit and personal_info_audit
-- infrastructure: one audit table per parent, a stored procedure that writes the row
-- snapshot as JSON, and AFTER INSERT / AFTER UPDATE triggers that call it.
--
-- Until now these two tables carried only created_by/created_on/updated_by/updated_on,
-- which record who touched a row last but keep no history — a designation moved between
-- career functions, renamed, or deactivated left no trace of its previous state.
-- designation_audit captures career_function_id in the snapshot specifically so
-- reassignments (including a designation being unassigned) are recoverable.
--
-- NOTE — no hard-DELETE trigger, matching every existing audit table. Master data is
-- deactivated (is_active = 0) rather than deleted, so a hard DELETE is not a path the
-- application takes. Instead, both UPDATE triggers follow the soft-delete convention
-- already used by trg_employee_additional_managers_audit_update and
-- trg_personal_info_emergency_contacts_audit_update: a transition of is_active from 1
-- to 0 is recorded as action_type = 'DELETE' rather than 'UPDATE', so a deactivation is
-- queryable as the delete it effectively is. Any other change stays 'UPDATE'.
--
-- NOTE — history starts here. Rows that already exist get no INSERT record, so these
-- tables stay empty until something changes.

-- Re-runnable: drop triggers, then procedures, then tables (reverse dependency order).
DROP TRIGGER IF EXISTS `trg_designation_audit_update`;
DROP TRIGGER IF EXISTS `trg_designation_audit_insert`;
DROP TRIGGER IF EXISTS `trg_career_function_audit_update`;
DROP TRIGGER IF EXISTS `trg_career_function_audit_insert`;
DROP PROCEDURE IF EXISTS `prc_designation_audit`;
DROP PROCEDURE IF EXISTS `prc_career_function_audit`;
DROP TABLE IF EXISTS `designation_audit`;
DROP TABLE IF EXISTS `career_function_audit`;

-- Career Function Audit table
CREATE TABLE `career_function_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `career_function_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cf_audit_career_function_pk` (`career_function_pk_id`),
  KEY `idx_cf_audit_action_on` (`action_on`),
  CONSTRAINT `fk_cf_audit_career_function` FOREIGN KEY (`career_function_pk_id`) REFERENCES `career_function` (`id`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Designation Audit table
CREATE TABLE `designation_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `designation_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_desig_audit_designation_pk` (`designation_pk_id`),
  KEY `idx_desig_audit_action_on` (`action_on`),
  CONSTRAINT `fk_desig_audit_designation` FOREIGN KEY (`designation_pk_id`) REFERENCES `designation` (`id`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Procedure: prc_career_function_audit
DELIMITER //
CREATE PROCEDURE `prc_career_function_audit`(
  IN p_id              INT,
  IN p_action_type     VARCHAR(10),
  IN p_action_by       VARCHAR(254),
  IN p_career_function VARCHAR(150),
  IN p_is_active       TINYINT(1),
  IN p_created_by      VARCHAR(254),
  IN p_created_on      DATETIME(6),
  IN p_updated_by      VARCHAR(254),
  IN p_updated_on      DATETIME(6)
)
BEGIN
  INSERT INTO career_function_audit (career_function_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',              p_id,
      'career_function', p_career_function,
      'is_active',       p_is_active,
      'created_by',      p_created_by,
      'created_on',      p_created_on,
      'updated_by',      p_updated_by,
      'updated_on',      p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_career_function_audit_insert
DELIMITER //
CREATE TRIGGER `trg_career_function_audit_insert`
AFTER INSERT ON `career_function`
FOR EACH ROW
BEGIN
  CALL prc_career_function_audit(
    NEW.id, 'INSERT', COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.career_function, NEW.is_active,
    NEW.created_by,      NEW.created_on,
    NEW.updated_by,      NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_career_function_audit_update
DELIMITER //
CREATE TRIGGER `trg_career_function_audit_update`
AFTER UPDATE ON `career_function`
FOR EACH ROW
BEGIN
  CALL prc_career_function_audit(
    NEW.id,
    CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'DELETE' ELSE 'UPDATE' END,
    COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.career_function, NEW.is_active,
    NEW.created_by,      NEW.created_on,
    NEW.updated_by,      NEW.updated_on
  );
END//
DELIMITER ;

-- Procedure: prc_designation_audit
DELIMITER //
CREATE PROCEDURE `prc_designation_audit`(
  IN p_id                 INT,
  IN p_action_type        VARCHAR(10),
  IN p_action_by          VARCHAR(254),
  IN p_designation        VARCHAR(150),
  IN p_job_band           INT,
  IN p_career_function_id INT,
  IN p_is_active          TINYINT(1),
  IN p_created_by         VARCHAR(254),
  IN p_created_on         DATETIME(6),
  IN p_updated_by         VARCHAR(254),
  IN p_updated_on         DATETIME(6)
)
BEGIN
  INSERT INTO designation_audit (designation_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',                 p_id,
      'designation',        p_designation,
      'job_band',           p_job_band,
      'career_function_id', p_career_function_id,
      'is_active',          p_is_active,
      'created_by',         p_created_by,
      'created_on',         p_created_on,
      'updated_by',         p_updated_by,
      'updated_on',         p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_designation_audit_insert
DELIMITER //
CREATE TRIGGER `trg_designation_audit_insert`
AFTER INSERT ON `designation`
FOR EACH ROW
BEGIN
  CALL prc_designation_audit(
    NEW.id, 'INSERT', COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.designation,  NEW.job_band, NEW.career_function_id, NEW.is_active,
    NEW.created_by,   NEW.created_on,
    NEW.updated_by,   NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_designation_audit_update
DELIMITER //
CREATE TRIGGER `trg_designation_audit_update`
AFTER UPDATE ON `designation`
FOR EACH ROW
BEGIN
  CALL prc_designation_audit(
    NEW.id,
    CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'DELETE' ELSE 'UPDATE' END,
    COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.designation,  NEW.job_band, NEW.career_function_id, NEW.is_active,
    NEW.created_by,   NEW.created_on,
    NEW.updated_by,   NEW.updated_on
  );
END//
DELIMITER ;
