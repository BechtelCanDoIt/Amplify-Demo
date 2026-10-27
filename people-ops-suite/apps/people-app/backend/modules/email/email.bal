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

# Send an email alert via the email service.
#
# + payload - Payload for the email service
# + return - Response from the email service
public isolated function sendEmail(EmailPayload payload) returns error? {
    http:Response|http:ClientError response = emailClient->/send\-email.post(payload);
    if response is http:ClientError {
        string customError = string `Client Error occurred while sending the email !`;
        log:printError(customError, response);
        return error(customError);
    }
    if response.statusCode != http:STATUS_OK {
        string customError = string `Error occurred while sending the email !`;
        log:printError(string `${customError} - HTTP ${response.statusCode}`);
        return error(customError);
    }
    log:printInfo(string `Email sent successfully to ${payload.to.toString()}`);
}

# Send a notification email when Asgardeo group assignment fails during employee onboarding.
# Throws an error if the email notification fails to send.
#
# + employeeId - The unique identifier of the created employee
# + firstName - First name of the employee
# + lastName - Last name of the employee
# + workEmail - Work email address of the employee
# + failedGroups - List of group names that failed to be assigned
# + return - Error if email notification fails to send
public isolated function notifyGroupAssignmentFailure(string employeeId, string firstName, string lastName,
        string workEmail, string[] failedGroups) returns error? {

    string failedGroupsList = string:'join("",
    ...from string group in failedGroups
       select string `<li>${htmlEscape(group)}</li>`);

    map<string> keyValues = {
        APP_NAME: appName,
        EMPLOYEE_NAME: string `${firstName} ${lastName}`,
        EMPLOYEE_EMAIL: workEmail,
        EMPLOYEE_ID: employeeId,
        FAILED_GROUPS: failedGroupsList,
        YEAR: time:utcToCivil(time:utcNow()).year.toString()
    };

    string|error boundTemplate = bindKeyValues(groupAssignmentFailureTemplate, keyValues);
    if boundTemplate is error {
        log:printError("Failed to bind email template for group assignment failure notification",
                boundTemplate, employeeId = employeeId, workEmail = workEmail);
        return boundTemplate;
    }

    EmailPayload emailPayload = {
        to: emailServiceConfig.to,
        'from: emailServiceConfig.'from,
        subject: string `Employee Onboarding Alert: Group Assignment Failure for ${firstName} ${lastName}`,
        template: boundTemplate
    };

    error? emailResult = sendEmail(emailPayload);
    if emailResult is error {
        log:printError("Failed to send group assignment failure notification email",
                emailResult, employeeId = employeeId, workEmail = workEmail);
        return emailResult;
    }
}
