ALTER TABLE personal_info MODIFY COLUMN personal_phone VARCHAR(100);
ALTER TABLE personal_info MODIFY COLUMN resident_number VARCHAR(100);
ALTER TABLE employee MODIFY COLUMN employee_thumbnail VARCHAR(2048) NULL;
ALTER TABLE personal_info
ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT (CONCAT(first_name, ' ', last_name)) AFTER last_name;
ALTER TABLE employee
MODIFY COLUMN secondary_job_title VARCHAR(100) NULL DEFAULT NULL;
DROP TRIGGER IF EXISTS `trg_employee_set_employee_id`;
