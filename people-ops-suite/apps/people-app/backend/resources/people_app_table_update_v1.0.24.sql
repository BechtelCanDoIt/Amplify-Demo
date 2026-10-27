-- Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
--
-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- Enforce: a career function name is unique across the whole table, compared
-- case-insensitively and with surrounding whitespace trimmed.
--
-- NOTE — this is deliberately STRICTER than the designation rule added in
-- v1.0.23. That index covers ACTIVE designations only, so a retired designation
-- name can be reused. Here every row counts, active or not: once a career
-- function name exists it can never be taken by another row, and a retired
-- career function is reactivated rather than recreated.
--
-- IMPORTANT — run this FIRST. If it returns any row, the index below will fail.
-- Resolving duplicates means deciding which row survives and repointing the
-- other's designations, so it is a manual step.
--
--   SELECT LOWER(TRIM(career_function)) AS name, COUNT(*) AS n
--   FROM career_function
--   GROUP BY name
--   HAVING n > 1;

CREATE UNIQUE INDEX `uk_career_function_name` ON `career_function` (
  (LOWER(TRIM(`career_function`)))
);
