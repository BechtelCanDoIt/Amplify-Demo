// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import leave_service.authorization;
import leave_service.calendar_events;
import leave_service.database;
import leave_service.email;
import leave_service.employee;

import ballerina/http;
import ballerina/log;
import ballerina/lang.value;
import ballerina/time;

@display {
    label: "Leave Backend Service",
    id: "people-ops/leave-application"
}

service http:InterceptableService / on new http:Listener(9090) {

    # Request interceptor.
    # + return - authorization:JwtInterceptor
    public function createInterceptors() returns http:Interceptor[] => [new authorization:JwtInterceptor()];

    function init() returns error? => log:printInfo("Leave application backend service started.");

    # Get user info with privileges.
    #
    # + ctx - HTTP request context
    # + return - User Info payload or Internal Server Error
    resource function get user\-info(http:RequestContext ctx) returns UserInfo|http:InternalServerError {
        do {
            readonly & authorization:CustomJwtPayload userInfo = check ctx.getWithType(authorization:HEADER_USER_INFO);
            employee:Employee empInfo = check employee:getEmployee(userInfo.email);

            // Fetch the user's privileges based on the roles.
            int[] privileges = [];
            if authorization:checkPermissions(authorization:authorizedRoles.employeeRoles, userInfo.groups) {
                privileges.push(authorization:EMPLOYEE_PRIVILEGE);
            }
            if authorization:checkPermissions(authorization:authorizedRoles.internRoles, userInfo.groups) {
                privileges.push(authorization:INTERN_PRIVILEGE);
            }
            boolean isPeopleOpsTeamMember = authorization:checkPermissions(
                    authorization:authorizedRoles.peopleOpsTeamRoles, userInfo.groups);
            if isPeopleOpsTeamMember {
                privileges.push(authorization:PEOPLE_OPS_TEAM_PRIVILEGE);
            }
            // People Ops keep both org-wide reports; the report roles grant them independently.
            if isPeopleOpsTeamMember ||
                authorization:hasAnyRole(authorization:authorizedRoles.generalReportRoles, userInfo.groups) {
                privileges.push(authorization:GENERAL_REPORT_PRIVILEGE);
            }
            if isPeopleOpsTeamMember ||
                authorization:hasAnyRole(authorization:authorizedRoles.sabbaticalReportRoles, userInfo.groups) {
                privileges.push(authorization:SABBATICAL_REPORT_PRIVILEGE);
            }
            employee:Employee[]|error subordinates = employee:getEmployees(
                    {
                        status: ["Active"],
                        leadEmail: empInfo.workEmail
                    });
            if subordinates is error {
                string errorMsg = "Error occurred while fetching employee subordinates. Lead privilege will not be" +
                " assigned";
                log:printError(errorMsg, subordinates);
                return <http:InternalServerError>{
                    body: {
                        message: errorMsg
                    }
                };
            }
            if (subordinates.length() > 0) {
                privileges.push(authorization:LEAD_PRIVILEGE);
            }
            UserInfo userInfoResponse = {
                employeeId: empInfo.employeeId,
                firstName: empInfo.firstName,
                lastName: empInfo.lastName,
                workEmail: empInfo.workEmail,
                leadEmail: empInfo.leadEmail,
                employeeThumbnail: empInfo.employeeThumbnail,
                jobRole: empInfo.jobRole,
                privileges: privileges,
                isLead: empInfo.lead,
                employmentStartDate: empInfo.continuousServiceDate ?: empInfo.startDate,
                subordinateCount: subordinates.length(),
                location: empInfo.location,
                jobBand: empInfo.jobBand
            };

            return userInfoResponse;

        } on fail error internalErr {
            string errMsg = "Error occurred while fetching user info";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Get application configurations.
    #
    # + return - Application configurations or Internal Server Error
    resource function get app\-configs(http:RequestContext ctx)
        returns AppConfig|http:InternalServerError|http:Unauthorized {

        readonly & authorization:CustomJwtPayload|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if userInfo is error {
            string errMsg = "Error occurred while decoding user info from token";
            log:printError(errMsg, userInfo);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
        if !authorization:checkPermissions(authorization:authorizedRoles.employeeRoles, userInfo.groups) {
            string errMsg = "Only employees are allowed to access application configurations.";
            return <http:Unauthorized>{
                body: {
                    message: errMsg
                }
            };
        }
        employee:Employee|error empInfo = employee:getEmployee(userInfo.email);
        if empInfo is error {
            string errMsg = "Error occurred while fetching employee info";
            log:printError(errMsg, empInfo);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
        // Add optional mails for the form
        employee:DefaultMail[]|error optionalMailsToNotify = getOptionalMailsToNotify(userInfo.email);
        if optionalMailsToNotify is error {
            string errorMsg = "Error occurred while fetching optional mails to notify";
            log:printError(errorMsg, optionalMailsToNotify);
        }
        employee:DefaultMail[] mandatoryMails = [{email: emailGroupToNotify, thumbnail: ""}];
        if empInfo.leadEmail is string {
            employee:Employee & readonly|error empLead = employee:getEmployee(empInfo.leadEmail);
            if empLead is error {
                string errorMsg = "Error occurred while fetching employee lead info";
                log:printError(errorMsg, empLead);
                return <http:InternalServerError>{
                    body: {
                        message: errorMsg
                    }
                };
            }
            mandatoryMails = [
                {email: empLead.workEmail, thumbnail: empLead.employeeThumbnail ?: ""},
                {email: emailGroupToNotify, thumbnail: ""}
            ];
        }
        employee:DefaultMailResponse cachedEmails = {
            mandatoryMails,
            optionalMails: optionalMailsToNotify is employee:DefaultMail[] ? optionalMailsToNotify : []
        };

        return {
            isSabbaticalLeaveEnabled,
            sabbaticalLeavePolicyUrl,
            sabbaticalLeaveUserGuideUrl,
            sabbaticalLeaveEligibilityDuration,
            sabbaticalLeaveMaxApplicationDuration,
            sabbaticalLeaveMinJobBand,
            cachedEmails,
            onBehalfAllowedLeaveTypes
        };
    }

    # Get leaves for the given filters.
    #
    # + ctx - HTTP request context
    # + email - Email of the user to filter the leaves
    # + startDate - Start date filter
    # + endDate - End date filter
    # + approverEmail - Approver email to filter the leaves
    # + statuses - Statuses to filter the leaves
    # + subordinatesLeaves - Whether to fetch the leaves of subordinates of the user.
    # + excludedLeaveCategory - Leave types to leave out
    # + return - List of leaves
    resource function get leaves(http:RequestContext ctx, string? email = (), string? startDate = (),
            string? endDate = (), string? approverEmail = (), database:LeaveType[]? leaveCategory = (),
            Status[] statuses = [], int? 'limit = (), int? offset = 0, database:OrderBy? orderBy = database:ASC,
            EmployeeStatus[]? employeeStatuses = (), boolean subordinatesLeaves = false,
            database:LeaveType[]? excludedLeaveCategory = ()
    ) returns FetchedLeavesRecord|http:Forbidden|http:InternalServerError|http:BadRequest {

        if email is string && !email.matches(WSO2_EMAIL_PATTERN) {
            return <http:BadRequest>{
                body: {
                    message: string `${ERR_MSG_INVALID_WSO2_EMAIL} ${email}`
                }
            };
        }

        readonly & authorization:CustomJwtPayload|error userInfoResult = ctx.getWithType(authorization:HEADER_USER_INFO);
        if userInfoResult is error {
            string errMsg = "Error occurred while decoding user info from token";
            log:printError(errMsg, userInfoResult);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
        readonly & authorization:CustomJwtPayload userInfo = userInfoResult;

        boolean validateForSingleRole = authorization:validateForSingleRole(userInfo,
                authorization:authorizedRoles.employeeRoles);
        if !validateForSingleRole {
            log:printWarn(string `The user ${userInfo.email} was not privileged to access the resource
                    /leaves with email=${email.toString()}`);
            return <http:Forbidden>{
                body: {
                    message: ERR_MSG_UNAUTHORIZED_VIEW_LEAVE
                }
            };
        }

        boolean isPeopleOpsTeamMember = authorization:checkPermissions(
                authorization:authorizedRoles.peopleOpsTeamRoles, userInfo.groups);
        boolean isCrossEmployeeRead = !subordinatesLeaves && (
            (email is string && email != userInfo.email) || (email is () && approverEmail is ()) ||
            (approverEmail is string && approverEmail != userInfo.email)
        );
        string[] excludedLeaveTypes = excludedLeaveCategory ?: [];
        // Outside People Ops, leaves of all employees are only readable through the report roles: the sabbatical
        // report role for sabbatical-only queries, and the general report role for everything else.
        if isCrossEmployeeRead && !isPeopleOpsTeamMember {
            boolean canReadSabbaticals = authorization:hasAnyRole(
                    authorization:authorizedRoles.sabbaticalReportRoles, userInfo.groups);
            boolean isSabbaticalOnlyQuery = leaveCategory is database:LeaveType[] && leaveCategory.length() > 0 &&
                leaveCategory.every(category => category == database:SABBATICAL_LEAVE);
            boolean isAllowed = isSabbaticalOnlyQuery
                ? canReadSabbaticals
                : authorization:hasAnyRole(authorization:authorizedRoles.generalReportRoles, userInfo.groups);
            if !isAllowed {
                return <http:Forbidden>{
                    body: {
                        message: ERR_MSG_UNAUTHORIZED_VIEW_LEAVE
                    }
                };
            }
            // The general report role does not reach sabbatical leaves.
            if !isSabbaticalOnlyQuery && !canReadSabbaticals {
                excludedLeaveTypes.push(database:SABBATICAL_LEAVE);
            }
        }

        string[]? emails;
        string? effectiveApproverEmail = approverEmail;
        EmployeeStatus[]? effectiveStatuses = employeeStatuses is EmployeeStatus[] && employeeStatuses.length() > 0
            ? employeeStatuses
            : ();

        if subordinatesLeaves {
            // Resolve subordinate emails from the HR system using the logged-in user as manager
            employee:Employee[]|error subordinates = employee:getEmployees({
                                                                               status: effectiveStatuses,
                                                                               leadEmail: userInfo.email
                                                                           });
            if subordinates is error {
                log:printError(ERR_MSG_LEAVES_RETRIEVAL_FAILED, subordinates);
                return <http:InternalServerError>{
                    body: {
                        message: ERR_MSG_LEAVES_RETRIEVAL_FAILED
                    }
                };
            }
            string[] subordinateEmails = from employee:Employee emp in subordinates
                select emp.workEmail;
            emails = email is string
                ? (from string e in subordinateEmails
                    where e == email
                    select e)
                : subordinateEmails;
            effectiveApproverEmail = ();
        } else if effectiveStatuses is EmployeeStatus[] {
            employee:Employee[]|error filteredEmployees = employee:getEmployees({
                                                                                    status: effectiveStatuses,
                                                                                    leadEmail: approverEmail
                                                                                });
            if filteredEmployees is error {
                log:printError(ERR_MSG_LEAVES_RETRIEVAL_FAILED, filteredEmployees);
                return <http:InternalServerError>{
                    body: {
                        message: ERR_MSG_LEAVES_RETRIEVAL_FAILED
                    }
                };
            }
            string[] filteredEmails = from employee:Employee emp in filteredEmployees
                select emp.workEmail;
            emails = email is string
                ? (from string e in filteredEmails
                    where e == email
                    select e)
                : filteredEmails;
            effectiveApproverEmail = ();
        } else {
            emails = (email is string) ? [email] : ();
        }

        database:Leave[]|error leaves = database:getLeaves({
                                                               emails,
                                                               statuses,
                                                               startDate,
                                                               endDate,
                                                               approverEmail: effectiveApproverEmail,
                                                               leaveTypes: leaveCategory,
                                                               excludedLeaveTypes,
                                                               orderBy: orderBy
                                                           }, 'limit);
        if leaves is error {
            log:printError(ERR_MSG_LEAVES_RETRIEVAL_FAILED, leaves);
            return <http:InternalServerError>{
                body: {
                    message: ERR_MSG_LEAVES_RETRIEVAL_FAILED
                }
            };
        }

        // Clip first element: if the leave starts before the given startDate,
        // recalculate numberOfDays from startDate to the leave's endDate.
        if startDate is string && leaves.length() > 0 {
            database:Leave firstLeave = leaves[0];
            if firstLeave.periodType != database:HALF_DAY_LEAVE &&
                firstLeave.startDate.substring(0, 10) < startDate.substring(0, 10) {
                time:Utc|error rangeStart = getUtcDateFromString(startDate);
                time:Utc|error leaveEnd = getUtcDateFromString(firstLeave.endDate);
                if rangeStart is time:Utc && leaveEnd is time:Utc {
                    database:Day[] weekdays = getWeekdaysFromRange(rangeStart, leaveEnd);
                    database:Holiday[]|error holidays = calendar_events:getHolidaysForCountry(
                            firstLeave.location ?: "", startDate, firstLeave.endDate);
                    if holidays is error {
                        string errMsg = "Error occurred while fetching holidays for calendar event";
                        log:printError(errMsg, holidays);
                        return <http:InternalServerError>{
                            body: {
                                message: errMsg
                            }
                        };
                    }
                    weekdays = getWorkingDaysAfterHolidays(weekdays, holidays);
                    leaves[0].numberOfDays = <float>weekdays.length();
                    leaves[0].startDate = startDate;
                }
            }
        }

        // Clip last element: if the leave ends after the given endDate,
        // recalculate numberOfDays from the leave's startDate to endDate.
        if endDate is string && leaves.length() > 0 {
            int lastIdx = leaves.length() - 1;
            database:Leave lastLeave = leaves[lastIdx];
            if lastLeave.periodType != database:HALF_DAY_LEAVE &&
                lastLeave.endDate.substring(0, 10) > endDate.substring(0, 10) {
                time:Utc|error leaveStart = getUtcDateFromString(lastLeave.startDate);
                time:Utc|error rangeEnd = getUtcDateFromString(endDate);
                if leaveStart is time:Utc && rangeEnd is time:Utc {
                    database:Day[] weekdays = getWeekdaysFromRange(leaveStart, rangeEnd);
                    database:Holiday[]|error holidays = calendar_events:getHolidaysForCountry(
                            lastLeave.location ?: "", lastLeave.startDate, endDate);
                    if holidays is error {
                        string errMsg = "Error occurred while fetching holidays for calendar event";
                        log:printError(errMsg, holidays);
                        return <http:InternalServerError>{
                            body: {
                                message: errMsg
                            }
                        };
                    }
                    weekdays = getWorkingDaysAfterHolidays(weekdays, holidays);
                    leaves[lastIdx].numberOfDays = <float>weekdays.length();
                    leaves[lastIdx].endDate = endDate;
                }
            }
        }

        return {leaves};
    }

    # Create a new leave.
    #
    # + ctx - HTTP request context
    # + payload - Request payload
    # + isValidationOnlyMode - Whether to validate the leave or create the leave
    # + return - Success response if the leave is created successfully, otherwise an error response
    resource function post leaves(http:RequestContext ctx, LeavePayload payload, boolean isValidationOnlyMode = false)
        returns CalculatedLeave|http:Ok|http:BadRequest|http:Unauthorized|http:Forbidden|http:InternalServerError {

        do {
            readonly & authorization:CustomJwtPayload userInfo = check ctx.getWithType(authorization:HEADER_USER_INFO);
            string jwt = check ctx.getWithType(authorization:INVOKER_TOKEN);
            string email = userInfo.email;
            if !authorization:checkPermissions(authorization:authorizedRoles.employeeRoles, userInfo.groups) {
                return <http:Unauthorized>{
                    body: {
                        message: "You are not authorized to access this resource."
                    }
                };
            }
            // Custom logic for sabbatical leave application
            if payload.leaveType == database:SABBATICAL_LEAVE {
                if authorization:checkPermissions(authorization:authorizedRoles.internRoles, userInfo.groups) {
                    return <http:Unauthorized>{
                        body: {
                            message: "Interns are not allowed to apply for sabbatical leave."
                        }
                    };
                }
                Employee & readonly|error employeeDetails = employee:getEmployee(email);
                if employeeDetails is error {
                    string errMsg = "Error occurred while fetching employee details";
                    log:printError(errMsg, employeeDetails);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                // Only employees in the minimum job band and above are eligible
                int? jobBand = employeeDetails.jobBand;
                if jobBand is () {
                    return <http:Forbidden>{
                        body: {
                            message: "Your job band is not recorded. Please contact People Operations to apply " +
                            "for sabbatical leave."
                        }
                    };
                }
                if jobBand < sabbaticalLeaveMinJobBand {
                    return <http:Forbidden>{
                        body: {
                            message: string `Sabbatical leave is available for job band ${
                                sabbaticalLeaveMinJobBand} and above.`
                        }
                    };
                }
                string?|error lastSabbaticalLeaveEndDate = database:getLastSabbaticalLeaveEndDate(email);
                if lastSabbaticalLeaveEndDate is error {
                    string errMsg = "Error occurred while fetching last sabbatical leave end date";
                    log:printError(errMsg, lastSabbaticalLeaveEndDate);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }

                string? employmentStartDate = employeeDetails.continuousServiceDate ?: employeeDetails.startDate;
                if employmentStartDate is () {
                    string errMsg = "Employee employment start date not found.";
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }

                // User can apply only if he is within the eligibility period
                boolean|error isEligible = checkEligibilityForSabbaticalApplication(employmentStartDate,
                        lastSabbaticalLeaveEndDate, payload.startDate);
                if isEligible is error {
                    string errMsg = "Error occurred while checking eligibility for sabbatical leave application";
                    log:printError(errMsg, isEligible);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                if !isEligible {
                    return <http:Forbidden>{
                        body: {
                            message: "Employee is not eligible to apply for sabbatical leave."
                        }
                    };
                }
                int|error differenceInDays = getDateDiffInDays(payload.endDate, payload.startDate);
                if differenceInDays is error {
                    string errMsg = "Error occurred while calculating sabbatical leave duration";
                    log:printError(errMsg, differenceInDays);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                // Sabbatical leave duration cannot exceed the maximum allowed duration
                if (differenceInDays > sabbaticalLeaveMaxApplicationDuration) {
                    string errMsg = string `Sabbatical leave duration cannot exceed 
                    ${sabbaticalLeaveMaxApplicationDuration / 7} weeks (${sabbaticalLeaveMaxApplicationDuration} days).`;
                    return <http:BadRequest>{
                        body: {
                            message: errMsg
                        }
                    };
                }

                string? leadMail = employeeDetails.leadEmail;
                if leadMail is () {
                    string errMsg = "A reporting lead is required to apply for sabbatical leave.";
                    log:printWarn(errMsg);
                    return <http:BadRequest>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                string? location = employeeDetails.location;
                if location is () {
                    string errMsg = "Employee location not found.";
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }

                error? response = processSabbaticalLeaveRequest({
                                                                    action: APPLY,
                                                                    applicantEmail: email,
                                                                    approverEmail: leadMail,
                                                                    leaveStartDate: payload.startDate,
                                                                    leaveEndDate: payload.endDate,
                                                                    location,
                                                                    comment: payload.comment,
                                                                    numberOfDays: <float>differenceInDays
                                                                });

                if response is error {
                    string errMsg = "Error occurred while processing sabbatical leave application request";
                    log:printError(errMsg, response);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                return <http:Ok>{
                    body: {
                        message: "Sabbatical leave application submitted successfully"
                    }
                };
            }

            [time:Utc, time:Utc]|error validatedDateRange = validateDateRange(payload.startDate, payload.endDate);
            if validatedDateRange is error {
                log:printError(ERR_MSG_INVALID_DATE_FORMAT, validatedDateRange);
                return <http:BadRequest>{
                    body: {
                        message: ERR_MSG_INVALID_DATE_FORMAT
                    }
                };
            }
            // Day[] weekdaysFromRange = getWeekdaysFromRange(validatedDateRange[0], validatedDateRange[1]);
            LeaveInput input = {
                email,
                startDate: payload.startDate,
                endDate: payload.endDate,
                leaveType: payload.leaveType,
                periodType: payload.periodType,
                isMorningLeave: payload.isMorningLeave,
                emailRecipients: payload.emailRecipients,
                calendarEventId: payload.calendarEventId,
                comment: payload.comment,
                isPublicComment: payload.isPublicComment,
                emailSubject: payload.emailSubject,
                status: APPROVED
            };
            if isValidationOnlyMode {
                LeaveDetails|error validatedLeave = insertLeaveToDatabase(input, isValidationOnlyMode, jwt);
                if validatedLeave is error {
                    fail error(validatedLeave.message(), validatedLeave);
                }

                return {
                    workingDays: payload.periodType is database:HALF_DAY_LEAVE
                        ? 0.5
                        : <float>validatedLeave.effectiveDays.length(),
                    hasOverlap: false,
                    message: "Valid leave request"
                };
            }

            final readonly & email:EmailNotificationDetails emailContentForLeave = check email:generateContentForLeave(
                        jwt, email, payload
                );
            final readonly & string calendarEventId = createUuidForCalendarEvent();
            final readonly & string[]|error allRecipientsForUser = getAllEmailRecipientsForUser(
                        email,
                    payload.emailRecipients,
                    jwt
                );
            if allRecipientsForUser is error {
                fail error(allRecipientsForUser.message(), allRecipientsForUser);
            }
            final readonly & string? comment = payload.comment;

            payload.emailSubject = emailContentForLeave.subject;
            payload.calendarEventId = calendarEventId;
            input.emailSubject = emailContentForLeave.subject;
            input.calendarEventId = calendarEventId;
            input.emailRecipients = allRecipientsForUser;

            LeaveDetails|error leave = insertLeaveToDatabase(input, isValidationOnlyMode, jwt);
            if leave is error {
                fail error(leave.message(), leave);
            }
            final readonly & LeaveResponse leaveResponse = {
                id: leave.id,
                startDate: leave.startDate,
                calendarEventId: leave.calendarEventId,
                periodType: leave.periodType,
                createdDate: leave.createdDate,
                leaveType: leave.leaveType,
                endDate: leave.endDate,
                location: leave.location,
                numberOfDays: leave.numberOfDays ?: 0.0,
                status: <Status>leave.status,
                email: leave.email,
                isMorningLeave: leave.isMorningLeave
            };

            future<error?> notificationFuture = start email:sendLeaveNotification(
                        emailContentForLeave,
                    allRecipientsForUser
                );
            _ = start createLeaveEventInCalendar(email, leaveResponse, calendarEventId);
            if comment is string && !checkIfEmptyString(comment) {
                string[] commentRecipients = allRecipientsForUser;
                if !payload.isPublicComment {
                    commentRecipients = check getPrivateRecipientsForUser(
                                email,
                            payload.emailRecipients,
                            jwt
                        );
                }

                error? notificationResult = wait notificationFuture;
                if notificationResult is () {
                    // Does not send the additional comment notification if the main notification has failed
                    final email:EmailNotificationDetails contentForAdditionalComment =
                        email:generateContentForAdditionalComment(emailContentForLeave.subject, comment);
                    _ = start email:sendAdditionalComment(contentForAdditionalComment.cloneReadOnly(),
                            commentRecipients.cloneReadOnly());
                }
            }
            return <http:Ok>{
                body: {
                    message: "Leave submitted successfully"
                }
            };

        } on fail error internalErr {
            string errMsg = "Error occurred while submitting a leave";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Record leave on behalf of an employee.
    #
    # For leave an employee cannot request themselves (no-pay today; the
    # allowlist is configurable). Everything downstream of the applicant email -
    # day calculation, overlap check, recipients, notification, calendar event -
    # is the same code path a self-service submission takes, so the employee and
    # the leave group see an identical notification.
    #
    # + ctx - Request context
    # + payload - Request payload
    # + isValidationOnlyMode - Whether to validate the leave or record it
    # + return - Success response if recorded, otherwise an error response
    resource function post leaves/on\-behalf(http:RequestContext ctx, OnBehalfLeavePayload payload,
            boolean isValidationOnlyMode = false)
        returns CalculatedLeave|http:Ok|http:BadRequest|http:Unauthorized|http:Forbidden|http:InternalServerError {

        do {
            readonly & authorization:CustomJwtPayload userInfo = check ctx.getWithType(authorization:HEADER_USER_INFO);
            string jwt = check ctx.getWithType(authorization:INVOKER_TOKEN);
            if !authorization:checkPermissions(authorization:authorizedRoles.peopleOpsTeamRoles, userInfo.groups) {
                return <http:Forbidden>{
                    body: {
                        message: "Only the People Operations team can record leave on behalf of an employee."
                    }
                };
            }

            final string recordedBy = userInfo.email;
            final string employeeEmail = payload.employeeEmail;
            if !employeeEmail.matches(WSO2_EMAIL_PATTERN) {
                return <http:BadRequest>{
                    body: {
                        message: string `${ERR_MSG_INVALID_WSO2_EMAIL} ${employeeEmail}`
                    }
                };
            }

            if onBehalfAllowedLeaveTypes.indexOf(payload.leaveType) is () {
                return <http:BadRequest>{
                    body: {
                        message: string `'${payload.leaveType}' cannot be recorded on behalf of an employee. ` +
                            string `Allowed: ${string:'join(", ", ...onBehalfAllowedLeaveTypes)}.`
                    }
                };
            }

            // Half days are not recordable on this path. getEffectiveLeaveDaysFromLeave
            // stamps the period type onto EVERY working day in the range
            // (utils.bal:207-215), so a half day spanning more than one date would
            // store 0.5 against each of them. None of the allowed leave types is
            // taken as a half day, so this is rejected rather than guarded.
            if payload.periodType is database:HALF_DAY_LEAVE {
                return <http:BadRequest>{
                    body: {
                        message: "Half day leave cannot be recorded on behalf of an employee."
                    }
                };
            }

            [time:Utc, time:Utc]|error validatedDateRange = validateDateRange(payload.startDate, payload.endDate);
            if validatedDateRange is error {
                log:printError(ERR_MSG_INVALID_DATE_FORMAT, validatedDateRange);
                return <http:BadRequest>{
                    body: {
                        message: ERR_MSG_INVALID_DATE_FORMAT
                    }
                };
            }

            // The app derives period type from the INCLUSIVE CALENDAR SPAN, not
            // the working-day count (GeneralLeave.tsx:196 via
            // LeaveDateSelection.tsx:62). Derived here so any client gets it
            // right. Compared on the NORMALISED dates: validateDateRange accepts
            // both `2026-01-05` and `2026-01-05T00:00:00Z`, so the same day sent
            // in two accepted formats is not equal as raw strings.
            database:LeavePeriodType derivedPeriodType = validatedDateRange[0] == validatedDateRange[1]
                ? database:ONE_DAY_LEAVE
                : database:MULTIPLE_DAYS_LEAVE;

            // Backdating is expected: this records leave that has already been taken.
            database:LeaveInput input = {
                email: employeeEmail,
                startDate: payload.startDate,
                endDate: payload.endDate,
                leaveType: payload.leaveType,
                periodType: derivedPeriodType,
                // Only meaningful for a half day, which is rejected above.
                isMorningLeave: (),
                emailRecipients: payload.emailRecipients,
                calendarEventId: payload.calendarEventId,
                comment: payload.comment,
                isPublicComment: payload.isPublicComment,
                emailSubject: payload.emailSubject,
                approverEmail: recordedBy,
                status: APPROVED
            };

            // calculateLeaveDetails signals a multi-day overlap by RETURNING AN
            // ERROR carrying `workingDays` (leave_calculation.bal:86-90), and
            // only returns LeaveDetails[] for the half-day partial-overlap case.
            // Both are validation outcomes to report, not server faults, so the
            // check is done here rather than relying on insertLeaveToDatabase.
            LeaveDetails[]|error? overlapCheck = calculateLeaveDetails(input, jwt);
            boolean hasOverlap = false;
            boolean isRecordable = true;
            float calculatedDays = 0.0;
            string validationMessage = "Valid leave request";

            if overlapCheck is error {
                string overlapMessage = overlapCheck.message();
                value:Cloneable & readonly reportedDays = overlapCheck.detail()["workingDays"];
                if overlapMessage == ERR_MSG_LEAVE_OVERLAPS_WITH_EXISTING_LEAVE {
                    hasOverlap = true;
                    isRecordable = false;
                    calculatedDays = reportedDays is float ? reportedDays : 0.0;
                    validationMessage = overlapMessage;
                } else if overlapMessage == ERR_MSG_LEAVE_SHOULD_BE_AT_LEAST_ONE_WORKING_DAY
                        || overlapMessage == ERR_MSG_LEAVE_SHOULD_BE_AT_LEAST_ONE_WEEKDAY {
                    // A range that is all weekend, or entirely public holidays.
                    isRecordable = false;
                    validationMessage = overlapMessage;
                } else {
                    fail error(overlapMessage, overlapCheck);
                }
            } else if overlapCheck is LeaveDetails[] {
                hasOverlap = true;
                isRecordable = false;
                validationMessage = ERR_MSG_LEAVE_OVERLAPS_WITH_EXISTING_LEAVE;
            }

            if isRecordable {
                LeaveDay[]|error effectiveDays = getEffectiveLeaveDaysFromLeave(input, jwt);
                if effectiveDays is error {
                    fail error(effectiveDays.message(), effectiveDays);
                }
                calculatedDays = getNumberOfDaysFromLeaveDays(effectiveDays);
            }

            if isValidationOnlyMode {
                return {
                    workingDays: calculatedDays,
                    hasOverlap: hasOverlap,
                    message: validationMessage
                };
            }

            if !isRecordable {
                return <http:BadRequest>{
                    body: {
                        message: validationMessage
                    }
                };
            }

            // The email module takes a self-service leave payload; drop the
            // employeeEmail field so the notification is generated by exactly
            // the same code path a self-submitted leave uses.
            LeavePayload leavePayload = {
                startDate: payload.startDate,
                endDate: payload.endDate,
                isMorningLeave: (),
                periodType: derivedPeriodType,
                leaveType: payload.leaveType,
                emailRecipients: payload.emailRecipients,
                calendarEventId: payload.calendarEventId,
                comment: payload.comment,
                isPublicComment: payload.isPublicComment,
                emailSubject: payload.emailSubject
            };

            final readonly & email:EmailNotificationDetails emailContentForLeave = check email:generateContentForLeave(
                        jwt, employeeEmail, leavePayload
                );
            final readonly & string calendarEventId = createUuidForCalendarEvent();
            final readonly & string[]|error allRecipientsForUser = getAllEmailRecipientsForUser(
                        employeeEmail,
                    payload.emailRecipients,
                    jwt
                );
            if allRecipientsForUser is error {
                fail error(allRecipientsForUser.message(), allRecipientsForUser);
            }
            final readonly & string? comment = payload.comment;

            leavePayload.emailSubject = emailContentForLeave.subject;
            leavePayload.calendarEventId = calendarEventId;
            input.emailSubject = emailContentForLeave.subject;
            input.calendarEventId = calendarEventId;
            input.emailRecipients = allRecipientsForUser;

            LeaveDetails|error leave = insertLeaveToDatabase(input, isValidationOnlyMode, jwt);
            if leave is error {
                fail error(leave.message(), leave);
            }
            final readonly & LeaveResponse leaveResponse = {
                id: leave.id,
                startDate: leave.startDate,
                calendarEventId: leave.calendarEventId,
                periodType: leave.periodType,
                createdDate: leave.createdDate,
                leaveType: leave.leaveType,
                endDate: leave.endDate,
                location: leave.location,
                numberOfDays: leave.numberOfDays ?: 0.0,
                status: <Status>leave.status,
                email: leave.email,
                isMorningLeave: leave.isMorningLeave
            };

            log:printInfo(string `Leave ${leave.id} of type '${payload.leaveType}' recorded for ` +
                    string `${employeeEmail} by ${recordedBy}.`);

            future<error?> notificationFuture = start email:sendLeaveNotification(
                        emailContentForLeave,
                    allRecipientsForUser
                );
            _ = start createLeaveEventInCalendar(employeeEmail, leaveResponse, calendarEventId);
            if comment is string && !checkIfEmptyString(comment) {
                string[] commentRecipients = allRecipientsForUser;
                if !payload.isPublicComment {
                    commentRecipients = check getPrivateRecipientsForUser(
                                employeeEmail,
                            payload.emailRecipients,
                            jwt
                        );
                }

                error? notificationResult = wait notificationFuture;
                if notificationResult is () {
                    // Does not send the additional comment notification if the main notification has failed
                    final email:EmailNotificationDetails contentForAdditionalComment =
                        email:generateContentForAdditionalComment(emailContentForLeave.subject, comment);
                    _ = start email:sendAdditionalComment(contentForAdditionalComment.cloneReadOnly(),
                            commentRecipients.cloneReadOnly());
                }
            }
            return <http:Ok>{
                body: {
                    message: string `Leave recorded for ${employeeEmail}.`
                }
            };

        } on fail error internalErr {
            string errMsg = "Error occurred while recording leave on behalf of an employee";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Cancel a leave.
    #
    # + id - Leave ID
    # + ctx - Request context
    # + return - Cancelled leave on success, otherwise an error response
    resource function delete leaves/[int id](http:RequestContext ctx)
        returns http:Ok|http:Forbidden|http:BadRequest|http:InternalServerError {

        do {
            readonly & authorization:CustomJwtPayload userInfo = check ctx.getWithType(authorization:HEADER_USER_INFO);
            string jwt = check ctx.getWithType(authorization:INVOKER_TOKEN);
            final database:Leave|error? leave = database:getLeave(id);
            if leave is () {
                return <http:BadRequest>{
                    body: {
                        message: "Invalid leave ID!"
                    }
                };
            }
            if leave is error {
                fail error(ERR_MSG_LEAVE_RETRIEVAL_FAILED, leave);
            }

            LeaveResponse leaveResponse = check toLeaveEntity(leave, jwt);
            final string email = userInfo.email;
            if leaveResponse.email != email {
                boolean validateForSingleRole = authorization:validateForSingleRole(userInfo,
                        authorization:authorizedRoles.peopleOpsTeamRoles);
                if !validateForSingleRole {
                    return <http:Forbidden>{
                        body: {
                            message: "You are not authorized to cancel this leave!"
                        }
                    };
                }
            }
            if leaveResponse.status == CANCELLED {
                return <http:BadRequest>{
                    body: {
                        message: "Leave is already cancelled!"
                    }
                };
            }

            any|error result = database:cancelLeave(id);
            if result is error {
                fail error(result.message(), result);
            }
            database:Leave|error? cancelledLeave = database:getLeave(id);
            if cancelledLeave is error? {
                fail error("Error occurred when fetching cancelled leave!", cancelledLeave);
            }

            LeaveDetails|error cancelledLeaveDetails = getLeaveEntityFromDbRecord(cancelledLeave, jwt, true);
            if cancelledLeaveDetails is error {
                fail error(cancelledLeaveDetails.message(), cancelledLeaveDetails);
            }

            email:EmailNotificationDetails generateContentForLeave = check email:generateContentForLeave(
                    jwt,
                    email,
                    leaveResponse,
                    isCancel = true,
                    emailSubject = cancelledLeaveDetails.emailSubject
            );
            string[] allRecipientsForUser = check getAllEmailRecipientsForUser(
                    email,
                    cancelledLeaveDetails.emailRecipients,
                    jwt
            );
            if cancelledLeaveDetails.leaveType == database:SABBATICAL_LEAVE {
                string? approverEmail = cancelledLeaveDetails.approverEmail;
                // process cancellation for the sabbatical leaves
                if approverEmail is () {
                    string errMsg = string `Approver email is not available for leave with ID: ${id}.`;
                    log:printError(errMsg);
                    return <http:InternalServerError>{
                        body: {
                            message: errMsg
                        }
                    };
                }
                error? cancellationResult = processSabbaticalLeaveRequest({
                                                                              action: CANCEL,
                                                                              applicantEmail:
                                                                            cancelledLeaveDetails.email,
                                                                              approverEmail,
                                                                              leaveStartDate:
                                                                            cancelledLeaveDetails.
                                                                            startDate.substring(0, 10),
                                                                              leaveEndDate: cancelledLeaveDetails.
                                                                            endDate.substring(0, 10),
                                                                              leaveId: id
                                                                          });
                if cancellationResult is error {
                    log:printError("Failed to process sabbatical leave cancellation notification", cancellationResult);
                    return <http:InternalServerError>{
                        body: {
                            message: "Error occurred while cancelling sabbatical leave!"
                        }
                    };
                }
            } else {
                // Send email in the regular format for non-sabbatical leaves
                _ = start email:sendLeaveNotification(
                        generateContentForLeave.cloneReadOnly(),
                        allRecipientsForUser.cloneReadOnly()
                );
            }

            if cancelledLeaveDetails.calendarEventId is () {
                log:printError(string `Calendar event ID is not available for leave with ID: ${id}.`);
            } else {
                _ = start deleteLeaveEventFromCalendar(email, <string>cancelledLeaveDetails.calendarEventId);
            }

            return <http:Ok>{
                body: {
                    message: "Leave cancelled successfully"
                }
            };

        } on fail error internalErr {
            string errMsg = "Error occurred while deleting a leave request";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Fetch all the employees.
    #
    # + ctx - HTTP request context
    # + location - Employee location
    # + businessUnit - Employee business unit
    # + team - Employee team
    # + unit - Employee unit
    # + employeeStatuses - Employee statuses to filter the employees
    # + leadEmail - Manager email to filter the employees
    # + return - List of employee records
    resource function get employees(http:RequestContext ctx, string? location, string? businessUnit, string? team,
            string? unit, string[]? employeeStatuses, string? leadEmail)
            returns MinimalEmployeeInfo[]|http:InternalServerError {

        do {
            Employee[] employees = check employee:getEmployees(
                    {
                        location,
                        businessUnit,
                        team,
                        unit,
                        status: employeeStatuses,
                        leadEmail
                    }
            );

            MinimalEmployeeInfo[] employeesToReturn = from Employee employee in employees
                select {
                    firstName: employee.firstName ?: "",
                    lastName: employee.lastName ?: "",
                    workEmail: employee.workEmail,
                    employeeThumbnail: employee.employeeThumbnail ?: "",
                    employeeStatus: employee.employeeStatus
                };

            return employeesToReturn;

        } on fail error internalErr {
            string errMsg = "Error occurred while fetching employees";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Fetch an employee by email.
    #
    # + ctx - HTTP request context
    # + return - The employee record
    resource function get employees/[string email](http:RequestContext ctx)
        returns Employee|http:InternalServerError|http:BadRequest {

        if !email.matches(WSO2_EMAIL_PATTERN) {
            return <http:BadRequest>{
                body: {
                    message: string `${ERR_MSG_INVALID_WSO2_EMAIL} ${email}`
                }
            };
        }

        Employee|error employee = employee:getEmployee(email);

        if employee is error {
            string errMsg = "Error occurred while fetching employee!";
            log:printError(errMsg, employee);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }

        return employee;
    }

    # Fetch legally entitled leave for the given employee.
    #
    # + ctx - HTTP request context
    # + years - Years to fetch leave entitlement. Empty array will fetch leave entitlement for current year
    # + return - Leave entitlement
    resource function get employees/[string email]/leave\-entitlement(http:RequestContext ctx, int[]? years = ())
        returns LeaveEntitlement[]|http:BadRequest|http:Forbidden|http:InternalServerError {

        if !email.matches(WSO2_EMAIL_PATTERN) {
            return <http:BadRequest>{
                body: {
                    message: string `${ERR_MSG_INVALID_WSO2_EMAIL} ${email}`
                }
            };
        }

        do {
            readonly & authorization:CustomJwtPayload userInfo = check ctx.getWithType(authorization:HEADER_USER_INFO);
            string jwt = check ctx.getWithType(authorization:INVOKER_TOKEN);
            if email != userInfo.email {
                boolean validateForSingleRole = authorization:validateForSingleRole(userInfo,
                        authorization:authorizedRoles.peopleOpsTeamRoles);
                if !validateForSingleRole {
                    log:printWarn(string `The user ${userInfo.email} was not privileged to access the${false ?
                                " admin " : " "}resource /leave-entitlement with email=${email.toString()}`);
                    return <http:Forbidden>{
                        body: {
                            message: ERR_MSG_UNAUTHORIZED_VIEW_LEAVE
                        }
                    };
                }
            }

            Employee & readonly employee = check employee:getEmployee(email);
            LeaveEntitlement[]|error leaveEntitlements = getLeaveEntitlement(employee, jwt, years ?: []);
            if leaveEntitlements is error {
                fail error("Error occurred while retrieving leave entitlement!", leaveEntitlements);
            }

            return leaveEntitlements;

        } on fail error internalErr {
            string errMsg = "Error occurred while fetching legally entitled leave for the given employee";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Fetch user calendar.
    #
    # + ctx - Request context
    # + startDate - Start date of the calendar
    # + endDate - End date of the calendar
    # + return - User calendar
    resource function get user\-calendar(http:RequestContext ctx, string startDate, string endDate)
        returns UserCalendarInformation|http:InternalServerError {

        do {
            authorization:CustomJwtPayload {email} = check ctx.getWithType(authorization:HEADER_USER_INFO);
            string jwt = check ctx.getWithType(authorization:INVOKER_TOKEN);
            UserCalendarInformation|http:InternalServerError|error userCalendarInformation =
                getUserCalendarInformation(email, startDate, endDate, jwt);
            if userCalendarInformation is error {
                return <http:InternalServerError>{
                    body: {
                        message: userCalendarInformation.message()
                    }
                };
            }

            return userCalendarInformation;

        } on fail error internalErr {
            string errMsg = "Error occurred while fetching user calendar";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Generate and fetch leave reports for admins and leads.
    #
    # + ctx - Request context
    # + payload - Request payload
    # + return - Leave report or lead-specific leave report
    resource function post leaves/report(http:RequestContext ctx, ReportPayload payload)
        returns ReportContent|http:Forbidden|http:InternalServerError {

        do {
            authorization:CustomJwtPayload {email, groups} = check ctx.getWithType(authorization:HEADER_USER_INFO);
            boolean isPeopleOpsTeamMember = authorization:checkPermissions(
                    authorization:authorizedRoles.peopleOpsTeamRoles, groups);
            boolean isAdmin = isPeopleOpsTeamMember ||
                authorization:hasAnyRole(authorization:authorizedRoles.generalReportRoles, groups);
            Employee[] employees;
            employees = check employee:getEmployees(
                    {
                        status: payload.employeeStatuses,
                        leadEmail: (isAdmin && payload.isAdminView) ? () : email
                    }
                );
            string[] emails = from Employee employee in employees
                select employee.workEmail;
            if payload.employeeEmail is string {
                emails = emails.filter(empMail => empMail == payload.employeeEmail);
            }
            boolean isLead = emails.length() > 0;
            if !(isAdmin || isLead) {
                return <http:Forbidden>{
                    body: {
                        message: "You are not authorized to access leave reports."
                    }
                };
            }
            if emails.length() <= 0 {
                return <http:Forbidden>{
                    body: {
                        message: "You don't have any subordinates to view the leave report!"
                    }
                };
            }
            final database:Leave[]|error leaves = database:getLeaves(
                    {
                        emails,
                        startDate: payload.startDate,
                        endDate: payload.endDate,
                        statuses: [database:APPROVED],
                        // The general leave report never includes sabbaticals; they have a report of their own.
                        excludedLeaveTypes: [database:SABBATICAL_LEAVE]
                    }
                    );
            if leaves is error {
                fail error(ERR_MSG_LEAVES_RETRIEVAL_FAILED, leaves);
            }

            return getLeaveReportContent(leaves);

        } on fail error internalErr {
            string errMsg = "Error occurred while generating leave report";
            log:printError(errMsg, internalErr);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }
    }

    # Approve / Reject the sabbatical leave application request.
    #
    # + ctx - Request context
    # + return - Success response if the application is approved/rejected successfully, otherwise an error response
    resource function post leaves/[int id]/[Action action](http:RequestContext ctx)
        returns http:Ok|http:InternalServerError|http:Forbidden|http:BadRequest {
        authorization:CustomJwtPayload|error {email, groups} = ctx.getWithType(authorization:HEADER_USER_INFO);
        if !authorization:checkPermissions(authorization:authorizedRoles.employeeRoles, groups) {
            return <http:Forbidden>{
                body: {
                    message: "You are not authorized to access this resource."
                }
            };
        }

        // Get the lead info from the database and check if the approver is the relevant lead then proceed
        database:Leave|error? leave = database:getLeave(id);
        if leave is error || leave is () {
            string errMsg = "Error occurred while fetching sabbatical leave records.";
            log:printError(errMsg, leave);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }

        // Fetch applicant details to verify the logged-in user is their manager.
        Employee|error applicantInfo = employee:getEmployee(leave.email);
        if applicantInfo is error {
            string errMsg = "Error occurred while fetching leave applicant details.";
            log:printError(errMsg, applicantInfo);
            return <http:InternalServerError>{
                body: {
                    message: errMsg
                }
            };
        }

        string? applicantLeadEmail = applicantInfo.leadEmail;
        if applicantLeadEmail is () {
            string errMsg = "Sabbatical leave applicant's reporting lead is not available.";
            log:printError(errMsg);
            return <http:BadRequest>{
                body: {
                    message: errMsg
                }
            };
        }
        if applicantLeadEmail.toLowerAscii() != email.toLowerAscii() {
            string errMsg = "The current user is not authorized to approve/reject this sabbatical leave application";
            log:printError(errMsg);
            return <http:Forbidden>{
                body: {
                    message: errMsg
                }
            };
        }
        SabbaticalAction|null actionToProcess = ();
        match (action) {
            APPROVE_ACTION => {
                actionToProcess = APPROVE;
            }
            REJECT_ACTION => {
                actionToProcess = REJECT;
            }
        }

        if actionToProcess is () {
            string errMsg = "Invalid action for sabbatical leave approval/rejection.";
            log:printError(errMsg);
            return <http:BadRequest>{
                body: {
                    message: errMsg
                }
            };
        }
        error? approvalResult = processSabbaticalLeaveRequest({
                                                                  action: actionToProcess,
                                                                  applicantEmail: leave.email,
                                                                  leaveStartDate: leave.startDate.substring(0, 10),
                                                                  leaveEndDate: leave.endDate.substring(0, 10),
                                                                  approverEmail: email,
                                                                  leaveId: id
                                                              });
        if approvalResult is error {
            log:printError("Failed to process sabbatical leave approval notification", approvalResult);
            return <http:InternalServerError>{
                body: {
                    message: "Error occurred while processing sabbatical leave approval/rejection!"
                }
            };
        }
        return <http:Ok>{
            body: {
                message: "Sabbatical leave approval / rejection processed successfully"
            }
        };
    }
}
