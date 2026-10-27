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

@test:Config {}
function placeholderEmailsAreRecognised() {
    test:assertTrue(isPlaceholderWorkEmail(FUTURE_JOINER_EMAIL));
    test:assertTrue(isPlaceholderWorkEmail(EX_EMPLOYEE_EMAIL));
}

@test:Config {}
function placeholderMatchIgnoresCaseAndSurroundingSpace() {
    test:assertTrue(isPlaceholderWorkEmail("  Future-Joiner@WSO2.com "));
    test:assertTrue(isPlaceholderWorkEmail("EX-EMPLOYEE@wso2.com"));
}

@test:Config {}
function realEmailsAreNotPlaceholders() {
    test:assertFalse(isPlaceholderWorkEmail("john@wso2.com"));
    // Close to a placeholder is still a real address.
    test:assertFalse(isPlaceholderWorkEmail("future-joiner2@wso2.com"));
    test:assertFalse(isPlaceholderWorkEmail(""));
}

@test:Config {}
function futureStartDateStartsAsNewJoiner() {
    test:assertEquals(initialEmployeeStatus("2026-10-02", "2026-10-01"), EMPLOYEE_NEW_JOINER);
    test:assertEquals(initialEmployeeStatus("2027-01-15", "2026-10-01"), EMPLOYEE_NEW_JOINER);
}

@test:Config {}
function todayOrPastStartDateStartsActive() {
    // Starting today is already employed: waiting for the next sweep would leave them a day
    // out of the active lists.
    test:assertEquals(initialEmployeeStatus("2026-10-01", "2026-10-01"), EMPLOYEE_ACTIVE);
    test:assertEquals(initialEmployeeStatus("2026-09-01", "2026-10-01"), EMPLOYEE_ACTIVE);
}

@test:Config {}
function currentEmploymentStatusesIncludeNewJoiner() {
    test:assertTrue(isCurrentEmploymentStatus(EMPLOYEE_ACTIVE));
    test:assertTrue(isCurrentEmploymentStatus(EMPLOYEE_NEW_JOINER));
    // A Marked leaver is on their way out: their next employment (a relocation) can be onboarded.
    test:assertFalse(isCurrentEmploymentStatus(EMPLOYEE_MARKED_LEAVER));
    test:assertFalse(isCurrentEmploymentStatus(EMPLOYEE_LEFT));
}

@test:Config {}
function resigningANewJoinerMarksThemALeaver() {
    // A joiner who withdraws before starting must leave through the leaver sweep. Left as a
    // New joiner, the activation sweep would make them Active on their start date.
    test:assertEquals(statusAfterResignation(EMPLOYEE_NEW_JOINER), EMPLOYEE_MARKED_LEAVER);
    test:assertEquals(statusAfterResignation(EMPLOYEE_ACTIVE), EMPLOYEE_MARKED_LEAVER);
}

@test:Config {}
function resigningAgainKeepsTheCurrentStatus() {
    // Correcting the details of someone already leaving or gone must not move them back.
    test:assertEquals(statusAfterResignation(EMPLOYEE_MARKED_LEAVER), ());
    test:assertEquals(statusAfterResignation(EMPLOYEE_LEFT), ());
}

@test:Config {}
function aLeaversEmailIsFreeForTheirNextEmployment() {
    // A relocating employee keeps their email: the old employment is Marked leaver while the
    // new one is onboarded, so only Active and New joiner holders make an email unavailable.
    string[] statuses = [];
    foreach var value in getCurrentEmployeeByWorkEmailQuery("john@wso2.com").insertions {
        if value is string && value != "john@wso2.com" {
            statuses.push(value);
        }
    }
    test:assertEquals(statuses, [EMPLOYEE_ACTIVE, EMPLOYEE_NEW_JOINER]);
}

@test:Config {}
function theEditedEmployeeDoesNotHoldTheirOwnEmail() {
    sql:ParameterizedQuery query = getCurrentEmployeeByWorkEmailQuery("john@wso2.com", "LK100200");
    int excluded = 0;
    foreach var value in query.insertions {
        if value == "LK100200" {
            excluded += 1;
        }
    }
    test:assertEquals(excluded, 2, "the edited employee must be left out");
    test:assertTrue(sqlText(query).includes("e.employee_id <>"));
}

@test:Config {}
function settingAMarkedLeaverBackToActiveChecksEmailAndNic() {
    // The relocation case: the old employment is set back to Active after the new one exists.
    test:assertEquals(identityChecksForEdit(EMPLOYEE_MARKED_LEAVER, EMPLOYEE_ACTIVE, "john@wso2.com", ()),
            {email: true, nic: true});
    test:assertEquals(identityChecksForEdit(EMPLOYEE_LEFT, EMPLOYEE_NEW_JOINER, "john@wso2.com", ()),
            {email: true, nic: true});
}

@test:Config {}
function changingACurrentEmployeesEmailChecksTheEmailOnly() {
    test:assertEquals(identityChecksForEdit(EMPLOYEE_ACTIVE, (), "john@wso2.com", "johnny@wso2.com"),
            {email: true, nic: false});
    // The same address in another case or with spaces is not a change.
    test:assertEquals(identityChecksForEdit(EMPLOYEE_ACTIVE, (), "john@wso2.com", " John@WSO2.com "),
            {email: false, nic: false});
}

