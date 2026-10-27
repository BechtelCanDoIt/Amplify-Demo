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
import ballerina/test;

# The query's SQL text with each bound value shown as `?`, as MySQL receives it.
#
# + query - Parameterized query to render
# + return - SQL text with placeholders
isolated function sqlText(sql:ParameterizedQuery query) returns string =>
    string:'join("?", ...query.strings);

# The value bound to the placeholder that follows `column = `, or an error when the column
# is not bound to a placeholder.
#
# + query - Parameterized query to search
# + column - Column name whose bound value is wanted
# + return - The bound value, or an error when the column has no placeholder
isolated function boundValue(sql:ParameterizedQuery query, string column) returns anydata|error {
    foreach int i in 0 ..< query.insertions.length() {
        if query.strings[i].endsWith(string `${column} = `) {
            return <anydata>query.insertions[i];
        }
    }
    return error(string `${column} is not bound to a placeholder`);
}

@test:Config {}
isolated function testContinuousServiceRecordIsBoundAsEmployeePrimaryKey() returns error? {
    // Regression: the employee ID string ("DE100007") used to be bound here, which the INT
    // foreign key column rejected with "Incorrect integer value".
    sql:ParameterizedQuery query = updateEmployeeJobInfoQuery("LK100001", {continuousServiceRecord: 4821},
            "admin@example.invalid");

    anydata bound = check boundValue(query, "continuous_service_record");
    test:assertTrue(bound is int, "continuous_service_record should be bound as an int, not a string");
    test:assertEquals(bound, 4821, "the prior employment's employee.id should be bound unchanged");
}

@test:Config {}
isolated function testClearSentinelSetsContinuousServiceRecordToNull() {
    sql:ParameterizedQuery query = updateEmployeeJobInfoQuery("LK100001",
            {continuousServiceRecord: CONTINUOUS_SERVICE_RECORD_CLEAR_SENTINEL}, "admin@example.invalid");

    test:assertTrue(sqlText(query).includes("continuous_service_record = NULL"),
            "the clear sentinel should null the column");
    test:assertTrue(boundValue(query, "continuous_service_record") is error,
            "the sentinel itself must never reach the foreign key column");
}

@test:Config {}
isolated function testOmittedContinuousServiceRecordIsLeftUntouched() {
    sql:ParameterizedQuery query = updateEmployeeJobInfoQuery("LK100001", {jobRole: "Engineer"},
            "admin@example.invalid");

    test:assertFalse(sqlText(query).includes("continuous_service_record"),
            "an edit that does not set the link should not write the column");
}

# A prior record as the continuous-service-records lookup returns it.
#
# + employeeId - Employee ID of the candidate record
# + startDate - Its start date
# + employeeStatus - Its status
# + return - The candidate record
isolated function priorRecord(string employeeId, string startDate, string employeeStatus)
        returns ContinuousServiceRecordInfo => {
    id: 14501,
    employeeId,
    firstName: "Test",
    lastName: "Person",
    company: "Example Company",
    workLocation: "Testland",
    startDate,
    employeeStatus,
    managerEmail: "lead@example.invalid",
    additionalManagerEmails: (),
    designation: "Example Designation",
    secondaryJobTitle: (),
    office: (),
    businessUnit: "Example Business Unit",
    team: "Example Team",
    subTeam: (),
    unit: ()
};

@test:Config {}
isolated function testEarlierLeftEmploymentIsEligible() {
    test:assertTrue(isEligiblePriorEmployment(priorRecord("LK100254", "2012-09-01", EMPLOYEE_LEFT),
            "2020-01-01", "LK101111"), "an earlier employment that has ended should be linkable");
}

@test:Config {}
isolated function testLaterEmploymentIsNotEligible() {
    // Editing the older record must not link it forwards to the newer one; this is also
    // what rules out cycles.
    test:assertFalse(isEligiblePriorEmployment(priorRecord("LK101111", "2020-01-01", EMPLOYEE_LEFT),
            "2012-09-01", "LK100254"), "a later employment should not be linkable");
    test:assertFalse(isEligiblePriorEmployment(priorRecord("LK101111", "2020-01-01", EMPLOYEE_LEFT),
            "2020-01-01", "LK100254"), "an employment starting the same day should not be linkable");
}

@test:Config {}
isolated function testEmploymentThatHasNotEndedIsNotEligible() {
    test:assertFalse(isEligiblePriorEmployment(priorRecord("LK100254", "2012-09-01", EMPLOYEE_ACTIVE),
            "2020-01-01", "LK101111"), "an Active employment should not be linkable");
    test:assertFalse(isEligiblePriorEmployment(priorRecord("LK100254", "2012-09-01", EMPLOYEE_NEW_JOINER),
            "2020-01-01", "LK101111"), "a New joiner employment should not be linkable");
}

@test:Config {}
isolated function testMarkedLeaverEmploymentIsEligibleForRelocation() {
    // A relocation is onboarded while the old employment is still Marked leaver.
    test:assertTrue(isEligiblePriorEmployment(priorRecord("LK100254", "2012-09-01", EMPLOYEE_MARKED_LEAVER),
            "2020-01-01", ()), "a Marked-leaver employment should be linkable");
}

@test:Config {}
isolated function testEmploymentCannotContinueFromItself() {
    test:assertFalse(isEligiblePriorEmployment(priorRecord("LK101111", "2012-09-01", EMPLOYEE_LEFT),
            "2020-01-01", "LK101111"), "a record should not be linkable to itself");
}

@test:Config {}
isolated function testNewEmployeeCanLinkAnEarlierLeftEmployment() {
    test:assertTrue(isEligiblePriorEmployment(priorRecord("LK100254", "2012-09-01", EMPLOYEE_LEFT),
            "2026-10-01", ()), "on create there is no target employee ID to exclude");
}
