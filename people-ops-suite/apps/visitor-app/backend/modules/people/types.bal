// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import ballerina/graphql;

# Auth2 client auth configurations.
public type ClientAuthConfig record {|
    # Token URL
    string tokenUrl;
    # Client Id
    string clientId;
    # Client Secret
    string clientSecret;
|};

# Employee information.
public type Employee record {|
    # Employee first name
    string firstName;
    # Employee last name
    string lastName;
    # Employee ID
    string employeeId;
    # Employee thumbnail
    string? employeeThumbnail?;
    # Employee work emails
    string workEmail;
    # Employee job role
    string jobRole;
|};

# Employee information.
public type EmployeeData record {|
    # Employee object
    Employee employee;
|};

# Response when fetching employee.
public type EmployeeResponse record {|
    # Employee data fetched
    EmployeeData data;
|};

# The EmployeeBasic record type contains filtered employee data.
public type EmployeeBasic record {|
    # Employee first name
    string firstName;
    # Employee last name
    string lastName;
    # Employee work email
    string workEmail;
    # Thumbnail of the employee
    string? employeeThumbnail = ();
|};

# The EmployeeFilter record type represents the filter criteria for the employees.
public type EmployeeFilter record {|
    # The employee statuses
    string[]? employeeStatus?;
    # The employment types
    string[]? employmentType?;
    # The email
    string? email?;
    # The search term
    string? emailSearchString?;
|};

type EmployeesData record {|
    EmployeeBasic[] employees;
|};

type EmployeesResponse record {|
    *graphql:GenericResponseWithErrors;
    EmployeesData data;
|};
