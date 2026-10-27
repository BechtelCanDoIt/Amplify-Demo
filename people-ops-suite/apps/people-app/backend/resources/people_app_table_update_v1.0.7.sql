-- Create house lookup table
CREATE TABLE IF NOT EXISTS `house` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_house_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the 4 houses
INSERT IGNORE INTO `house` (`name`) VALUES
  ('CloudBots'),
  ('Titans'),
  ('Legions'),
  ('Wild Boars');

-- Add house_id FK column to employee (nullable — existing rows get NULL)
ALTER TABLE `employee`
  ADD COLUMN `house_id` INT NULL DEFAULT NULL AFTER `unit_id`,
  ADD CONSTRAINT `fk_emp_house` FOREIGN KEY (`house_id`) REFERENCES `house` (`id`);
