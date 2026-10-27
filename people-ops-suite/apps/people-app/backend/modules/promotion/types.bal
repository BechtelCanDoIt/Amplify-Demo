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

# HRIS promotion database configuration.
# Deliberately flat — see the note on `DatabaseConfig` in the database module's
# types.bal for why (keeps mysql:Options/sql:ConnectionPool's full field surface out
# of Choreo's auto-generated config UI).
public type PromotionDatabaseConfig record {|
    # Database user
    string user;
    # Database password
    string password;
    # Database name
    string database;
    # Database host
    string host;
    # Port number of the MySQL server
    int port;
    # Max open connections in the pool
    int maxOpenConnections = 10;
    # Max connection lifetime (seconds)
    decimal maxConnectionLifeTime = 240;
    # Min idle connections in the pool
    int minIdleConnections = 0;
    # Connection timeout (seconds)
    decimal connectTimeout = 30;
    # SSL mode for DB connection ("DISABLED", "PREFERRED", "REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY")
    string sslMode = "PREFERRED";
|};

# Approved promotion record for an employee.
public type PromotionRecord record {|
    # Date the promotion took effect. Nullable: HRIS contains APPROVED
    # promotions in ended cycles whose promoted date was never populated.
    string? promotedDate;
    # Date the promotion request was raised. This is what places a promotion on
    # the timeline: it always falls inside exactly one employment period, which
    # is how a promotion is attributed to the employment it belongs to.
    string createdOn;
    # Job band held before the promotion
    string currentJobBand;
    # Job band granted by the promotion
    string nextJobBand;
    # Job role at the time of promotion. Nullable in HRIS.
    string? jobRole;
    # Type of promotion
    string promotionType;
    # Name of the promotion cycle
    string cycleName;
    # Business unit at the time of promotion
    string businessUnit;
    # Department at the time of promotion. Nullable in HRIS.
    string? department;
    # Team at the time of promotion. Nullable in HRIS.
    string? team;
    # Sub-team at the time of promotion. Nullable in HRIS: this is the field a
    # production row first tripped over, aborting the whole result stream.
    string? subTeam;
|};
