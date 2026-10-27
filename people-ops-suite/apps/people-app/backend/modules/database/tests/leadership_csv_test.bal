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

import ballerina/test;

# The three seeded attributes, as the export handler would pass them.
#
# + return - The three seeded leadership attributes
isolated function seededGroups() returns LeadershipGroup[] => [
    {id: 1, name: "Leadership Group", isActive: true},
    {id: 2, name: "Business Leadership", isActive: true},
    {id: 3, name: "Senior Leadership", isActive: true}
];

# An employee holding two of the three attributes.
#
# + return - Employee holding Business Leadership and Senior Leadership
isolated function twoAttributeEmployee() returns Employee {
    Employee e = personalFieldEmployee();
    e.leadershipGroups = "Business Leadership,Senior Leadership";
    return e;
}

# An employee holding none.
#
# + return - Employee holding no leadership attributes
isolated function noAttributeEmployee() returns Employee {
    Employee e = personalFieldEmployee();
    e.leadershipGroups = ();
    return e;
}

@test:Config {}
isolated function testLeadershipExpandsToOneColumnPerAttribute() {
    string csv = buildEmployeeCsv([twoAttributeEmployee()], {}, ["employeeId", "leadershipGroups"],
            seededGroups());
    string[] lines = re `\n`.split(csv);

    // Alphabetical by name, so: Business Leadership, Leadership Group, Senior Leadership
    test:assertEquals(lines[0], "Employee Id,Business Leadership,Leadership Group,Senior Leadership",
            "header row should expand into one column per attribute, alphabetically");
    test:assertEquals(lines[1], "LK999999,Yes,No,Yes",
            "cells should be Yes/No per attribute");
}

@test:Config {}
isolated function testEmployeeWithNoAttributesGetsNoInEveryColumn() {
    string csv = buildEmployeeCsv([noAttributeEmployee()], {}, ["employeeId", "leadershipGroups"],
            seededGroups());
    string[] lines = re `\n`.split(csv);

    test:assertEquals(lines[1], "LK999999,No,No,No",
            "an employee holding no attributes gets No in every leadership column");
}

@test:Config {}
isolated function testAddingAFourthAttributeAddsAFourthColumnWithNoCodeChange() {
    // Guards the promise made to the client: a new attribute is a data change only.
    LeadershipGroup[] fourGroups = [
        {id: 1, name: "Leadership Group", isActive: true},
        {id: 2, name: "Business Leadership", isActive: true},
        {id: 3, name: "Senior Leadership", isActive: true},
        {id: 4, name: "Technical Leadership", isActive: true}
    ];
    Employee e = personalFieldEmployee();
    e.leadershipGroups = "Technical Leadership";

    string csv = buildEmployeeCsv([e], {}, ["employeeId", "leadershipGroups"], fourGroups);
    string[] lines = re `\n`.split(csv);

    test:assertEquals(lines[0],
            "Employee Id,Business Leadership,Leadership Group,Senior Leadership,Technical Leadership",
            "a fourth attribute must produce a fourth column with no code change");
    test:assertEquals(lines[1], "LK999999,No,No,No,Yes");
}

@test:Config {}
isolated function testDeactivatedAttributeDropsItsColumn() {
    LeadershipGroup[] twoActive = [
        {id: 2, name: "Business Leadership", isActive: true},
        {id: 3, name: "Senior Leadership", isActive: true}
    ];
    string csv = buildEmployeeCsv([twoAttributeEmployee()], {}, ["employeeId", "leadershipGroups"],
            twoActive);
    string[] lines = re `\n`.split(csv);

    test:assertEquals(lines[0], "Employee Id,Business Leadership,Senior Leadership",
            "a retired attribute must not produce a column");
    test:assertEquals(lines[1], "LK999999,Yes,Yes");
}

@test:Config {}
isolated function testUnrequestedLeadershipColumnIsAbsent() {
    string csv = buildEmployeeCsv([twoAttributeEmployee()], {}, ["employeeId"], seededGroups());
    string[] lines = re `\n`.split(csv);

    test:assertEquals(lines[0], "Employee Id",
            "not selecting the leadership column must yield none of its columns");
    test:assertEquals(lines[1], "LK999999");
}

@test:Config {}
isolated function testOtherColumnsAreUnaffected() {
    string csv = buildEmployeeCsv([twoAttributeEmployee()], {},
            ["employeeId", "leadershipGroups", "firstName"], seededGroups());
    string[] lines = re `\n`.split(csv);

    test:assertEquals(lines[0],
            "Employee Id,Business Leadership,Leadership Group,Senior Leadership,First Name",
            "expansion must happen in place, leaving surrounding columns in order");
    test:assertEquals(lines[1], "LK999999,Yes,No,Yes,Test");
}
