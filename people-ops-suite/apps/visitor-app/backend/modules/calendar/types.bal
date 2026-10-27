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

# OAuth2 configuration record.
type Oauth2Config record {|
    # OAuth2 token endpoint
    string tokenUrl;
    # OAuth2 client ID
    string clientId;
    # OAuth2 client secret
    string clientSecret;
|};

# Retry config for the calendar client.
public type CalendarRetryConfig record {|
    # Retry count
    int count = RETRY_COUNT;
    # Retry interval
    decimal interval = RETRY_INTERVAL;
    # Retry backOff factor
    float backOffFactor = RETRY_BACKOFF_FACTOR;
    # Retry max interval
    decimal maxWaitInterval = RETRY_MAX_INTERVAL;
|};

# Busy interval record type.
public type BusyInterval record {|
    # Start time of the busy slot
    string 'start;
    # End time of the busy slot
    string end;
|};

# Custom type representing user busy times.
public type UserBusy record {|
    # User identifier
    string user;
    # Array of busy intervals for the user
    BusyInterval[] busy;
|};

# Filtered calendar resource record.
public type FilteredCalendarResource record {|
    # Resource ID
    string resourceId?;
    # Resource name
    string resourceName?;
    # Resource type
    string resourceType?;
    # Resource email
    string resourceEmail?;
    # Capacity of the resource
    int capacity?;
    # Floor name
    string floorName?;
    # Building ID
    string buildingId?;
    # Resource category
    string resourceCategory?;
    # Resource description
    string description?;
|};

