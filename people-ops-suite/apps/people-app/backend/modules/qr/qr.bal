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

# Generate a QR code PNG for an employee.
#
# + details - Employee details to encode in the QR
# + return - PNG image bytes, or error on failure
public isolated function generateEmployeeQrCode(EmployeeQrDetails details) returns byte[]|error {
    string content = string `${details.employeeNumber}-${details.firstName} ${details.lastName}-${details.house}`;
    http:Response response = check qrClient->/generate.post(content);
    if response.statusCode != http:STATUS_OK {
        return error(string `QR generation failed with status: ${response.statusCode}`);
    }
    return check response.getBinaryPayload();
}
