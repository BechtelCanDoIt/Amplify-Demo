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
    # Token URL
    string tokenUrl;
    # Client ID
    string clientId;
    # Client Secret
    string clientSecret;
|};

# Visit details passed to the email notification.
public type CompletedVisitInfo record {|
    # Visit ID
    int id;
    # Visitor full name
    string visitorName;
    # Date of the visit (YYYY-MM-DD)
    string visitDate;
    # Entry time in UTC
    string? timeOfEntry;
    # Departure time in UTC
    string? timeOfDeparture;
    # Employee the visitor was meeting
    string? whomTheyMeet;
    # Pass number assigned to the visitor
    string? passNumber;
    # Visitor's company name
    string? companyName;
    # Purpose of the visit
    string? purposeOfVisit;
|};

# Document attachment record.
public type Document record {|
    # Name of the document
    string contentName;
    # Document type
    string contentType;
    # Document content byte array
    byte[] attachment;
    # Content ID for referencing the attachment in email templates
    string contentId?;
|};

# Payload of the email alerting service.
public type EmailPayload record {|
    # Recipient email(s)
    string[] to;
    # Sender email
    string 'from;
    # Email subject
    string subject;
    # Email template
    string template;
    # Attachments
    Document[] attachments = [];
    # CC'd recipient email(s)
    string[] cc?;
    # BCC'd recipient email(s)
    string[] bcc?;
|};
