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

# Source table name for employee_audit snapshots.
const SOURCE_TABLE_EMPLOYEE_AUDIT = "employee_audit";

# Source table name for personal_info_audit snapshots.
const SOURCE_TABLE_PERSONAL_INFO_AUDIT = "personal_info_audit";

# Source table name for employee_additional_managers_audit snapshots.
const SOURCE_TABLE_ADDITIONAL_MANAGERS_AUDIT = "employee_additional_managers_audit";

# Source table name for employee_leadership_audit snapshots.
const SOURCE_TABLE_LEADERSHIP_AUDIT = "employee_leadership_audit";

# Source table name for resignation_audit snapshots.
const SOURCE_TABLE_RESIGNATION_AUDIT = "resignation_audit";

# Synthetic field name for additional-manager events, which describe a relationship
# rather than a column on the employee row.
const FIELD_ADDITIONAL_MANAGER = "additional_manager";

# Synthetic field name for leadership-attribute events, which describe a relationship
# (an employee holding a leadership_group) rather than a column on the employee row.
const FIELD_LEADERSHIP_GROUP = "leadership_group";

# Synthetic field name for the event recording that a resignation was entered.
#
# The first resignation snapshot is an INSERT, which the baseline rule would otherwise
# suppress. For the employee table that rule is right — an onboarding INSERT sets twenty
# fields at once and the timeline shows a single "joined" marker instead. A resignation
# row does not exist until somebody resigns, so its INSERT is the event: the moment the
# departure was recorded, by a named person, on a known date.
const FIELD_RESIGNATION_RECORDED = "resignation_recorded";

# Action type recorded when a row is soft-deleted (is_active flipped to 0).
const ACTION_TYPE_DELETE = "DELETE";

# Action type recorded for a row insert.
const ACTION_TYPE_INSERT = "INSERT";

# Actors that are automated processes rather than people.
final readonly & string[] SYSTEM_ACTORS = ["MIGRATION", "system-scheduler"];

# Employee fields surfaced in the history. Everything else in the audit
# snapshot is either noise or not meaningful to a reader.
#
# Deliberately excluded as noise: updated_on, updated_by, created_on, created_by,
# employee_thumbnail and id. Bulk migrations re-write those columns on rows whose
# meaningful values never changed, so diffing them buries the real changes.
final readonly & string[] TRACKED_EMPLOYEE_FIELDS = [
    "employee_id", "work_email",
    "business_unit_id", "team_id", "sub_team_id", "unit_id",
    "designation_id", "employment_type_id", "company_id", "office_id",
    "manager_email", "employee_status", "work_location",
    "job_role", "secondary_job_title", "external_designation",
    "house_id", "epf", "probation_end_date", "agreement_end_date", "start_date"
];

# Personal information fields surfaced in the history.
#
# `full_name` is deliberately excluded: it is generated from first_name and last_name, so
# tracking it would emit a second event for every name change. The audit columns
# (created_*, updated_*, id) are excluded for the same reason as on the employee table.
final readonly & string[] TRACKED_PERSONAL_INFO_FIELDS = [
    "nic_or_passport", "first_name", "last_name", "title", "dob", "gender",
    "personal_email", "personal_phone", "resident_number",
    "address_line_1", "address_line_2", "city", "state_or_province",
    "postal_code", "country", "nationality"
];

# Resignation fields surfaced in the history.
#
# `date` is deliberately excluded: it is an audit timestamp the backend sets itself
# rather than something anyone enters, so tracking it would emit a second event on
# every resignation write. The audit columns are excluded for the same reason as on
# the employee table.
final readonly & string[] TRACKED_RESIGNATION_FIELDS = [
    "final_day_in_office", "final_day_of_employment", "reason"
];

# The tracked field list for a given audit source.
#
# + sourceTable - Audit table the snapshot came from
# + return - Fields to diff for that source; empty when the source is not tracked
isolated function trackedFieldsFor(string sourceTable) returns string[] {
    if sourceTable == SOURCE_TABLE_EMPLOYEE_AUDIT {
        return TRACKED_EMPLOYEE_FIELDS;
    }
    if sourceTable == SOURCE_TABLE_PERSONAL_INFO_AUDIT {
        return TRACKED_PERSONAL_INFO_FIELDS;
    }
    if sourceTable == SOURCE_TABLE_RESIGNATION_AUDIT {
        return TRACKED_RESIGNATION_FIELDS;
    }
    return [];
}

