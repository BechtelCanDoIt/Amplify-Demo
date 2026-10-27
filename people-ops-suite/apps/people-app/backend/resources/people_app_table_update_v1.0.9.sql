-- Add probation_period column to companies_allowed_locations table
ALTER TABLE `companies_allowed_locations`
ADD COLUMN `probation_period` TINYINT UNSIGNED NULL AFTER `is_active`;
