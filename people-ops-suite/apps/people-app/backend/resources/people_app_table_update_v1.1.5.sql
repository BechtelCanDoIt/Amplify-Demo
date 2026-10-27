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

-- Data-repair script (NOT a schema migration) for employees with an
-- unassigned house_id.
--
-- IMPORTANT:
-- Run this script only after the backend fix that prevents house_id
-- from being cleared during employee updates has been deployed.
--
-- The house_id is recomputed using the same deterministic formula used
-- by houseIdForEmployeeId for employee IDs with a valid numeric suffix.
--
-- Only rows with a NULL house_id are updated; existing house assignments
-- are preserved. This also backfills employees whose house_id was already
-- NULL before automatic house assignment was introduced, not only rows
-- affected by the update bug. Re-running this script is safe because the
-- update remains limited to NULL house_id values.

-- Report NULL house_id rows whose employee IDs cannot be mapped by the
-- same numeric-suffix rules used by the application. These rows need
-- separate review and are intentionally not assigned house 1 by default.
SELECT employee_id
FROM employee
WHERE house_id IS NULL
    AND employee_id NOT REGEXP '^[^0-9]*[0-9]+$';

UPDATE employee
SET
    house_id = (
        CAST(REGEXP_REPLACE(employee_id, '^[^0-9]*', '') AS UNSIGNED) % 4
    ) + 1,
    updated_by = 'system-data-repair'
WHERE house_id IS NULL
  AND employee_id REGEXP '^[^0-9]*[0-9]+$';


