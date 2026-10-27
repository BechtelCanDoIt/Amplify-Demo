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
import visitor.database;

import ballerina/lang.regexp;
import ballerina/time;

# Converts the json array of accessible locations to a readable string.
#
# + accessibleLocations - Json string array containing floors and rooms
# + return - Formatted string
public isolated function organizeLocations(database:Floor[] accessibleLocations) returns string {
    string formattedString = "";
    foreach var location in accessibleLocations {
        string floor = escapeHtml(location.floor.toJsonString());
        string roomList = location.rooms.length() > 0 ?
            string:'join(" | ", ...location.rooms.map(escapeHtml)) : "";
        if (roomList != "") {
            formattedString += string `Floor ${floor}: ${roomList}<br>`;
        } else {
            formattedString += string `Floor ${floor}<br>`;
        }
    }

    return formattedString.trim();
    // This function is used to format the date-time string from the database to timezone of the WSO2 Building that the visitor is in.
    // Currently, it only supports the WSO2 Building in Sri Lanka (Asia/Colombo) which is UTC +5:30.
}

# Escapes HTML special characters so untrusted values cannot inject markup when interpolated into HTML email templates.
#
# + input - Raw string value
# + return - HTML-escaped string
public isolated function escapeHtml(string input) returns string {
    string result = re `&`.replaceAll(input, "&amp;");
    result = re `<`.replaceAll(result, "&lt;");
    result = re `>`.replaceAll(result, "&gt;");
    result = re `"`.replaceAll(result, "&quot;");
    result = re `'`.replaceAll(result, "&#39;");
    return result;
}

# Helper function to format date-time strings in Ballerina
#
# + dateTimeStr - UTC date-time string in "YYYY-MM-DD HH:MM" format  
# + timeZone - UTC time zone string
# + lenientParse - Boolean flag to enable lenient parsing (default: true)
# + return - formatted date-time string in "YYYY-MM-DD HH:MM:SS (Time Zone)" format
public isolated function formatDateTime(string dateTimeStr, string timeZone, boolean lenientParse = true) returns string|error {
    string timeString = dateTimeStr;

    if (lenientParse) {
        timeString = regexp:replace(re ` `, timeString, "T");
        timeString = timeString + ".00Z";
    }

    time:Utc utcFromString = check time:utcFromString(timeString);
    time:Utc newUtcTime = time:utcAddSeconds(utcFromString, 19800); //TODO : Replace the hardcoded seconds with dynamic calculation based on the provided timeZone
    time:Civil utcToCivil = time:utcToCivil(newUtcTime);

    // Format with proper zero-padding for all components
    string year = utcToCivil.year.toString();
    string month = padZero(utcToCivil.month);
    string day = padZero(utcToCivil.day);
    string hour = padZero(utcToCivil.hour);
    string minute = padZero(utcToCivil.minute);
    string second = padZero(<int>(utcToCivil.second ?: 0));

    return string `${year}-${month}-${day} ${hour}:${minute}:${second} (${timeZone})`;
}

# Helper function to format date strings in Ballerina
#
# + dateTimeStr - UTC date-time string in "YYYY-MM-DD HH:MM" format  
# + timeZone - UTC time zone string
# + lenientParse - Boolean flag to enable lenient parsing (default: true)
# + return - formatted date-time string in "YYYY-MM-DD" format
public isolated function formatDate(string dateTimeStr, string timeZone, boolean lenientParse = true) returns string|error {
    string timeString = dateTimeStr;

    if (lenientParse) {
        timeString = regexp:replace(re ` `, timeString, "T");
        timeString = timeString + ".00Z";
    }

    time:Utc utcFromString = check time:utcFromString(timeString);
    time:Utc newUtcTime = time:utcAddSeconds(utcFromString, 19800); // TODO : Replace the hardcoded seconds with dynamic calculation based on the provided timeZone
    time:Civil utcToCivil = time:utcToCivil(newUtcTime);

    // Format with proper zero-padding for all components
    string year = utcToCivil.year.toString();
    string month = padZero(utcToCivil.month);
    string day = padZero(utcToCivil.day);

    return string `${year}-${month}-${day}`;
}

# Helper function to pad numbers with leading zero.
#
# + num - Integer number to be padded
# + return - Padded string representation of the number
isolated function padZero(int num) returns string {
    return num < 10 ? string `0${num}` : num.toString();
}
