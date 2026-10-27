// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

# Retrieve the employee data.
#
# + workEmail - Employee email
# + return - Employee object or Error if so
public isolated function fetchEmployee(string workEmail) returns Employee|error? {
    string document = string `
        query employeeQuery ($workEmail: String!) {
            employee(email: $workEmail) {
                employeeId
                workEmail
                firstName
                lastName
                jobRole
                employeeThumbnail
            }
        }
    `;

    EmployeeResponse employeeResponse = check hrClient->execute(document, {workEmail});
    Employee? employee = employeeResponse.data.employee;
    return employee;
}

# Filter basic employee data.
#
# + search - Search term
# + 'limit - pagination limit
# + offset - pagination offset
# + return - Employees info
public isolated function fetchEmployees(string search, int 'limit, int offset) returns EmployeeBasic[]|error {

    string term = search.trim();

    string document = string `
        query getAllEmployees($filter: EmployeeFilter!, $limit: Int, $offset: Int) {
        employees(filter: $filter, limit: $limit, offset: $offset) {
            workEmail,     
            firstName,
            lastName, 
            employeeThumbnail 
    }}
    `;

    EmployeeFilter filter = {
        employeeStatus: ["ACTIVE", "MARKED LEAVER"],
        employmentType: ["PERMANENT", "CONSULTANCY", "INTERNSHIP", "PROBATION"],
        emailSearchString: term
    };

    EmployeesResponse response = check hrClient->execute(document, {
        filter,
        'limit,
        offset
    });

    return response.data.employees;
}
