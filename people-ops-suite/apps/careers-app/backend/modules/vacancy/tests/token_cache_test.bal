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
function cachedTokenIsReturned() {
    TokenCache cache = new;
    test:assertEquals(cache.get(), ());
    cache.put("token-a", 3600);
    test:assertEquals(cache.get(), "token-a");
}

@test:Config {}
function clearDropsOnlyTheRejectedToken() {
    TokenCache cache = new;
    cache.put("token-a", 3600);
    cache.clear("some-other-token");
    test:assertEquals(cache.get(), "token-a");
    cache.clear("token-a");
    test:assertEquals(cache.get(), ());
}

@test:Config {}
function tokenCloseToExpiryIsNotReturned() {
    TokenCache cache = new;
    // The cache keeps a 60 second margin, so a token valid for 30 seconds is already treated as expired.
    cache.put("token-a", 30);
    test:assertEquals(cache.get(), ());
}
