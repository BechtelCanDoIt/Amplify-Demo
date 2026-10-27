-- Make sub_team_id optional on employee (mirrors the existing optional unit_id).
-- The fk_emp_subteam foreign key is retained; NULL values are simply not checked.
ALTER TABLE `employee`
  MODIFY COLUMN `sub_team_id` INT NULL;
