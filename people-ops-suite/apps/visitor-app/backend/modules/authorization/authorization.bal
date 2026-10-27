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
import ballerina/data.jsondata;
import ballerina/http;
import ballerina/jwt;
import ballerina/log;

public configurable AppRoles authorizedRoles = ?;

# Emails of shared/non-employee accounts (e.g. reception desks) that are authorized via
# authorizedRoles but are not present in the employee management system, so employee lookups
# for these emails should be bypassed.
public configurable string[] receptionUserEmails = [];

# To handle authorization for each resource function invocation.
public isolated service class JwtInterceptor {

    *http:RequestInterceptor;

    isolated resource function default [string... path](http:RequestContext ctx, http:Request req)
        returns http:NextService|http:Forbidden|http:InternalServerError|error? {

        string|error idToken = req.getHeader(JWT_ASSERTION_HEADER);
        if idToken is error {
            string errorMsg = "Missing invoker info header!";
            log:printError(errorMsg, idToken);
            return <http:InternalServerError>{
                body: {
                    message: errorMsg
                }
            };
        }

        [jwt:Header, jwt:Payload]|jwt:Error result = jwt:decode(idToken);
        if result is jwt:Error {
            string errorMsg = "Error while reading the Invoker info!";
            log:printError(errorMsg, result);
            return <http:InternalServerError>{
                body: {
                    message: errorMsg
                }
            };
        }
        CustomJwtPayload|error userInfo = jsondata:parseAsType(result[1].toJson());
        if userInfo is error {
            string errorMsg = "Malformed Invoker info object!";
            log:printError(errorMsg, userInfo);
            return <http:InternalServerError>{
                body: {
                    message: errorMsg
                }
            };
        }

        // Flatten the authorized roles into a single array for easier comparison.
        string[] allAuthorizedRoles = [];
        foreach string|string[] role in authorizedRoles.toArray() {
            if role is string[] {
                foreach string r in role {
                    allAuthorizedRoles.push(r);
                }
            } else {
                allAuthorizedRoles.push(<string>role);
            }
        }

        // For regular user tokens, we check if they have the required roles to access the resource.
        foreach string userGroup in userInfo.groups {
            if allAuthorizedRoles.indexOf(userGroup) !is () {
                ctx.set(HEADER_USER_INFO, userInfo);
                return ctx.next();
            }
        }

        log:printError(
                    string `${userInfo.email} is missing required permissions, only has ${userInfo.groups.toBalString()}`);

        return <http:Forbidden>{
            body: {
                message: "Insufficient privileges!"
            }
        };

    }
}
