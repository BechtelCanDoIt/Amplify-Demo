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
import ballerina/cache;
import ballerina/graphql;
import ballerina/log;

isolated cache:Cache hrisEmployeeCache = new (
    'defaultMaxAge = CACHE_DEFAULT_MAX_AGE,
    'cleanupInterval = CACHE_CLEANUP_INTERVAL
);

# Get Employee from HRIS by email with caching using GraphQL.
#
# + email - Employee email
# + return - Return Employee entity or error
public isolated function getEmployee(string? email)
    returns readonly & Employee|error {

    if email is () {
        return error(ERR_MSG_EMPLOYEE_RETRIEVAL_FAILED);
    }

    string document = string `
        query getEmployee($email: String!) {
            employee(email: $email) {
                employeeId
                firstName
                lastName
                workEmail
                startDate
                continuousServiceDate
                employeeThumbnail
                location
                jobRole
                managerEmail
                finalDayOfEmployment
                employeeStatus
                lead
                subordinateCount
                jobBand
            }
        }
    `;

    SingleEmployeeResponse|graphql:ClientError response = hrClient->execute(document, {email});
    if response is graphql:ClientError {
        return error(ERR_MSG_EMPLOYEE_RETRIEVAL_FAILED, response);
    }

    EmployeeResponse|null employeeResp = response.data.employee;
    if employeeResp is () {
        return error(ERR_MSG_EMPLOYEE_RETRIEVAL_FAILED);
    }
    readonly & Employee employee = toEmployee(employeeResp);

    return employee;
}

# Get Employees from HRIS by filters using GraphQL.
#
# + filters - Filter object containing the filter criteria for the query
# + return - Return an array of Employee entity or error
public isolated function getEmployees(EmployeeFilter filters = {}) returns Employee[]|error {
    GraphQLEmployeeFilter gqlFilter = {
        location: filters.location,
        businessUnit: filters.businessUnit,
        team: filters.team,
        employeeStatus: filters.status,
        managerEmail: filters.leadEmail,
        employmentType: filters.employmentType,
        lead: filters.lead
    };

    string document = string `
        query getEmployees($filter: EmployeeFilter!, $limit: Int, $offset: Int) {
            employees(filter: $filter, limit: $limit, offset: $offset) {
                employeeId
                firstName
                lastName
                workEmail
                startDate
                continuousServiceDate
                employeeThumbnail
                location
                jobRole
                managerEmail
                finalDayOfEmployment
                employeeStatus
                lead
            }
        }
    `;

    Employee[] employees = [];
    boolean fetchMore = true;
    int offset = 0;

    while fetchMore {
        MultipleEmployeesResponse|graphql:ClientError response = hrClient->execute(
            document,
            {filter: gqlFilter, 'limit: DEFAULT_LIMIT, offset: offset}
        );

        if response is graphql:ClientError {
            string customError = "An error occurred while retrieving employee data!";
            log:printError(customError, response);
            return error(customError, response);
        }
        EmployeeResponse[] batch = response.data.employees;
        employees.push(...from EmployeeResponse empResp in batch
            select toEmployee(empResp));
        fetchMore = batch.length() > 0;
        offset += DEFAULT_LIMIT;
    }
    return employees;
}

# Get the location of an employee based on their email address using GraphQL.
#
# + email - Email address of the employee 
# + token - JWT token (not used in GraphQL OAuth2 flow)
# + return - The employee's location or an error
public isolated function getEmployeeLocation(string email, string token) returns string|error {

    readonly & Employee|error employee = getEmployee(email);
    if employee is error {
        return error(employee.message(), employee);
    }
    string? location = employee.location;
    if location is () {
        return error("Employee location not found!");
    }

    return location;
}

