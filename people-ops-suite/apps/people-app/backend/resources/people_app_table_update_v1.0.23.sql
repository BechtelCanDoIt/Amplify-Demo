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

-- Enforce: a career function must not hold the same ACTIVE designation name twice.
-- Inactive rows are exempt (MySQL ignores NULLs in unique indexes), so a name can be
-- retired and reused, and the same name may exist under two different career functions.
--
-- IMPORTANT — run this FIRST. If it returns any row, the index below will fail.
-- Resolving duplicates moves employees between designations, so it is a manual step.
--
--   SELECT COALESCE(career_function_id, 0) AS cf,
--          LOWER(TRIM(designation))        AS name,
--          COUNT(*)                        AS n
--   FROM designation
--   WHERE is_active = 1
--   GROUP BY cf, name
--   HAVING n > 1;

CREATE UNIQUE INDEX `uk_active_designation_per_career_function` ON `designation` ((
  CASE
    WHEN `is_active` = 1
      THEN CONCAT(COALESCE(`career_function_id`, 0), '|', LOWER(TRIM(`designation`)))
    ELSE NULL
  END
));
