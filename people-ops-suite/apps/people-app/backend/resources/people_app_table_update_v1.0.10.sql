-- Add is_active to personal_info_emergency_contacts
ALTER TABLE `personal_info_emergency_contacts`
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `relationship`,
  ADD UNIQUE KEY `uk_ec_personal_mobile` (`personal_info_id`, `mobile`);

-- Add is_active to employee_additional_managers
ALTER TABLE `employee_additional_managers`
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `additional_manager_email`;

-- Personal Info Audit table
CREATE TABLE `personal_info_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `personal_info_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pi_audit_pi_pk` (`personal_info_pk_id`),
  KEY `idx_pi_audit_action_on` (`action_on`),
  CONSTRAINT `fk_pi_audit_personal_info` FOREIGN KEY (`personal_info_pk_id`) REFERENCES `personal_info` (`id`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Emergency Contacts Audit table
CREATE TABLE `personal_info_emergency_contacts_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `personal_info_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ec_audit_personal_info_id` (`personal_info_id`),
  KEY `idx_ec_audit_action_on` (`action_on`),
  CONSTRAINT `fk_personal_info_emergency_contacts_audit_personal_info_id`
    FOREIGN KEY (`personal_info_id`) REFERENCES `personal_info` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Employee Audit table
CREATE TABLE `employee_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_emp_audit_employee_pk` (`employee_pk_id`),
  KEY `idx_emp_audit_action_on` (`action_on`),
  CONSTRAINT `fk_emp_audit_employee` FOREIGN KEY (`employee_pk_id`) REFERENCES `employee` (`id`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Additional Managers Audit table
CREATE TABLE `employee_additional_managers_audit` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_pk_id` int DEFAULT NULL,
  `action_type` enum('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `action_by` varchar(254) NOT NULL,
  `db_user` varchar(254) NULL,
  `action_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `data` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eam_audit_employee_pk_id` (`employee_pk_id`),
  KEY `idx_eam_audit_action_on` (`action_on`),
  CONSTRAINT `fk_employee_additional_managers_audit_employee_pk_id`
    FOREIGN KEY (`employee_pk_id`) REFERENCES `employee` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Procedure: prc_personal_info_audit
DELIMITER //
CREATE PROCEDURE `prc_personal_info_audit`(
  IN p_id                BIGINT,
  IN p_action_type       VARCHAR(10),
  IN p_action_by         VARCHAR(254),
  IN p_nic_or_passport   VARCHAR(50),
  IN p_first_name        VARCHAR(100),
  IN p_last_name         VARCHAR(100),
  IN p_full_name         VARCHAR(200),
  IN p_title             VARCHAR(20),
  IN p_dob               DATE,
  IN p_gender            VARCHAR(10),
  IN p_personal_email    VARCHAR(254),
  IN p_personal_phone    VARCHAR(20),
  IN p_resident_number   VARCHAR(20),
  IN p_address_line_1    VARCHAR(255),
  IN p_address_line_2    VARCHAR(255),
  IN p_city              VARCHAR(100),
  IN p_state_or_province VARCHAR(100),
  IN p_postal_code       VARCHAR(20),
  IN p_country           VARCHAR(100),
  IN p_nationality       VARCHAR(100),
  IN p_created_by        VARCHAR(254),
  IN p_created_on        DATETIME(6),
  IN p_updated_by        VARCHAR(254),
  IN p_updated_on        DATETIME(6)
)
BEGIN
  INSERT INTO personal_info_audit (personal_info_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',                p_id,
      'nic_or_passport',   p_nic_or_passport,
      'first_name',        p_first_name,
      'last_name',         p_last_name,
      'full_name',         p_full_name,
      'title',             p_title,
      'dob',               p_dob,
      'gender',            p_gender,
      'personal_email',    p_personal_email,
      'personal_phone',    p_personal_phone,
      'resident_number',   p_resident_number,
      'address_line_1',    p_address_line_1,
      'address_line_2',    p_address_line_2,
      'city',              p_city,
      'state_or_province', p_state_or_province,
      'postal_code',       p_postal_code,
      'country',           p_country,
      'nationality',       p_nationality,
      'created_by',        p_created_by,
      'created_on',        p_created_on,
      'updated_by',        p_updated_by,
      'updated_on',        p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_personal_info_audit_insert
DELIMITER //
CREATE TRIGGER `trg_personal_info_audit_insert`
AFTER INSERT ON `personal_info`
FOR EACH ROW
BEGIN
  CALL prc_personal_info_audit(
    NEW.id, 'INSERT', COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.nic_or_passport,  NEW.first_name,        NEW.last_name,
    NEW.full_name,        NEW.title,             NEW.dob,
    NEW.gender,           NEW.personal_email,    NEW.personal_phone,
    NEW.resident_number,  NEW.address_line_1,    NEW.address_line_2,
    NEW.city,             NEW.state_or_province, NEW.postal_code,
    NEW.country,          NEW.nationality,
    NEW.created_by,       NEW.created_on,
    NEW.updated_by,       NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_personal_info_audit_update
DELIMITER //
CREATE TRIGGER `trg_personal_info_audit_update`
AFTER UPDATE ON `personal_info`
FOR EACH ROW
BEGIN
  CALL prc_personal_info_audit(
    NEW.id, 'UPDATE', COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.nic_or_passport,  NEW.first_name,        NEW.last_name,
    NEW.full_name,        NEW.title,             NEW.dob,
    NEW.gender,           NEW.personal_email,    NEW.personal_phone,
    NEW.resident_number,  NEW.address_line_1,    NEW.address_line_2,
    NEW.city,             NEW.state_or_province, NEW.postal_code,
    NEW.country,          NEW.nationality,
    NEW.created_by,       NEW.created_on,
    NEW.updated_by,       NEW.updated_on
  );
END//
DELIMITER ;

-- Procedure: prc_personal_info_emergency_contacts_audit
DELIMITER //
CREATE PROCEDURE `prc_personal_info_emergency_contacts_audit`(
  IN p_personal_info_id  BIGINT,
  IN p_action_type       VARCHAR(10),
  IN p_action_by         VARCHAR(254),
  IN p_id                BIGINT,
  IN p_name              VARCHAR(200),
  IN p_mobile            VARCHAR(20),
  IN p_telephone         VARCHAR(20),
  IN p_relationship      VARCHAR(100),
  IN p_is_active         TINYINT(1),
  IN p_created_by        VARCHAR(254),
  IN p_created_on        DATETIME(6),
  IN p_updated_by        VARCHAR(254),
  IN p_updated_on        DATETIME(6)
)
BEGIN
  INSERT INTO personal_info_emergency_contacts_audit
    (personal_info_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_personal_info_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',               p_id,
      'personal_info_id', p_personal_info_id,
      'name',             p_name,
      'mobile',           p_mobile,
      'telephone',        p_telephone,
      'relationship',     p_relationship,
      'is_active',        p_is_active,
      'created_by',       p_created_by,
      'created_on',       p_created_on,
      'updated_by',       p_updated_by,
      'updated_on',       p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_personal_info_emergency_contacts_audit_insert
DELIMITER //
CREATE TRIGGER `trg_personal_info_emergency_contacts_audit_insert`
AFTER INSERT ON `personal_info_emergency_contacts`
FOR EACH ROW
BEGIN
  CALL prc_personal_info_emergency_contacts_audit(
    NEW.personal_info_id,
    'INSERT',
    COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.id,               NEW.name,         NEW.mobile,
    NEW.telephone,        NEW.relationship, NEW.is_active,
    NEW.created_by,       NEW.created_on,
    NEW.updated_by,       NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_personal_info_emergency_contacts_audit_update (logs DELETE if is_active flipped to 0)
DELIMITER //
CREATE TRIGGER `trg_personal_info_emergency_contacts_audit_update`
AFTER UPDATE ON `personal_info_emergency_contacts`
FOR EACH ROW
BEGIN
  CALL prc_personal_info_emergency_contacts_audit(
    NEW.personal_info_id,
    CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'DELETE' ELSE 'UPDATE' END,
    COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.id,               NEW.name,         NEW.mobile,
    NEW.telephone,        NEW.relationship, NEW.is_active,
    NEW.created_by,       NEW.created_on,
    NEW.updated_by,       NEW.updated_on
  );
END//
DELIMITER ;

-- Procedure: prc_employee_audit
DELIMITER //
CREATE PROCEDURE `prc_employee_audit`(
  IN p_id                       BIGINT,
  IN p_action_type              VARCHAR(10),
  IN p_action_by                VARCHAR(254),
  IN p_employee_id              VARCHAR(50),
  IN p_first_name               VARCHAR(100),
  IN p_last_name                VARCHAR(100),
  IN p_epf                      VARCHAR(50),
  IN p_work_location            VARCHAR(100),
  IN p_work_email               VARCHAR(254),
  IN p_start_date               DATE,
  IN p_secondary_job_title      VARCHAR(100),
  IN p_manager_email            VARCHAR(254),
  IN p_employee_status          VARCHAR(50),
  IN p_continuous_service_record VARCHAR(99),
  IN p_employee_thumbnail       VARCHAR(2048),
  IN p_probation_end_date       DATE,
  IN p_agreement_end_date       DATE,
  IN p_employment_type_id       BIGINT,
  IN p_designation_id           BIGINT,
  IN p_company_id               BIGINT,
  IN p_office_id                BIGINT,
  IN p_team_id                  BIGINT,
  IN p_sub_team_id              BIGINT,
  IN p_business_unit_id         BIGINT,
  IN p_unit_id                  BIGINT,
  IN p_house_id                 BIGINT,
  IN p_personal_info_id         BIGINT,
  IN p_created_by               VARCHAR(254),
  IN p_created_on               DATETIME(6),
  IN p_updated_by               VARCHAR(254),
  IN p_updated_on               DATETIME(6)
)
BEGIN
  INSERT INTO employee_audit (employee_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',                       p_id,
      'employee_id',              p_employee_id,
      'first_name',               p_first_name,
      'last_name',                p_last_name,
      'epf',                      p_epf,
      'work_location',            p_work_location,
      'work_email',               p_work_email,
      'start_date',               p_start_date,
      'secondary_job_title',      p_secondary_job_title,
      'manager_email',            p_manager_email,
      'employee_status',          p_employee_status,
      'continuous_service_record',p_continuous_service_record,
      'employee_thumbnail',       p_employee_thumbnail,
      'probation_end_date',       p_probation_end_date,
      'agreement_end_date',       p_agreement_end_date,
      'employment_type_id',       p_employment_type_id,
      'designation_id',           p_designation_id,
      'company_id',               p_company_id,
      'office_id',                p_office_id,
      'team_id',                  p_team_id,
      'sub_team_id',              p_sub_team_id,
      'business_unit_id',         p_business_unit_id,
      'unit_id',                  p_unit_id,
      'house_id',                 p_house_id,
      'personal_info_id',         p_personal_info_id,
      'created_by',               p_created_by,
      'created_on',               p_created_on,
      'updated_by',               p_updated_by,
      'updated_on',               p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_employee_audit_insert
DELIMITER //
CREATE TRIGGER `trg_employee_audit_insert`
AFTER INSERT ON `employee`
FOR EACH ROW
BEGIN
  CALL prc_employee_audit(
    NEW.id, 'INSERT', COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.employee_id,              NEW.first_name,        NEW.last_name,
    NEW.epf,                      NEW.work_location,     NEW.work_email,
    NEW.start_date,               NEW.secondary_job_title, NEW.manager_email,
    NEW.employee_status,          NEW.continuous_service_record,
    NEW.employee_thumbnail,       NEW.probation_end_date, NEW.agreement_end_date,
    NEW.employment_type_id,       NEW.designation_id,    NEW.company_id,
    NEW.office_id,                NEW.team_id,           NEW.sub_team_id,
    NEW.business_unit_id,         NEW.unit_id,           NEW.house_id,
    NEW.personal_info_id,
    NEW.created_by,               NEW.created_on,
    NEW.updated_by,               NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_employee_audit_update
DELIMITER //
CREATE TRIGGER `trg_employee_audit_update`
AFTER UPDATE ON `employee`
FOR EACH ROW
BEGIN
  CALL prc_employee_audit(
    NEW.id, 'UPDATE', COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.employee_id,              NEW.first_name,        NEW.last_name,
    NEW.epf,                      NEW.work_location,     NEW.work_email,
    NEW.start_date,               NEW.secondary_job_title, NEW.manager_email,
    NEW.employee_status,          NEW.continuous_service_record,
    NEW.employee_thumbnail,       NEW.probation_end_date, NEW.agreement_end_date,
    NEW.employment_type_id,       NEW.designation_id,    NEW.company_id,
    NEW.office_id,                NEW.team_id,           NEW.sub_team_id,
    NEW.business_unit_id,         NEW.unit_id,           NEW.house_id,
    NEW.personal_info_id,
    NEW.created_by,               NEW.created_on,
    NEW.updated_by,               NEW.updated_on
  );
END//
DELIMITER ;

-- Procedure: prc_employee_additional_managers_audit
DELIMITER //
CREATE PROCEDURE `prc_employee_additional_managers_audit`(
  IN p_employee_pk_id           BIGINT,
  IN p_action_type              VARCHAR(10),
  IN p_action_by                VARCHAR(254),
  IN p_id                       BIGINT,
  IN p_additional_manager_email VARCHAR(254),
  IN p_is_active                TINYINT(1),
  IN p_created_by               VARCHAR(254),
  IN p_created_on               DATETIME(6),
  IN p_updated_by               VARCHAR(254),
  IN p_updated_on               DATETIME(6)
)
BEGIN
  INSERT INTO employee_additional_managers_audit
    (employee_pk_id, action_type, action_by, db_user, action_on, data)
  VALUES (
    p_employee_pk_id,
    p_action_type,
    p_action_by,
    USER(),
    CURRENT_TIMESTAMP(6),
    JSON_OBJECT(
      'id',                       p_id,
      'employee_pk_id',           p_employee_pk_id,
      'additional_manager_email', p_additional_manager_email,
      'is_active',                p_is_active,
      'created_by',               p_created_by,
      'created_on',               p_created_on,
      'updated_by',               p_updated_by,
      'updated_on',               p_updated_on
    )
  );
END//
DELIMITER ;

-- Trigger: trg_employee_additional_managers_audit_insert
DELIMITER //
CREATE TRIGGER `trg_employee_additional_managers_audit_insert`
AFTER INSERT ON `employee_additional_managers`
FOR EACH ROW
BEGIN
  CALL prc_employee_additional_managers_audit(
    NEW.employee_pk_id,
    'INSERT',
    COALESCE(NULLIF(TRIM(NEW.created_by), ''), 'SYSTEM'),
    NEW.id,         NEW.additional_manager_email, NEW.is_active,
    NEW.created_by, NEW.created_on,
    NEW.updated_by, NEW.updated_on
  );
END//
DELIMITER ;

-- Trigger: trg_employee_additional_managers_audit_update (logs DELETE if is_active flipped to 0)
DELIMITER //
CREATE TRIGGER `trg_employee_additional_managers_audit_update`
AFTER UPDATE ON `employee_additional_managers`
FOR EACH ROW
BEGIN
  CALL prc_employee_additional_managers_audit(
    NEW.employee_pk_id,
    CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'DELETE' ELSE 'UPDATE' END,
    COALESCE(NULLIF(TRIM(NEW.updated_by), ''), 'SYSTEM'),
    NEW.id,         NEW.additional_manager_email, NEW.is_active,
    NEW.created_by, NEW.created_on,
    NEW.updated_by, NEW.updated_on
  );
END//
DELIMITER ;
