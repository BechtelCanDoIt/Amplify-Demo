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

# Retrieves busy time for specified users.
#
# + minTime - The start time of the period to check for busy slots 
# + maxTime - The end time of the period to check for busy slots
# + users - The list of user email addresses to retrieve busy times for
# + timeZone - The time zone to be used for the busy time calculation
# + return - An array of UserBusy records representing busy slots, or an error
public isolated function getBusy(string minTime, string maxTime, string[] users, string timeZone)
    returns UserBusy[]|error {
    UserBusy[] userBusyResponse =
    check calendarClient->/busy\-times.get(minTime = minTime, maxTime = maxTime, timeZone = timeZone, users = users);
    return userBusyResponse;
}

# Retrieves building resources.
#
# + return - Array of filtered calendar resources or error
public isolated function getBuildingResources() returns FilteredCalendarResource[]|error {
    FilteredCalendarResource[] calendarResponse = check calendarClient->/calendar\-resources.get();
    return calendarResponse;
}
