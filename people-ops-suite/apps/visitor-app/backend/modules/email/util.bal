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
import ballerina/mime;

# Bind values to the email template and encode.
#
# + content - Email content  
# + keyValPairs - Key value pairs
# + return - Email content
public isolated function bindKeyValues(string content, map<string> keyValPairs) returns string|error {

    string bindContent = keyValPairs.entries().reduce(
        isolated function(string accumulation, [string, string] keyVal) returns string {
        string:RegExp r = re `<!-- \[${keyVal[0].toUpperAscii()}\] -->`;
        return r.replaceAll(accumulation, keyVal[1]);
    },
    content);
    return mime:base64Encode(bindContent).ensureType();
}
