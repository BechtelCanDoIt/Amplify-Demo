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

# OAuth2 client auth configurations.
public type ClientAuthConfig record {|
    # Token URL
    string tokenUrl;
    # Client Id
    string clientId;
    # Client Secret
    string clientSecret;
    # OAuth2 scopes required by the upstream service
    string[] scopes = [];
|};

# Input for creating a user via the SCIM operations service.
public type UserCreateInput record {|
    # Username
    string userName;
    # Email addresses
    string[] emails;
    # Name details
    record {|
        # First name
        string givenName;
        # Last name
        string familyName;
    |} name;
    # WSO2 SCIM extension schema
    record {
        # When true, Asgardeo sends a password-setup invitation to the user
        boolean askPassword?;
    } urn\:scim\:wso2\:schema;
|};

# Response from the add-users-to-group endpoint.
public type AddUsersToGroupResponse record {|
    # Emails that could not be added
    string[] failedUsers = [];
    # Emails successfully added
    string[] addedUsers = [];
|};

# Input payload for the SCIM operations service bulk user creation endpoint.
type BulkUserInput record {|
    # Number of operation failures tolerated before the upstream aborts the bulk request
    int failOnErrors?;
    # List of users to create
    UserCreateInput[] data;
|};

# Status of a single operation in the bulk response.
type BulkOperationStatus record {|
    # HTTP status code for this operation
    int code;
    json...;
|};

# Result of a single operation within a bulk response.
type BulkResponseOperation record {|
    # HTTP method used
    string method;
    # Error detail returned by the SCIM service (present on failure)
    string response?;
    # Asgardeo resource URL of the created user (present on success)
    string location?;
    # HTTP status for this operation
    BulkOperationStatus status;
    json...;
|};

# Response from the SCIM operations service bulk user creation endpoint.
type BulkResponse record {|
    # Per-operation results
    BulkResponseOperation[] Operations;
    json...;
|};
