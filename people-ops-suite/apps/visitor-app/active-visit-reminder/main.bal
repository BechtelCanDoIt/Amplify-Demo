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
import active_visit_reminder.email;
import active_visit_reminder.visitor;

import ballerina/log;
import ballerina/time;

public function main() returns error? {
    log:printInfo("Scheduler run started");

    visitor:Visit[]|error activeVisits = visitor:fetchActiveVisits();
    if activeVisits is error {
        log:printError("Failed to fetch active visits, aborting run", activeVisits);
        return activeVisits;
    }

    log:printInfo("Active visits fetched", count = activeVisits.length());

    time:Utc now = time:utcNow();
    string today = string:substring(time:utcToString(now), 0, 10);
    time:Utc twoDaysAgo = time:utcAddSeconds(now, -2.0 * 24.0 * 60.0 * 60.0);

    foreach visitor:Visit visit in activeVisits {
        string? timeOfDeparture = visit.timeOfDeparture;
        if timeOfDeparture is string {
            time:Utc|error departureUtc = time:utcFromString(re ` `.replaceAll(timeOfDeparture, "T") + "Z");
            if departureUtc is error {
                log:printError("Cannot parse timeOfDeparture, skipping",
                        departureUtc, id = visit.id, timeOfDeparture = timeOfDeparture);

                continue;
            }

            // Send a reminder email if the departure time has passed the current UTC time.
            if time:utcDiffSeconds(now, departureUtc) >= 0d {
                int daysOverdueCount = <int>(time:utcDiffSeconds(now, departureUtc) / 86400d);
                string daysOverdue = daysOverdueCount == 0 ? "today" : daysOverdueCount == 1 ? "1 day ago" :
                        daysOverdueCount.toString() + " days ago";

                // Format the departure time for the email content
                string formattedDepartureTime = timeOfDeparture + " UTC";
                string|error formattedDepartureTimeResult = formatDateTime(timeOfDeparture, "Asia/Colombo");
                if formattedDepartureTimeResult is error {
                    log:printError("Failed to format departure time, skipping email",
                            formattedDepartureTimeResult, id = visit.id, timeOfDeparture = timeOfDeparture);

                    formattedDepartureTime = timeOfDeparture + " UTC"; // Fallback to original string if formatting fails
                } else {
                    formattedDepartureTime = formattedDepartureTimeResult;
                }

                // Format the time of entry for the email content
                string? formattedTimeOfEntry = visit.timeOfEntry;
                if formattedTimeOfEntry is string {
                    string|error formattedTimeOfEntryResult = formatDateTime(formattedTimeOfEntry, "Asia/Colombo");
                    if formattedTimeOfEntryResult is error {
                        log:printError("Failed to format time of entry, skipping email",
                                formattedTimeOfEntryResult, id = visit.id, timeOfEntry = formattedTimeOfEntry);

                        formattedTimeOfEntry = formattedTimeOfEntry + " UTC"; // Fallback to original string if formatting fails    
                    } else {
                        formattedTimeOfEntry = formattedTimeOfEntryResult;
                    }
                } else {
                    formattedTimeOfEntry = ();
                }

                error? emailError = email:sendDepartureOverdueReminderEmail({
                                                                                id: visit.id,
                                                                                visitorName: buildVisitorName(visit.firstName, visit.lastName),
                                                                                visitDate: visit.visitDate,
                                                                                timeOfEntry: formattedTimeOfEntry,
                                                                                timeOfDeparture: formattedDepartureTime,
                                                                                whomTheyMeet: visit.whomTheyMeet,
                                                                                passNumber: visit.passNumber,
                                                                                companyName: visit.companyName,
                                                                                purposeOfVisit: visit.purposeOfVisit
                                                                            }, daysOverdue);
                if emailError is error {
                    log:printError("Failed to send departure-overdue reminder email", emailError, id = visit.id);
                } else {
                    log:printInfo("Departure-overdue reminder email sent successfully", id = visit.id);
                }
            }
        } else {
            // If there's no departure time, send a long-running visit reminder once the visit has been active for more than 2 days.
            string? entry = visit.timeOfEntry;
            if entry is () {
                log:printError("Visit has no entry time, skipping", id = visit.id);
                continue;
            }

            time:Utc|error entryUtc = time:utcFromString(re ` `.replaceAll(entry, "T") + "Z");
            if entryUtc is error {
                log:printError("Cannot parse timeOfEntry, skipping", entryUtc, id = visit.id, timeOfEntry = entry);
                continue;
            }

            if time:utcDiffSeconds(twoDaysAgo, entryUtc) >= 0d {
                int daysActiveCount = <int>(time:utcDiffSeconds(now, entryUtc) / 86400d);
                string daysActive = daysActiveCount == 1 ? "1 day" : daysActiveCount.toString() + " days";

                // Format the time of entry for the email content
                string? formattedTimeOfEntry = visit.timeOfEntry;
                if formattedTimeOfEntry is string {
                    string|error formattedTimeOfEntryResult = formatDateTime(formattedTimeOfEntry, "Asia/Colombo");
                    if formattedTimeOfEntryResult is error {
                        log:printError("Failed to format time of entry, skipping email",
                                formattedTimeOfEntryResult, id = visit.id, timeOfEntry = formattedTimeOfEntry);

                        formattedTimeOfEntry = formattedTimeOfEntry + " UTC"; // Fallback to original string if formatting fails    
                    } else {
                        formattedTimeOfEntry = formattedTimeOfEntryResult;
                    }
                } else {
                    formattedTimeOfEntry = ();
                }

                error? emailError = email:sendLongRunningVisitReminderEmail({
                                                                                id: visit.id,
                                                                                visitorName: buildVisitorName(visit.firstName, visit.lastName),
                                                                                visitDate: visit.visitDate,
                                                                                timeOfEntry: formattedTimeOfEntry,
                                                                                timeOfDeparture: (),
                                                                                whomTheyMeet: visit.whomTheyMeet,
                                                                                passNumber: visit.passNumber,
                                                                                companyName: visit.companyName,
                                                                                purposeOfVisit: visit.purposeOfVisit
                                                                            }, daysActive);
                if emailError is error {
                    log:printError("Failed to send long-running visit reminder email", emailError, id = visit.id);
                } else {
                    log:printInfo("Long-running visit reminder email sent successfully", id = visit.id);
                }
            }
        }
    }

    log:printInfo("Scheduler run completed : " + today);
}
