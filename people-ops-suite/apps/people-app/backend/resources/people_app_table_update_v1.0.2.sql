ALTER TABLE personal_info
  MODIFY COLUMN emergency_contacts JSON NULL
  AFTER nationality;

ALTER TABLE personal_info
ADD COLUMN gender varchar(20) NOT NULL DEFAULT 'Not Specified' AFTER dob;

ALTER TABLE personal_info
  DROP COLUMN full_name,
  DROP COLUMN name_with_initials;

ALTER TABLE employee
  DROP COLUMN work_phone_number;

