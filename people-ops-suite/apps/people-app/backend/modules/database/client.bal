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
import ballerina/sql;
import ballerinax/mysql;
import ballerinax/mysql.driver as _;

# Database Client Configuration.
configurable DatabaseConfig dbConfig = ?;

# Initialize the main people-ops database client.
#
# mysql:Options/sql:ConnectionPool are built here, inside the function, rather than
# being configurable fields themselves — see the note on `DatabaseConfig` in types.bal
# for why (keeps them out of Choreo's auto-generated config UI).
#
# + return - Database client, or error
function initPeopleOpsDbClient() returns mysql:Client|error {
    final sql:ConnectionPool connPool = {
        maxOpenConnections: dbConfig.maxOpenConnections,
        maxConnectionLifeTime: dbConfig.maxConnectionLifeTime,
        minIdleConnections: dbConfig.minIdleConnections
    };

    mysql:SSLMode sslMode = mysql:SSL_PREFERRED;
    match dbConfig.sslMode {
        "DISABLED" => { sslMode = mysql:SSL_DISABLED; }
        "REQUIRED" => { sslMode = mysql:SSL_REQUIRED; }
        "VERIFY_CA" => { sslMode = mysql:SSL_VERIFY_CA; }
        "VERIFY_IDENTITY" => { sslMode = mysql:SSL_VERIFY_IDENTITY; }
        _ => { sslMode = mysql:SSL_PREFERRED; }
    }

    final mysql:Options mysqlOptions = {
        ssl: {mode: sslMode},
        connectTimeout: dbConfig.connectTimeout
    };
    return new (
        user = dbConfig.user,
        password = dbConfig.password,
        database = dbConfig.database,
        host = dbConfig.host,
        port = dbConfig.port,
        options = mysqlOptions,
        connectionPool = connPool
    );
}

# Database Client.
final mysql:Client databaseClient = check initPeopleOpsDbClient();
