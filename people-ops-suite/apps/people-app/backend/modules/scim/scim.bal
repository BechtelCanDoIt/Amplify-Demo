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

# SCIM client functions for user and group management in the internal org.
#
# + email - Work email address of the user
# + firstName - User's first name
# + lastName - User's last name
# + return - Error if creation fails, otherwise nil
public isolated function createUser(string email, string firstName, string lastName) returns error? {
    UserCreateInput input = {
        userName: string `${asgardeoUserStoreDomain}/${email}`,
        emails: [email],
        name: {givenName: firstName, familyName: lastName},
        urn\:scim\:wso2\:schema: {askPassword: true}
    };
    return createUserWithInput(input);
}

# Create a user in the internal org with a custom SCIM payload.
#
# + input - User creation payload
# + return - Error if creation fails, otherwise nil
isolated function createUserWithInput(UserCreateInput input) returns error? {
    BulkResponse response = check scimOperationsClient->/organizations/internal/users/bulk.post(
        {failOnErrors: 1, data: [input]}
    );
    foreach BulkResponseOperation op in response.Operations {
        if op.status.code >= 300 {
            return error(string `SCIM user creation failed for ${input.userName}: HTTP ${op.status.code}`,
                    statusCode = op.status.code, response = op?.response);
        }
    }
}

# Add a user to an Asgardeo group in the internal org.
#
# + groupName - Asgardeo group display name
# + email - Work email address to add to the group
# + return - Add users to group response or error
public isolated function addUserToGroup(string groupName, string email)
        returns AddUsersToGroupResponse|error {
    return scimOperationsClient->/organizations/internal/groups/[groupName]/users.post({emails: [email]});
}
