-- Add job_role column to the employee table.
-- Holds the employee's current job role, editable via the employee onboarding/edit
-- flow and rendered between the designation and the secondary job title in the
-- combined designation string returned by the APIs.
-- Nullable: an employee may have no job role.
ALTER TABLE `employee`
  ADD COLUMN `job_role` VARCHAR(100) NULL AFTER `secondary_job_title`;
