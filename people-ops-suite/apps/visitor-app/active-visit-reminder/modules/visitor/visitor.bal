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
import ballerina/log;
import ballerina/oauth2;

const int PAGE_SIZE = 100;

isolated function getJwtHeader() returns map<string|string[]>|error {
    string|oauth2:Error token = tokenProvider.generateToken();
    if token is oauth2:Error {
        return error("Failed to generate access token", token);
    }
    return {"x-jwt-assertion": token};
}

# Fetches all active (APPROVED) visits from the backend, paginating through all results.
#
# + return - Full list of active visits or an error
public function fetchActiveVisits() returns Visit[]|error {
    Visit[] allVisits = [];
    int offset = 0;

    while true {
        map<string|string[]>|error headers = getJwtHeader();
        if headers is error {
            log:printError("Failed to get access token", headers);
            return headers;
        }

        string path = string `/visits?statusArray=APPROVED&limit=${PAGE_SIZE}&offset=${offset}`;
        VisitsResponse response = check visitorClient->get(path, headers);

        allVisits.push(...response.visits);

        if allVisits.length() >= response.totalCount {
            break;
        }
        offset += PAGE_SIZE;
    }

    return allVisits;
}
