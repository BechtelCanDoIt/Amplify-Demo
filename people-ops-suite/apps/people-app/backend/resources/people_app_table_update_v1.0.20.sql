-- Prevent an employee record from linking continuous_service_record to its own id.
-- A CHECK constraint isn't usable here: MySQL rejects CHECK constraints that
-- reference an AUTO_INCREMENT column (Error 3818, `id` is AUTO_INCREMENT), so
-- this is enforced with INSERT/UPDATE triggers instead. The insert trigger must
-- run AFTER INSERT: NEW.id is 0 in a BEFORE INSERT trigger since the value isn't
-- generated yet.

DROP TRIGGER IF EXISTS `trg_employee_no_self_continuous_service_insert`;
DROP TRIGGER IF EXISTS `trg_employee_no_self_continuous_service_update`;

DELIMITER //
CREATE TRIGGER `trg_employee_no_self_continuous_service_insert`
AFTER INSERT ON `employee`
FOR EACH ROW
BEGIN
  IF NEW.continuous_service_record IS NOT NULL AND NEW.continuous_service_record = NEW.id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'continuous_service_record cannot reference its own employee id';
  END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER `trg_employee_no_self_continuous_service_update`
BEFORE UPDATE ON `employee`
FOR EACH ROW
BEGIN
  IF NEW.continuous_service_record IS NOT NULL AND NEW.continuous_service_record = NEW.id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'continuous_service_record cannot reference its own employee id';
  END IF;
END//
DELIMITER ;