@test:Config {}
function ordinaryEditsAndLeaversNeedNoChecks() {
    test:assertEquals(identityChecksForEdit(EMPLOYEE_ACTIVE, (), "john@wso2.com", ()), {email: false, nic: false});
    test:assertEquals(identityChecksForEdit(EMPLOYEE_NEW_JOINER, EMPLOYEE_ACTIVE, "john@wso2.com", ()),
            {email: false, nic: false});
    // Ending up a leaver never clashes with a current employment.
    test:assertEquals(identityChecksForEdit(EMPLOYEE_ACTIVE, EMPLOYEE_MARKED_LEAVER, "john@wso2.com",
            "johnny@wso2.com"), {email: false, nic: false});
    test:assertEquals(identityChecksForEdit(EMPLOYEE_LEFT, (), "john@wso2.com", "johnny@wso2.com"),
            {email: false, nic: false});
}

@test:Config {}
function anotherCurrentEmploymentIsFound() {
    EmploymentMatch[] employments = [
        employment("UK100058", "john@wso2.com", EMPLOYEE_NEW_JOINER),
        employment("LK100200", "john@wso2.com", EMPLOYEE_MARKED_LEAVER)
    ];
    test:assertEquals(otherCurrentEmployment(employments, "LK100200")?.employeeId, "UK100058");
    // The employment being edited does not count against itself.
    test:assertEquals(otherCurrentEmployment(employments, "UK100058"), ());
    test:assertEquals(otherCurrentEmployment([employment("LK100100", "john@wso2.com", EMPLOYEE_LEFT)],
            "LK100200"), ());
}

isolated function employment(string employeeId, string workEmail, string status) returns EmploymentMatch =>
    {employeeId, firstName: "John", lastName: "Silva", workEmail, employeeStatus: status};

@test:Config {}
function newPersonIsNotRefused() {
    test:assertEquals(checkReturningEmployee([], "john@wso2.com"), ());
    test:assertEquals(checkReturningEmployee([], ()), ());
}

@test:Config {}
function aMarkedLeaverCanBeOnboardedAgainUnderTheirEmail() {
    // Relocation within the same country: the same NIC, the old employment Marked leaver.
    EmploymentMatch[] employments = [employment("LK100200", "john@wso2.com", EMPLOYEE_MARKED_LEAVER)];
    test:assertEquals(checkReturningEmployee(employments, "john@wso2.com"), ());
    test:assertTrue(checkReturningEmployee(employments, "other@wso2.com") is string);
}

@test:Config {}
function currentlyEmployedPersonIsRefused() {
    string[] currentStatuses = [EMPLOYEE_ACTIVE, EMPLOYEE_NEW_JOINER];
    foreach string status in currentStatuses {
        EmploymentMatch[] employments = [employment("LK100200", "john@wso2.com", status)];
        string? refusal = checkReturningEmployee(employments, "john@wso2.com");
        test:assertTrue(refusal is string, string `${status} must count as current employment`);
        test:assertTrue((refusal ?: "").includes("LK100200"));
    }
}

@test:Config {}
function formerEmployeeMustKeepTheirEmail() {
    EmploymentMatch[] employments = [employment("LK100123", "john@wso2.com", EMPLOYEE_LEFT)];
    // Same address, any case, is a rehire.
    test:assertEquals(checkReturningEmployee(employments, "John@WSO2.com"), ());

    string? differentEmail = checkReturningEmployee(employments, "johnny@wso2.com");
    test:assertTrue(differentEmail is string);
    // The refusal names the email to use so HR can correct the form.
    test:assertTrue((differentEmail ?: "").includes("john@wso2.com"));
    test:assertTrue((differentEmail ?: "").includes("LK100123"));

    // Leaving it empty is refused too: their email is known.
    test:assertTrue(checkReturningEmployee(employments, ()) is string);
}

@test:Config {}
function anyOfTheirEarlierEmailsIsAccepted() {
    EmploymentMatch[] employments = [
        employment("LK100500", "john.silva@wso2.com", EMPLOYEE_LEFT),
        employment("LK100123", "john@wso2.com", EMPLOYEE_LEFT)
    ];
    test:assertEquals(checkReturningEmployee(employments, "john@wso2.com"), ());
    test:assertEquals(checkReturningEmployee(employments, "john.silva@wso2.com"), ());
}

@test:Config {}
function formerEmployeeOnPlaceholderEmailIsNotRefused() {
    // Nothing real to compare against, so the NIC alone identifies them.
    EmploymentMatch[] employments = [employment("LK100123", EX_EMPLOYEE_EMAIL, EMPLOYEE_LEFT)];
    test:assertEquals(checkReturningEmployee(employments, "john@wso2.com"), ());
    test:assertEquals(checkReturningEmployee(employments, ()), ());
}

@test:Config {}
function placeholderRowsDoNotDecideTheEmail() {
    // The latest employment holds a placeholder; the real email from an earlier one still applies.
    EmploymentMatch[] employments = [
        employment("LK100900", FUTURE_JOINER_EMAIL, EMPLOYEE_LEFT),
        employment("LK100123", "john@wso2.com", EMPLOYEE_LEFT)
    ];
    test:assertEquals(checkReturningEmployee(employments, "john@wso2.com"), ());
    test:assertTrue(checkReturningEmployee(employments, "other@wso2.com") is string);
}
