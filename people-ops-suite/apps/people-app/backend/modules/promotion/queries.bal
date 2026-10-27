// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import ballerina/sql;

# Approved promotions for an employee, from cycles that have formally ended.
#
# Rows with no created date are excluded: that column is nullable in HRIS and is
# what attributes a promotion to an employment period.
#
# + workEmail - Work email of the employee
# + return - Parameterized query returning approved promotions, newest first
isolated function getApprovedPromotionsQuery(string workEmail) returns sql:ParameterizedQuery =>
    `SELECT
        pr.promotion_request_promoted_date AS promotedDate,
        DATE(pr.promotion_request_created_on) AS createdOn,
        pr.promotion_request_current_job_band AS currentJobBand,
        pr.promotion_request_requested_job_band AS nextJobBand,
        pr.promotion_request_current_job_role AS jobRole,
        pr.promotion_request_type AS promotionType,
        pr.promotion_request_business_unit AS businessUnit,
        pr.promotion_request_department AS department,
        pr.promotion_request_team AS team,
        pr.promotion_request_sub_team AS subTeam,
        pc.promotion_cycle_name AS cycleName
    FROM hris_promotion_request pr
        JOIN hris_promotion_cycle pc ON pc.promotion_cycle_id = pr.promotion_cycle_id
    WHERE pr.promotion_request_employee_email = ${workEmail}
        AND pr.promotion_request_status = 'APPROVED'
        AND pc.promotion_cycle_status = 'END'
        -- The created date is nullable in HRIS, and it is the sole key used to
        -- attribute a promotion to an employment period. A row without one
        -- cannot be placed on the timeline at all, so it is excluded here
        -- rather than fetched and then dropped downstream.
        AND pr.promotion_request_created_on IS NOT NULL
    ORDER BY pr.promotion_request_created_on DESC`;
