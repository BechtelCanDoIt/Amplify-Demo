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

import ballerina/constraint;
import ballerina/sql;
import ballerina/test;

# Whether a string value is bound to any placeholder in the query.
#
# + query - Parameterized query to search
# + value - Value to look for
# + return - true when the value is bound
isolated function isBound(sql:ParameterizedQuery query, string value) returns boolean {
    foreach sql:Value insertion in query.insertions {
        if insertion is string && insertion == value {
            return true;
        }
    }
    return false;
}

@test:Config {}
isolated function testRetireIsGuardedByCurrentHolders() returns error? {
    sql:ParameterizedQuery query = check updateLeadershipGroupQuery(2, (), false, "admin@example.invalid");
    string text = sqlText(query);

    test:assertTrue(text.includes("NOT EXISTS"), "retiring should only apply while nobody current holds it");
    test:assertTrue(isBound(query, EMPLOYEE_ACTIVE),
            "Active holders should block retiring");
    test:assertTrue(isBound(query, EMPLOYEE_MARKED_LEAVER),
            "Marked-leaver holders should block retiring");
    test:assertTrue(!isBound(query, EMPLOYEE_LEFT),
            "Left employees should not block retiring");
}

@test:Config {}
isolated function testRenameAndReactivateAreNotGuarded() returns error? {
    sql:ParameterizedQuery rename = check updateLeadershipGroupQuery(2, "Executive Leadership", (),
            "admin@example.invalid");
    sql:ParameterizedQuery reactivate = check updateLeadershipGroupQuery(2, (), true, "admin@example.invalid");

    test:assertFalse(sqlText(rename).includes("NOT EXISTS"), "a rename should not depend on holders");
    test:assertFalse(sqlText(reactivate).includes("NOT EXISTS"), "reactivating should not depend on holders");
    test:assertEquals(check boundValue(rename, "name"), "Executive Leadership");
}

@test:Config {}
isolated function testLeadershipUpdateWithNoFieldsIsRefused() {
    sql:ParameterizedQuery|error query = updateLeadershipGroupQuery(2, (), (), "admin@example.invalid");
    test:assertTrue(query is NoFieldsToUpdateError, "an empty update should be refused");
}

@test:Config {}
isolated function testHolderCountsOnlyCurrentEmployees() {
    sql:ParameterizedQuery query = getLeadershipGroupsWithUsageQuery();

    test:assertTrue(isBound(query, EMPLOYEE_ACTIVE)
            && isBound(query, EMPLOYEE_MARKED_LEAVER),
            "holder counts should include Active and Marked-leaver employees");
    test:assertTrue(!isBound(query, EMPLOYEE_LEFT),
            "holder counts should leave out Left employees");
    test:assertFalse(sqlText(query).includes("WHERE lg.is_active"),
            "the master data list should include retired attributes");
}

@test:Config {}
isolated function testSavingAnEmployeeKeepsRetiredAssignments() {
    // Retired attributes are hidden from the edit form, so they are never in the submitted
    // set; removing them here would strip them from the employee for good.
    test:assertTrue(sqlText(deactivateEmployeeLeadershipQuery("LK100001", [1], "admin@example.invalid"))
            .includes("lg.is_active = 1"), "only active attributes should be removed on save");
    test:assertTrue(sqlText(deactivateEmployeeLeadershipQuery("LK100001", [], "admin@example.invalid"))
            .includes("lg.is_active = 1"), "clearing every attribute should still keep retired ones");
}

@test:Config {}
isolated function testEditFormIsNotOfferedRetiredAttributes() {
    test:assertTrue(sqlText(getEmployeeLeadershipIdsQuery("LK100001")).includes("lg.is_active = 1"),
            "the employee's assignable attribute IDs should leave out retired ones");
}

# Whether a create payload with this name passes its constraints.
#
# + name - Attribute name to check
# + return - true when the name is accepted
isolated function createNameAccepted(string name) returns boolean {
    CreateLeadershipGroupPayload|error result = constraint:validate({name});
    return result is CreateLeadershipGroupPayload;
}

# Whether an update payload with this name passes its constraints.
#
# + name - Attribute name to check
# + return - true when the name is accepted
isolated function renameAccepted(string name) returns boolean {
    UpdateLeadershipGroupPayload|error result = constraint:validate({name});
    return result is UpdateLeadershipGroupPayload;
}

@test:Config {}
isolated function testLeadershipNameWithACommaIsRejected() {
    // A holder's attributes travel comma-joined, so a comma would split the name in two.
    test:assertFalse(createNameAccepted("Research, Development"), "a comma in a new name should be rejected");
    test:assertFalse(renameAccepted("Research,Development"), "a comma in a rename should be rejected");
}

@test:Config {}
isolated function testLeadershipNameThatCouldRunAsAFormulaIsRejected() {
    // The name becomes a CSV column header; a spreadsheet runs a cell starting with these.
    foreach string name in ["=HYPERLINK(\"x\")", "+Leadership", "-Leadership", "@Leadership"] {
        test:assertFalse(createNameAccepted(name), string `${name} should be rejected on create`);
        test:assertFalse(renameAccepted(name), string `${name} should be rejected on rename`);
    }
    test:assertFalse(createNameAccepted("1 Tier"), "a name must start with a letter");
    test:assertFalse(createNameAccepted("Tier\t1"), "tabs and other control characters are not allowed");
}

@test:Config {}
isolated function testLeadershipNameRulesStillAllowOrdinaryNames() {
    foreach string name in ["Research & Development", "C-Suite", "Tier 1", "Owner's Circle", "Sr. Leadership",
            "Équipe Direction", "  Senior Leadership  "] {
        test:assertTrue(createNameAccepted(name), string `${name} should be accepted`);
        test:assertTrue(renameAccepted(name), string `${name} should be accepted on rename`);
    }
    test:assertFalse(createNameAccepted("   "), "a blank name should still be rejected");
}

@test:Config {}
isolated function testLeadershipFilterIgnoresRetiredAttributes() {
    // A Left employee may still hold a retired attribute; filtering on it must not return
    // them, since the attribute is hidden from their row.
    string text = sqlText(getEmployeesQuery({filters: {leadershipGroupIds: [3]}, pagination: {}, sort: {}}));
    test:assertTrue(text.includes("lg_f.is_active = 1"), "the leadership filter should only match active attributes");
    test:assertTrue(text.includes("el_f.is_active = 1"), "the leadership filter should still only match active assignments");
}
