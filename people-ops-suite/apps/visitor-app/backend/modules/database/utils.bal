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
import ballerina/crypto;
import ballerina/lang.regexp as regex;
import ballerina/random;
import ballerina/sql;

# Build the database select query with dynamic filter attributes.
#
# + mainQuery - Main query without the new sub query
# + filters - Array of sub queries to be added to the main query
# + return - Dynamically build sql:ParameterizedQuery
isolated function buildSqlSelectQuery(sql:ParameterizedQuery mainQuery, sql:ParameterizedQuery[] filters)
    returns sql:ParameterizedQuery {

    boolean isFirstSearch = true;
    sql:ParameterizedQuery updatedQuery = mainQuery;

    foreach sql:ParameterizedQuery filter in filters {
        if isFirstSearch {
            updatedQuery = sql:queryConcat(mainQuery, ` WHERE `, filter);
            isFirstSearch = false;
            continue;
        }

        updatedQuery = sql:queryConcat(updatedQuery, ` AND `, filter);
    }

    return updatedQuery;
}

# Build the database update query with dynamic attributes.
#
# + mainQuery - Main query without the new sub query
# + filters - Array of sub queries to be added to the main query
# + return - Dynamically build sql:ParameterizedQuery
isolated function buildSqlUpdateQuery(sql:ParameterizedQuery mainQuery, sql:ParameterizedQuery[] filters)
    returns sql:ParameterizedQuery {

    boolean isFirstUpdate = true;
    sql:ParameterizedQuery updatedQuery = ``;

    foreach sql:ParameterizedQuery filter in filters {
        if isFirstUpdate {
            updatedQuery = sql:queryConcat(mainQuery, filter);
            isFirstUpdate = false;
            continue;
        }

        updatedQuery = sql:queryConcat(updatedQuery, ` , `, filter);
    }

    return updatedQuery;
}

# Encrypt the input plaintext using AES-256-CBC. 
#
# + value - Value to be encrypted
# + return - Encrypted value or error
public isolated function encrypt(string value) returns string|error {
    // Generate a random IV (Initialization Vector)
    byte[16] iv = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    foreach var i in 0 ... 15 {
        iv[i] = <byte>(check random:createIntInRange(0, 255));
    }
    string cipherText = toHexString(check crypto:encryptAesCbc(value.toBytes(), encryptionKey.toBytes(), iv));
    return string `${iv.toBase16()}:${cipherText}`;
}

# Convert a byte array to a hexadecimal string.
#
# + data - Byte array to be converted
# + return - Hexadecimal string
public isolated function toHexString(byte[] data) returns string {
    string result = "";
    foreach byte b in data {
        int high = (b & 0xFF) / 16;
        int low = (b & 0xFF) % 16;
        // Append two hex characters for each byte
        result += HEX_DIGITS.substring(high, high + 1);
        result += HEX_DIGITS.substring(low, low + 1);
    }
    return result;
}

# Compute the SHA-256 id hash of an email or contact number, matching the webapp's hashing scheme
# (trim + lowercase + SHA-256 hex) so a stored value can be checked against a caller-supplied idHash.
#
# + value - Email or contact number to hash
# + return - Hex-encoded SHA-256 hash
public isolated function computeIdHash(string value) returns string
    => toHexString(crypto:hashSha256(value.trim().toLowerAscii().toBytes()));

# Decrypt the input format using AES-256-CBC.
#
# + value - Input string in the format "ivHex:encryptedHex"
# + return - Decrypted value or error
public isolated function decrypt(string value) returns string|error {
    // Generate a random IV (Initialization Vector)
    string[] parts = regex:split(re `:`, value);
    if parts.length() != 2 {
        return error("Invalid encrypted value !");
    }
    byte[] iv = check fromHexString(parts[0]);
    byte[] cipherText = check fromHexString(parts[1]);
    return check string:fromBytes(check crypto:decryptAesCbc(cipherText, encryptionKey.toBytes(), iv));
}

# Convert a hex string to a byte array.
#
# + hex - Hexadecimal string to be converted
# + return - Byte array or error
public isolated function fromHexString(string hex) returns byte[]|error {
    int len = hex.length();
    if len % 2 != 0 {
        return error("Invalid hex string length");
    }
    byte[] bytes = [];
    // Parse each pair of hex digits into one byte
    foreach int i in 0 ..< (len / 2) {
        string byteHex = hex.substring(2 * i, 2 * i + 2);
        int value = check int:fromHexString(byteHex);
        bytes.push(<byte>value);
    }
    return bytes;
}
