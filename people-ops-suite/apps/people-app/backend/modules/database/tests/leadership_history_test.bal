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

# An employee_leadership_audit snapshot as the history endpoint reads it.
#
# + actionType - INSERT, UPDATE or DELETE
# + isActive - The row's is_active after the change
# + previousIsActive - The row's is_active before the change, or () when not recorded
# + return - The snapshot
isolated function leadershipSnapshot(string actionType, int isActive, int? previousIsActive)
        returns AuditSnapshot => {
    employeePkId: 13502,
    sourceTable: SOURCE_TABLE_LEADERSHIP_AUDIT,
    actionType,
    actionBy: "admin@example.invalid",
    actionOn: "2026-09-28 10:00:00",
    data: {
        id: 1,
        employee_pk_id: 13502,
        leadership_group_id: 3,
        is_active: isActive,
        previous_is_active: previousIsActive
    }
};

@test:Config {}
isolated function testFirstAssignmentIsAnAddition() {
    HistoryEvent? event = buildLeadershipEvent(leadershipSnapshot(ACTION_TYPE_INSERT, 1, ()));
    test:assertTrue(event is HistoryEvent, "an INSERT should be reported");
    if event is HistoryEvent {
        test:assertEquals(event.currentValue, "3", "an addition carries the attribute as its new value");
        test:assertEquals(event.previousValue, (), "an addition has no previous value");
    }
}

@test:Config {}
isolated function testRemovalIsReported() {
    HistoryEvent? event = buildLeadershipEvent(leadershipSnapshot(ACTION_TYPE_DELETE, 0, 1));
    test:assertTrue(event is HistoryEvent, "a removal should be reported");
    if event is HistoryEvent {
        test:assertEquals(event.previousValue, "3", "a removal carries the attribute as its previous value");
        test:assertEquals(event.currentValue, (), "a removal has no current value");
    }
}

@test:Config {}
isolated function testReassigningARemovedAttributeIsAnAddition() {
    // The removed row is revived (0 -> 1) and the trigger logs it as an UPDATE.
    HistoryEvent? event = buildLeadershipEvent(leadershipSnapshot("UPDATE", 1, 0));
    test:assertTrue(event is HistoryEvent, "re-assigning a removed attribute should be reported");
    if event is HistoryEvent {
        test:assertEquals(event.currentValue, "3", "a re-assignment is reported as an addition");
        test:assertEquals(event.previousValue, ());
    }
}

@test:Config {}
isolated function testResavingAHeldAttributeIsNotReported() {
    // Saving an employee rewrites attributes they already hold (1 -> 1); that is not a change.
    test:assertTrue(buildLeadershipEvent(leadershipSnapshot("UPDATE", 1, 1)) is (),
            "re-saving an attribute already held should not be reported");
}

@test:Config {}
isolated function testOlderUpdateSnapshotsStayNoOps() {
    // Snapshots written before previous_is_active existed cannot tell 0 -> 1 from 1 -> 1.
    test:assertTrue(buildLeadershipEvent(leadershipSnapshot("UPDATE", 1, ())) is (),
            "an UPDATE without previous_is_active should not be reported");
}
