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
import ballerina/http;
import ballerina/log;
import ballerina/time;

public configurable string fromEmailAddress = ?;
public configurable string[] adminEmailList = ?;

# Sends a reminder email to the admin/reception group for a visit whose
# scheduled departure time has passed without being marked as complete.
#
# + visit - Details of the visit
# + daysOverdue - Human-readable overdue duration, e.g. "today", "1 day ago", "3 days ago"
# + return - An error if sending fails
public function sendDepartureOverdueReminderEmail(CompletedVisitInfo visit, string daysOverdue) returns error? {
    string template = check bindKeyValues(
            departureOverdueTemplate,
            {
                "VISIT_ID": visit.id.toString(),
                "VISITOR_NAME": visit.visitorName,
                "COMPANY": visit.companyName ?: "N/A",
                "VISIT_DATE": visit.visitDate,
                "TIME_OF_ENTRY": visit.timeOfEntry ?: "N/A",
                "TIME_OF_DEPARTURE": visit.timeOfDeparture ?: "N/A",
                "WHOM_THEY_MEET": visit.whomTheyMeet ?: "N/A",
                "PASS_NUMBER": visit.passNumber ?: "N/A",
                "PURPOSE_OF_VISIT": visit.purposeOfVisit ?: "N/A",
                "DAYS_OVERDUE": daysOverdue,
                "YEAR": time:utcToCivil(time:utcNow()).year.toString()
            });
    return sendEmail(DEPARTURE_OVERDUE_SUBJECT, template, visit.id);
}

# Sends a reminder email to the admin/reception group for a visit that has
# been active for more than 2 days with no departure recorded.
#
# + visit - Details of the visit
# + daysActive - Human-readable active duration, e.g. "2 days", "3 days"
# + return - An error if sending fails
public function sendLongRunningVisitReminderEmail(CompletedVisitInfo visit, string daysActive) returns error? {
    string template = check bindKeyValues(
            longRunningVisitTemplate,
            {
                "VISIT_ID": visit.id.toString(),
                "VISITOR_NAME": visit.visitorName,
                "COMPANY": visit.companyName ?: "N/A",
                "VISIT_DATE": visit.visitDate,
                "TIME_OF_ENTRY": visit.timeOfEntry ?: "N/A",
                "WHOM_THEY_MEET": visit.whomTheyMeet ?: "N/A",
                "PASS_NUMBER": visit.passNumber ?: "N/A",
                "PURPOSE_OF_VISIT": visit.purposeOfVisit ?: "N/A",
                "DAYS_ACTIVE": daysActive,
                "YEAR": time:utcToCivil(time:utcNow()).year.toString()
            });
    return sendEmail(LONG_RUNNING_VISIT_SUBJECT, template, visit.id);
}

isolated function sendEmail(string subject, string template, int visitId) returns error? {
    http:Response response = check emailClient->/send\-email.post(<EmailPayload>{
        to: adminEmailList,
        'from: fromEmailAddress,
        subject: subject,
        template: template
    });

    if response.statusCode != http:STATUS_OK {
        string msg = string `Email service rejected email for visit ${visitId}, status: ${response.statusCode}`;
        log:printError(msg);
        return error(msg);
    }
}
