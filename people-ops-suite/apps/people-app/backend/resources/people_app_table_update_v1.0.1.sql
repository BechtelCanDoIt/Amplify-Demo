ALTER TABLE personal_info
ADD COLUMN emergency_contacts JSON NOT NULL DEFAULT (JSON_ARRAY());
