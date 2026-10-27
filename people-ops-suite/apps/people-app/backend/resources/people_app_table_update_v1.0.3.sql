ALTER TABLE personal_info
  MODIFY COLUMN nic_or_passport VARCHAR(20) NOT NULL,
  MODIFY COLUMN first_name      VARCHAR(100) NOT NULL,
  MODIFY COLUMN last_name       VARCHAR(100) NOT NULL,
  MODIFY COLUMN title           VARCHAR(100) NOT NULL,
  MODIFY COLUMN dob             DATE NOT NULL,
  MODIFY COLUMN nationality     VARCHAR(100) NOT NULL;

ALTER TABLE employee
  MODIFY COLUMN start_date           DATE NOT NULL,
  MODIFY COLUMN employment_type_id   INT NOT NULL,
  MODIFY COLUMN sub_team_id          INT NOT NULL,
  MODIFY COLUMN office_id INT NULL;

ALTER TABLE employee DROP COLUMN additional_manager_emails;

CREATE TABLE `employee_additional_managers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employee_pk_id` INT NOT NULL,
  `additional_manager_email` VARCHAR(254) NOT NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_eam_employee_email` (`employee_pk_id`, `additional_manager_email`),
  KEY `idx_eam_manager_email` (`additional_manager_email`),
  CONSTRAINT `fk_eam_employee`
    FOREIGN KEY (`employee_pk_id`) REFERENCES `employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE personal_info DROP COLUMN emergency_contacts;

CREATE TABLE `personal_info_emergency_contacts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `personal_info_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `telephone` VARCHAR(20) NOT NULL,
  `relationship` VARCHAR(100) NOT NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_ec_personal_info_id` (`personal_info_id`),
  KEY `idx_ec_mobile` (`mobile`),
  CONSTRAINT `fk_ec_personal_info`
    FOREIGN KEY (`personal_info_id`) REFERENCES `personal_info` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `companies_allowed_locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL,
  `allowed_location` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cal_company_location` (`company_id`, `allowed_location`),
  KEY `idx_cal_company_id` (`company_id`),
  KEY `idx_cal_location` (`allowed_location`),
  CONSTRAINT `fk_cal_company`
    FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `employee` DROP COLUMN `employment_location`;

ALTER TABLE `employee` 
ADD COLUMN `company_id` INT NOT NULL DEFAULT 1 AFTER `designation_id`;

ALTER TABLE `office`
ADD KEY `idx_office_company_id_id` (`company_id`, `id`);

ALTER TABLE `employee`
ADD CONSTRAINT `fk_emp_company`
  FOREIGN KEY (`company_id`) REFERENCES `company` (`id`);

ALTER TABLE `employee`
DROP FOREIGN KEY IF EXISTS `fk_emp_office`;

ALTER TABLE `employee`
ADD CONSTRAINT `fk_emp_office_company`
  FOREIGN KEY (`company_id`, `office_id`) REFERENCES `office` (`company_id`, `id`);
