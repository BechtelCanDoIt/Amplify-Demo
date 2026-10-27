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
import ballerina/sql;
import ballerinax/mysql;
import ballerinax/mysql.driver as _;

# HRIS promotion database client configuration.
configurable PromotionDatabaseConfig promotionDbConfig = ?;

# Initialize the HRIS promotion database client.
#
# See the note on `PromotionDatabaseConfig` in types.bal for why mysql:Options/
# sql:ConnectionPool are built here rather than being configurable fields themselves.
#
# + return - Database client, or error
function initPromotionDbClient() returns mysql:Client|error {
    final sql:ConnectionPool connPool = {
        maxOpenConnections: promotionDbConfig.maxOpenConnections,
        maxConnectionLifeTime: promotionDbConfig.maxConnectionLifeTime,
        minIdleConnections: promotionDbConfig.minIdleConnections
    };
    
    mysql:SSLMode sslMode = mysql:SSL_PREFERRED;
    match promotionDbConfig.sslMode {
        "DISABLED" => { sslMode = mysql:SSL_DISABLED; }
        "REQUIRED" => { sslMode = mysql:SSL_REQUIRED; }
        "VERIFY_CA" => { sslMode = mysql:SSL_VERIFY_CA; }
        "VERIFY_IDENTITY" => { sslMode = mysql:SSL_VERIFY_IDENTITY; }
        _ => { sslMode = mysql:SSL_PREFERRED; }
    }

    final mysql:Options mysqlOptions = {
        ssl: {mode: sslMode},
        connectTimeout: promotionDbConfig.connectTimeout
    };
    return new (
        user = promotionDbConfig.user,
        password = promotionDbConfig.password,
        database = promotionDbConfig.database,
        host = promotionDbConfig.host,
        port = promotionDbConfig.port,
        options = mysqlOptions,
        connectionPool = connPool
    );
}

# HRIS promotion database client.
final mysql:Client promotionDbClient = check initPromotionDbClient();
