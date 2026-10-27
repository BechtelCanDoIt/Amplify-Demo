-- Add uniqueness constraints to the company org chart mapping tables.
-- Prevents duplicate (parent, child) rows and enables INSERT ... ON DUPLICATE KEY UPDATE
-- to cleanly re-activate previously soft-deleted mappings during admin CRUD.
--
-- Pre-flight: if production already contains duplicate active rows for the same
-- (business_unit_id, team_id) etc. pair, these ALTER TABLE statements will fail.
-- Inspect with the SELECT statements below before running and deduplicate manually
-- if needed.
--
--   SELECT business_unit_id, team_id, COUNT(*)
--     FROM business_unit_team
--    GROUP BY business_unit_id, team_id HAVING COUNT(*) > 1;
--   SELECT business_unit_team_id, sub_team_id, COUNT(*)
--     FROM business_unit_team_sub_team
--    GROUP BY business_unit_team_id, sub_team_id HAVING COUNT(*) > 1;
--   SELECT business_unit_team_sub_team_id, unit_id, COUNT(*)
--     FROM business_unit_team_sub_team_unit
--    GROUP BY business_unit_team_sub_team_id, unit_id HAVING COUNT(*) > 1;

ALTER TABLE `business_unit_team`
  ADD UNIQUE KEY `uk_but_bu_team` (`business_unit_id`, `team_id`);

ALTER TABLE `business_unit_team_sub_team`
  ADD UNIQUE KEY `uk_butst_but_st` (`business_unit_team_id`, `sub_team_id`);

ALTER TABLE `business_unit_team_sub_team_unit`
  ADD UNIQUE KEY `uk_butstu_butst_u` (`business_unit_team_sub_team_id`, `unit_id`);
