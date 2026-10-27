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

import ballerina/log;

# Entry point for the scheduled People App job runner (deployed as a WSO2 Choreo Scheduled Task).
# Runs every registered job in turn regardless of whether an earlier one failed, then reports an
# error if any job failed — so the Choreo run visibly shows as failed and can be noticed, without
# one job's failure preventing the others from running.
#
# + return - Error if any job reported a failure
public function main() returns error? {
    error? leaverResult = runLeaverTransition();
    if leaverResult is error {
        log:printError("Leaver auto-transition sweep failed", leaverResult);
    }

    error? scheduledChangeResult = runScheduledChanges();
    if scheduledChangeResult is error {
        log:printError("Scheduled change sweep failed", scheduledChangeResult);
    }

    error? joinerActivationResult = runJoinerActivation();
    if joinerActivationResult is error {
        log:printError("Joiner activation sweep failed", joinerActivationResult);
    }
    // Future jobs (e.g. probation-to-permanent conversion) are added here the same way: call the
    // job's `run<JobName>()` function (defined in functions.bal), log its error if any, and track
    // it below — every job still runs even if an earlier one failed.

    if leaverResult is error || scheduledChangeResult is error || joinerActivationResult is error {
        return error("One or more scheduled jobs failed — see logs for details");
    }
}