# Derive field-level change events by comparing consecutive audit snapshots.
#
# Snapshots must arrive ordered by action_on ascending. They may interleave rows from
# several employee records and several source tables; this function separates those
# streams itself rather than assuming the caller has grouped them.
#
# Three properties make the derived history truthful:
#
# 1. An INSERT yields no change events. It is the baseline that the next UPDATE is
# compared against, not a change in its own right. Treating it as a change would make
# every field appear to change on the employee's first day.
#
# 2. Snapshots are compared within a single employee record. A person may hold several
# employee rows over time (a rehire), and their snapshots interleave in one time-ordered
# stream. Comparing across records would invent transitions that never happened.
#
# 3. Snapshots are compared within a single source table. The three audit tables carry
# different columns under partly overlapping names, so a cross-table comparison would
# report tracked fields flipping to null purely because the other table lacks them.
#
# employee_audit and personal_info_audit are diffed field by field.
# employee_additional_managers_audit is not: each of its rows is one manager
# relationship, so the row being added or removed is itself the event.
#
# + snapshots - Audit snapshots ordered oldest first
# + return - One event per changed tracked field, newest first
public isolated function buildHistoryEvents(AuditSnapshot[] snapshots) returns HistoryEvent[] {
    HistoryEvent[] events = [];

    // Keyed by employee record *and* source table, so neither a rehire nor a different
    // audit table is ever compared against the wrong baseline.
    map<json> previousByRecord = {};

    foreach AuditSnapshot snapshot in snapshots {
        // An additional-manager row describes a relationship, not a column on the
        // employee: its existence is the event. Handled before the field diff, which
        // has nothing to compare for it.
        if snapshot.sourceTable == SOURCE_TABLE_ADDITIONAL_MANAGERS_AUDIT {
            HistoryEvent? managerEvent = buildAdditionalManagerEvent(snapshot);
            if managerEvent is HistoryEvent {
                events.push(managerEvent);
            }
            continue;
        }

        // A leadership-attribute row describes a relationship, not a column on the
        // employee: its existence is the event, mirroring the additional-manager
        // handling above.
        if snapshot.sourceTable == SOURCE_TABLE_LEADERSHIP_AUDIT {
            HistoryEvent? leadershipEvent = buildLeadershipEvent(snapshot);
            if leadershipEvent is HistoryEvent {
                events.push(leadershipEvent);
            }
            continue;
        }

        // A resignation being entered is reported as one event rather than three field
        // changes: the three details are entered together in a single act, and listing
        // them separately would read as three decisions where there was one.
        if snapshot.sourceTable == SOURCE_TABLE_RESIGNATION_AUDIT
            && snapshot.actionType == ACTION_TYPE_INSERT {
            events.push({
                employeePkId: snapshot.employeePkId,
                'field: FIELD_RESIGNATION_RECORDED,
                sourceTable: snapshot.sourceTable,
                // No previous value: nothing preceded the resignation being recorded.
                previousValue: (),
                currentValue: resignationSummary(snapshot.data),
                occurredOn: snapshot.actionOn,
                actionBy: snapshot.actionBy,
                isSystem: isSystemActor(snapshot.actionBy)
            });
            // Still recorded as the baseline, so a later correction to any of the three
            // fields diffs against what was originally entered.
            previousByRecord[string `${snapshot.employeePkId}|${snapshot.sourceTable}`] =
                snapshot.data;
            continue;
        }

        string recordKey = string `${snapshot.employeePkId}|${snapshot.sourceTable}`;

        // hasKey, not `previous is json`: a JSON null is itself a valid json value, so an
        // absent baseline and a stored null are indistinguishable by type alone.
        boolean hasBaseline = previousByRecord.hasKey(recordKey);
        json previous = previousByRecord[recordKey] ?: ();

        // An INSERT restarts the baseline for this record rather than being diffed
        // against whatever preceded it.
        boolean isBaseline = snapshot.actionType == ACTION_TYPE_INSERT;

        string[] trackedFields = trackedFieldsFor(snapshot.sourceTable);

        if hasBaseline && !isBaseline && trackedFields.length() > 0 {
            foreach string 'field in trackedFields {
                json previousValue = getField(previous, 'field);
                json currentValue = getField(snapshot.data, 'field);

                if previousValue != currentValue {
                    events.push({
                        employeePkId: snapshot.employeePkId,
                        'field: 'field,
                        sourceTable: snapshot.sourceTable,
                        previousValue: toDisplayValue(previousValue),
                        currentValue: toDisplayValue(currentValue),
                        occurredOn: snapshot.actionOn,
                        actionBy: snapshot.actionBy,
                        isSystem: isSystemActor(snapshot.actionBy)
                    });
                }
            }
        }

        previousByRecord[recordKey] = snapshot.data;
    }

    return events.reverse();
}

# Build an event for an additional-manager row.
#
# Unlike the employee and personal-info tables, there is nothing to diff here: one row is
# one manager relationship, so an INSERT is an addition and the trigger records a DELETE
# when is_active flips to 0. An UPDATE that leaves the row active is a no-op re-save and
# yields nothing, so a bulk re-write cannot fill the timeline with noise.
#
# + snapshot - Audit snapshot from employee_additional_managers_audit
# + return - The event, or () when the snapshot records no meaningful change
# The value shown against a recorded resignation.
#
# The reason, then when the employment ends — short enough to read as a value rather
# than a sentence, which is how every other row in the timeline reads.
#
# The date is named rather than left bare: a resignation carries two dates, and "final
# day" is the one the profile uses for this field. Calling it "last day" would name the
# other one, which is the day the person stops coming in.
#
# + data - The resignation audit snapshot
# + return - The value to show, or () when the row carried nothing worth reporting
isolated function resignationSummary(json data) returns string? {
    string? reason = toDisplayValue(getField(data, "reason"));
    string? finalDay = toDisplayValue(getField(data, "final_day_of_employment"));

    if reason is string && finalDay is string {
        return string `${reason} · final day ${finalDay}`;
    }
    if reason is string {
        return reason;
    }
    if finalDay is string {
        return string `Final day ${finalDay}`;
    }
    return ();
}

isolated function buildAdditionalManagerEvent(AuditSnapshot snapshot) returns HistoryEvent? {
    string? managerEmail = toDisplayValue(getField(snapshot.data, "additional_manager_email"));
    if managerEmail is () {
        return ();
    }

    boolean isRemoval = snapshot.actionType == ACTION_TYPE_DELETE
        || toDisplayValue(getField(snapshot.data, "is_active")) == "0";
    boolean isAddition = snapshot.actionType == ACTION_TYPE_INSERT;

    if !isRemoval && !isAddition {
        return ();
    }

    return {
        employeePkId: snapshot.employeePkId,
        'field: FIELD_ADDITIONAL_MANAGER,
        sourceTable: snapshot.sourceTable,
        // Rendered by the existing old -> new treatment: an addition has no previous
        // value, and a removal has no current one, which the timeline already draws as
        // "added" and "Removed" respectively.
        previousValue: isRemoval ? managerEmail : (),
        currentValue: isRemoval ? () : managerEmail,
        occurredOn: snapshot.actionOn,
        actionBy: snapshot.actionBy,
        isSystem: isSystemActor(snapshot.actionBy)
    };
}

# Build an event for a leadership-attribute row.
#
# One row is one employee-to-leadership_group relationship, so an INSERT is an addition
# and the trigger records a DELETE when is_active flips to 0. Re-assigning a removed
# attribute revives the same row (0 -> 1) and is logged as an UPDATE; the snapshot's
# previous_is_active tells it apart from re-saving an attribute already held (1 -> 1),
# which yields nothing. Snapshots written before previous_is_active existed carry no
# value for it, so their UPDATEs stay no-ops as before.
#
# The raw leadership_group_id is carried as the value here; it is resolved to the group's
# display name later by resolveHistoryEventNames, via the `leadership_group` lookup entry.
#
# + snapshot - Audit snapshot from employee_leadership_audit
# + return - The event, or () when the snapshot records no meaningful change
isolated function buildLeadershipEvent(AuditSnapshot snapshot) returns HistoryEvent? {
    string? leadershipGroupId = toDisplayValue(getField(snapshot.data, "leadership_group_id"));
    if leadershipGroupId is () {
        return ();
    }

    boolean isRemoval = snapshot.actionType == ACTION_TYPE_DELETE
        || toDisplayValue(getField(snapshot.data, "is_active")) == "0";
    boolean isReassignment = toDisplayValue(getField(snapshot.data, "is_active")) == "1"
        && toDisplayValue(getField(snapshot.data, "previous_is_active")) == "0";
    boolean isAddition = snapshot.actionType == ACTION_TYPE_INSERT || isReassignment;

    if !isRemoval && !isAddition {
        return ();
    }

    return {
        employeePkId: snapshot.employeePkId,
        'field: FIELD_LEADERSHIP_GROUP,
        sourceTable: snapshot.sourceTable,
        // Rendered by the existing old -> new treatment: an addition has no previous
        // value, and a removal has no current one, which the timeline already draws as
        // "added" and "Removed" respectively.
        previousValue: isRemoval ? leadershipGroupId : (),
        currentValue: isRemoval ? () : leadershipGroupId,
        occurredOn: snapshot.actionOn,
        actionBy: snapshot.actionBy,
        isSystem: isSystemActor(snapshot.actionBy)
    };
}

# Read a member from a JSON snapshot without failing when it is absent.
#
# Audit payloads are written by database triggers whose column set has changed over
# time, so older rows legitimately lack fields that newer rows carry.
#
# + data - JSON snapshot to read from
# + fieldName - Member name to read
# + return - The member value, or () when the snapshot is not an object or lacks the member
isolated function getField(json data, string fieldName) returns json {
    if data is map<json> {
        return data[fieldName];
    }
    return ();
}

# Render a JSON scalar as the string shown in the timeline.
#
# + value - JSON value taken from an audit snapshot
# + return - String form of the scalar, or () when the value is absent or JSON null
isolated function toDisplayValue(json value) returns string? {
    if value is () {
        return ();
    }
    if value is string {
        return value;
    }
    return value.toString();
}

# Check whether an audit actor is an automated process rather than a person.
#
# + actionBy - Value of the audit row's action_by column
# + return - True when the actor is a known system actor
isolated function isSystemActor(string actionBy) returns boolean {
    // Prefix rather than exact match: a change applied by the scheduler on someone's
    // behalf is recorded as "system-scheduler on behalf of <email>", and is still
    // automation carrying out an earlier decision rather than a person acting now.
    foreach string systemActor in SYSTEM_ACTORS {
        if actionBy == systemActor || actionBy.startsWith(systemActor + " ") {
            return true;
        }
    }
    return false;
}

# Resolve raw foreign-key values on history events to human-readable names.
#
# Events arrive carrying ids from the audit snapshots ("87"). Anything that has a mapping
# is replaced with its name; values with no mapping (a deleted lookup row, or a field that
# was never an id) are left exactly as they are rather than blanked, so nothing disappears
# from the timeline.
#
# + events - History events carrying raw values
# + lookup - Field -> id -> name mapping
# + return - Events with id values replaced by names where a mapping exists
public isolated function resolveHistoryEventNames(HistoryEvent[] events, map<map<string>> lookup)
        returns HistoryEvent[] =>
    from HistoryEvent event in events
    select {
        employeePkId: event.employeePkId,
        'field: event.'field,
        sourceTable: event.sourceTable,
        previousValue: resolveLookupValue(event.'field, event.previousValue, lookup),
        currentValue: resolveLookupValue(event.'field, event.currentValue, lookup),
        occurredOn: event.occurredOn,
        actionBy: event.actionBy,
        isSystem: event.isSystem
    };

# Replace a single id with its name when a mapping exists.
#
# + field - The audit field the value belongs to
# + value - The raw value, possibly an id
# + lookup - Field -> id -> name mapping
# + return - The resolved name, or the original value when there is no mapping
isolated function resolveLookupValue(string 'field, string? value, map<map<string>> lookup)
        returns string? {
    if value is () {
        return ();
    }
    if !lookup.hasKey('field) {
        return value;
    }
    map<string> byId = lookup.get('field);
    return byId.hasKey(value) ? byId.get(value) : value;
}
