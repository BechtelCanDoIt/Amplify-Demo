-- Employment Type IDP Group Mapping Table
CREATE TABLE `employment_type_idp_group` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employment_type_id` INT NOT NULL,
  `group_name` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_etag_employment_type_group` (`employment_type_id`, `group_name`),
  KEY `idx_etag_employment_type_id` (`employment_type_id`),
  CONSTRAINT `fk_etag_employment_type`
    FOREIGN KEY (`employment_type_id`) REFERENCES `employment_type` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
