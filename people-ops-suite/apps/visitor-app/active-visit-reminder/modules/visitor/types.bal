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

# OAuth2 client credentials grant configuration.
public type ClientAuthConfig record {|
    # Token endpoint URL of the identity provider
    string tokenUrl;
    # OAuth2 client ID of the scheduler application
    string clientId;
    # OAuth2 client secret of the scheduler application
    string clientSecret;
|};

# Audit fields present on every visit record returned by the backend.
public type AuditFields record {|
    # Email of the user who created the record
    string createdBy;
    # Timestamp when the record was created
    string createdOn;
    # Email of the user who last updated the record
    string updatedBy;
    # Timestamp when the record was last updated
    string updatedOn;
|};

# A floor and its accessible rooms assigned to a visitor.
public type Floor record {|
    # Floor identifier (e.g. "Floor 1", "Ground Floor")
    string floor;
    # List of room names accessible on this floor
    string[] rooms;
|};

# Visit record — mirrors the backend database:Visit type returned by GET /visits.
public type Visit record {|
    *AuditFields;
    # Unique numeric ID of the visit
    int id;
    # Hashed ID of the visitor (email or contact number hash)
    string visitorIdHash;
    # Name of the visitor's company
    string? companyName = ();
    # Pass number issued to the visitor upon entry
    string passNumber?;
    # Email of the employee the visitor is meeting
    string? whomTheyMeet = ();
    # Reason for the visit
    string? purposeOfVisit = ();
    # Floors and rooms the visitor is permitted to access
    Floor[]? accessibleLocations = ();
    # Scheduled visit date in YYYY-MM-DD format
    string visitDate;
    # Actual or scheduled entry time in UTC (YYYY-MM-DDTHH:mm:ss)
    string? timeOfEntry = ();
    # Actual or scheduled departure time in UTC (YYYY-MM-DDTHH:mm:ss)
    string? timeOfDeparture = ();
    # Current status of the visit: REQUESTED, APPROVED, REJECTED, or COMPLETED
    string status;
    # First name of the visitor
    string firstName;
    # Last name of the visitor
    string? lastName = ();
    # Contact number of the visitor
    string? contactNumber = ();
    # Email address of the visitor
    string? email = ();
    # ID of the invitation linked to this visit, if any
    int? invitationId = ();
|};

# Paginated response from GET /visits — mirrors the backend database:VisitsResponse.
public type VisitsResponse record {|
    # Total number of visits matching the applied filter (used for pagination)
    int totalCount;
    # List of visits in the current page
    Visit[] visits;
|};
