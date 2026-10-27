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

import people_scheduler.database;
import people_scheduler.email;

import ballerina/log;

const string SCHEDULER_ACTOR = "system-scheduler";

# Run the leaver auto-transition job: find employees whose Marked-leaver final day of employment
# has arrived, transition them to Left, and email a summary.
#
# + return - Error if the transition step itself fails, or if the summary email could not be sent
# after retries — the transition itself has already committed either way; this only reports
# whether the notification step succeeded, so the scheduled run surfaces as failed and can be
# noticed and manually checked.
isolated function runLeaverTransition() returns error? {
    log:printInfo("Leaver auto-transition sweep started");

    database:LeaverTransition[] transitions = check database:transitionExpiredLeavers(SCHEDULER_ACTOR);

    if transitions.length() == 0 {
        log:printInfo("Leaver auto-transition sweep completed — no employees due for transition");
        return;
    }

    log:printInfo("Leaver transition step completed", count = transitions.length());

    error? notifyResult = email:notifyLeaverAutoTransition(transitions);
    if notifyResult is error {
        log:printError("Failed to send leaver auto-transition summary email", notifyResult);
        log:printInfo("Leaver auto-transition sweep completed");
        return notifyResult;
    }

    log:printInfo("Leaver auto-transition sweep completed");
}

# Run the scheduled-change job: apply every change whose effective date has arrived and
# email a summary.
#
# A change that was overtaken by a direct edit to the same field is reported as
# superseded rather than applied, so the summary is where somebody learns that a planned
# change did not happen — silently skipping it would leave the decision unmade and
# unnoticed.
#
# + return - Error if the changes could not be read, or if the summary email could not be
# sent after retries — the changes themselves have already committed either way; this
# only reports whether the notification step succeeded, so a failed run can be noticed
# and checked by hand.
isolated function runScheduledChanges() returns error? {
    log:printInfo("Scheduled change sweep started");

    database:ScheduledChangeOutcome[] outcomes = check database:applyDueScheduledChanges(SCHEDULER_ACTOR);

    if outcomes.length() == 0 {
        log:printInfo("Scheduled change sweep completed — no changes due");
        return;
    }

    int applied = 0;
    int superseded = 0;
    int failed = 0;
    foreach database:ScheduledChangeOutcome outcome in outcomes {
        match outcome.status {
            database:SCHEDULED_CHANGE_APPLIED => { applied += 1; }
            database:SCHEDULED_CHANGE_SUPERSEDED => { superseded += 1; }
            _ => { failed += 1; }
        }
    }

    log:printInfo("Scheduled change step completed",
            applied = applied, superseded = superseded, failed = failed);

    error? notifyResult = email:notifyScheduledChanges(outcomes);
    if notifyResult is error {
        log:printError("Failed to send scheduled change summary email", notifyResult);
        log:printInfo("Scheduled change sweep completed");
        return notifyResult;
    }

    log:printInfo("Scheduled change sweep completed");
}

# Run the joiner activation job: find New joiners whose start date has arrived, make
# them Active, and email a summary that names any still on the placeholder work email.
#
# They are activated whether or not their real work email has been added: the start date is
# when they join, and the summary is where HR learns which emails are still to be filled in.
#
# + return - Error if the activation step itself fails, or if the summary email could not be sent
# after retries — the activation itself has already committed either way; this only reports
# whether the notification step succeeded, so the scheduled run surfaces as failed and can be
# noticed and manually checked.
isolated function runJoinerActivation() returns error? {
    log:printInfo("Joiner activation sweep started");

    database:JoinerActivation[] activations = check database:activateDueNewJoiners(SCHEDULER_ACTOR);

    if activations.length() == 0 {
        log:printInfo("Joiner activation sweep completed — no employees due for activation");
        return;
    }

    log:printInfo("Joiner activation step completed", count = activations.length());

    error? notifyResult = email:notifyJoinerActivation(activations);
    if notifyResult is error {
        log:printError("Failed to send joiner activation summary email", notifyResult);
        log:printInfo("Joiner activation sweep completed");
        return notifyResult;
    }

    log:printInfo("Joiner activation sweep completed");
}
