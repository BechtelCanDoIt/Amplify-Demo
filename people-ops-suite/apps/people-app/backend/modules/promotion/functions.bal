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

# Fetch approved promotions for an employee from the HRIS database.
#
# + workEmail - Work email of the employee
# + return - Approved promotions newest first, or an error
public isolated function getApprovedPromotions(string workEmail) returns PromotionRecord[]|error {
    stream<PromotionRecord, error?> resultStream =
        promotionDbClient->query(getApprovedPromotionsQuery(workEmail));

    PromotionRecord[] promotions = check from PromotionRecord promotion in resultStream
        select promotion;

    // Promoted dates are inconsistently stored; some use slashes. The promotion app
    // normalises the same way (promotion-app functions.bal:132).
    return from PromotionRecord promotion in promotions
        let string? promotedDate = promotion.promotedDate
        select {
            currentJobBand: promotion.currentJobBand,
            nextJobBand: promotion.nextJobBand,
            jobRole: promotion.jobRole,
            promotionType: promotion.promotionType,
            cycleName: promotion.cycleName,
            businessUnit: promotion.businessUnit,
            department: promotion.department,
            team: promotion.team,
            subTeam: promotion.subTeam,
            // createdOn comes from a TIMESTAMP column via DATE(), so it is always
            // YYYY-MM-DD and needs no normalisation.
            createdOn: promotion.createdOn,
            // Bound to a local above: narrowing does not apply to record field
            // access, so reading the field directly would still need a cast here.
            promotedDate: promotedDate is string
                ? re `/`.replaceAll(promotedDate, "-")
                : ()
        };
}
