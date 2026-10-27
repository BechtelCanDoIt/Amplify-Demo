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
import ballerina/time;

final time:Date & readonly TODAY = {year: 2026, month: 10, day: 1};

@test:Config {}
function lengthOfServiceCountsToTodayWithoutFinalDay() {
    test:assertEquals(calculateLengthOfService("2020-04-01", (), TODAY), "6 Year(s) 6 Month(s)");
}

@test:Config {}
function lengthOfServiceStopsAtPastFinalDay() {
    test:assertEquals(calculateLengthOfService("2020-04-01", "2023-06-15", TODAY), "3 Year(s) 2 Month(s)");
}

@test:Config {}
function lengthOfServiceCountsFinalDayAsWorked() {
    test:assertEquals(calculateLengthOfService("2020-04-01", "2023-03-31", TODAY), "3 Year(s) 0 Month(s)");
    test:assertEquals(calculateLengthOfService("2020-12-01", "2020-12-31", TODAY), "0 Year(s) 1 Month(s)");
}

@test:Config {}
function lengthOfServiceRollsFinalDayOverYearEndsAndLeapDays() {
    test:assertEquals(calculateLengthOfService("2020-01-01", "2020-12-31", TODAY), "1 Year(s) 0 Month(s)");
    test:assertEquals(calculateLengthOfService("2020-03-01", "2024-02-29", TODAY), "4 Year(s) 0 Month(s)");
}

@test:Config {}
function lengthOfServiceCountsTodayWhenTodayIsFinalDay() {
    test:assertEquals(calculateLengthOfService("2025-10-02", "2026-10-01", TODAY), "1 Year(s) 0 Month(s)");
}

@test:Config {}
function lengthOfServiceCountsToTodayWhileFinalDayIsAhead() {
    test:assertEquals(calculateLengthOfService("2020-04-01", "2026-12-31", TODAY), "6 Year(s) 6 Month(s)");
}

@test:Config {}
function lengthOfServiceIgnoresMalformedFinalDay() {
    test:assertEquals(calculateLengthOfService("2020-04-01", "not-a-date", TODAY), "6 Year(s) 6 Month(s)");
}

@test:Config {}
function lengthOfServiceIsEmptyWhenFinalDayPrecedesStart() {
    test:assertEquals(calculateLengthOfService("2020-04-01", "2019-01-01", TODAY), "");
}

@test:Config {}
function lengthOfServiceIsEmptyForFutureStart() {
    test:assertEquals(calculateLengthOfService("2027-01-01", (), TODAY), "");
}
