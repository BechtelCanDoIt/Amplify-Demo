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
import ballerinax/googleapis.sheets as sheets;

configurable ClientAuthConfig clientAuthConfig = ?;
configurable string transactionEndpoint = ?;
configurable ParkingSheetConfig parkingSheetConfig = ?;

final http:Client transactionClient = check new (check requireSecureEndpoint(transactionEndpoint), {
    auth: {
        ...clientAuthConfig
    },
    httpVersion: http:HTTP_1_1,
    http1Settings: {keepAlive: http:KEEPALIVE_NEVER}
});

# Ensure the transaction endpoint is HTTPS so the forwarded user assertion is never sent in cleartext.
#
# + endpoint - Configured transaction service endpoint
# + return - The endpoint when it uses HTTPS, otherwise an error that fails startup
isolated function requireSecureEndpoint(string endpoint) returns string|error {
    if !endpoint.startsWith(HTTPS_SCHEME) {
        return error("transactionEndpoint must use HTTPS");
    }
    return endpoint;
}

final sheets:ConnectionConfig parkingSheetsConfig = {
    auth: {
        clientId: parkingSheetConfig.clientId,
        clientSecret: parkingSheetConfig.clientSecret,
        refreshToken: parkingSheetConfig.refreshToken,
        refreshUrl: parkingSheetConfig.tokenUrl
    },
    retryConfig: {
        count: GSHEET_CONFIG_RETRY_COUNT,
        interval: GSHEET_CONFIG_RETRY_INTERVAL
    }
};

public final sheets:Client parkingSpreadsheetClient = check new (parkingSheetsConfig);
