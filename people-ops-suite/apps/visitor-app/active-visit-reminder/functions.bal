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
import ballerina/lang.regexp;
import ballerina/time;

# Builds the full name of a visitor from their first and last names, handling null values gracefully.
#
# + firstName - First name of the visitor, can be null  
# + lastName - Last name of the visitor, can be null
# + return - Full name of the visitor, or "Unknown Visitor" if both names are null
isolated function buildVisitorName(string? firstName, string? lastName) returns string {
    if firstName is string && lastName is string {
        return firstName + " " + lastName;
    }
    if firstName is string {
        return firstName;
    }
    return "Unknown Visitor";
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

# Helper function to pad numbers with leading zero.
#
# + num - Integer number to be padded
# + return - Padded string representation of the number
isolated function padZero(int num) returns string {
    return num < 10 ? string `0${num}` : num.toString();
}
