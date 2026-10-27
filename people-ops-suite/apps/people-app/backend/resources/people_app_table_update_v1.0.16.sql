-- Team Asgardeo Group Mapping Table
CREATE TABLE `team_asgardeo_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `team_id` INT NOT NULL,
  `employment_type_id` INT NOT NULL,
  `group_name` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(254) NOT NULL,
  `created_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` VARCHAR(254) NOT NULL,
  `updated_on` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tag_team_type_group` (`team_id`, `employment_type_id`, `group_name`),
  KEY `idx_tag_team_id` (`team_id`),
  KEY `idx_tag_employment_type_id` (`employment_type_id`),
  CONSTRAINT `fk_tag_team`
    FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tag_employment_type`
    FOREIGN KEY (`employment_type_id`) REFERENCES `employment_type` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
