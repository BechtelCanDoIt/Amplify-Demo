-- Create employee_history table
-- Stores historical job role changes per employee, migrated from peoplehr_sync.employee_history_sync.
-- Column naming follows people_ops_suite conventions (snake_case).
-- Org hierarchy re-mapping: source Department → team, source Team → sub_team.
CREATE TABLE `employee_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `emp_pk_id` INT NOT NULL,
  `start_date` DATE NULL,
  `job_role` VARCHAR(100) NOT NULL,
  `effective_date` DATE NOT NULL,
  `location` VARCHAR(45) NULL,
  `business_unit` VARCHAR(45) NULL,
  `team` VARCHAR(100) NULL,
  `sub_team` VARCHAR(100) NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_eh_emp_role_date` (`emp_pk_id`, `job_role`, `effective_date`),
  KEY `idx_eh_emp_pk_id` (`emp_pk_id`),
  CONSTRAINT `fk_eh_employee`
    FOREIGN KEY (`emp_pk_id`) REFERENCES `employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
