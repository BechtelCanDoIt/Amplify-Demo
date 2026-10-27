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
import ballerina/test;

@test:Config {}
function aMissingVacancyBecomesNotFound() {
    http:NotFound|http:Conflict|http:BadRequest|http:GatewayTimeout|http:BadGateway result = applyFailure(404);
    test:assertTrue(result is http:NotFound);
}

@test:Config {}
function aRejectedApplicationBecomesBadRequest() {
    foreach int status in [400, 422] {
        test:assertTrue(applyFailure(status) is http:BadRequest, string `Status ${status}`);
    }
}

@test:Config {}
function anExistingApplicationBecomesConflict() {
    http:Conflict existing = <http:Conflict>applyFailure(409);
    test:assertEquals(existing?.body, {message: "You have already applied for this role."});
}

@test:Config {}
function anUnavailableUpstreamBecomesGatewayTimeout() {
    test:assertTrue(applyFailure(503) is http:GatewayTimeout);
    test:assertTrue(applyFailure(504) is http:GatewayTimeout);
}

@test:Config {}
function refusedCredentialsAndUnexpectedFailuresBecomeBadGateway() {
    foreach int status in [401, 403, 429, 500, 502] {
        test:assertTrue(applyFailure(status) is http:BadGateway, string `Status ${status}`);
    }
}

@test:Config {}
function theUpstreamReplyIsNeverPassedOn() {
    http:BadRequest rejected = <http:BadRequest>applyFailure(400);
    test:assertEquals(rejected?.body, {message: "The application was not accepted. Please check your details."});
}
