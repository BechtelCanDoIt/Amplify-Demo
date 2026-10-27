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

import ballerina/test;

@test:Config {}
function aWellFormedIncomingIdIsKept() {
    test:assertEquals(requestIdFrom("3f2b8a1c-1234-4abc-9def-0123456789ab"), "3f2b8a1c-1234-4abc-9def-0123456789ab");
}

@test:Config {}
function aMissingIdGetsANewOne() {
    string first = requestIdFrom(());
    string second = requestIdFrom(());
    test:assertTrue(first.length() >= 8);
    test:assertNotEquals(first, second);
}

@test:Config {}
function anUnsafeIncomingIdIsReplaced() {
    string[] unsafe = ["short", "has space in it 12345", "line\nbreak-12345678", "semi;colon-12345678",
        string:'join("", ...from int _ in 1 ... 65 select "a")];
    foreach string incoming in unsafe {
        string used = requestIdFrom(incoming);
        test:assertNotEquals(used, incoming, string `"${incoming}" should be replaced`);
        test:assertTrue(re `[A-Za-z0-9-]{8,64}`.isFullMatch(used));
    }
}
