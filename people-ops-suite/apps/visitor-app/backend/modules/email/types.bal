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
# Auth2 client auth configurations.
public type ClientAuthConfig record {|
    # Token URL
    string tokenUrl;
    # Client ID
    string clientId;
    # Client Secret
    string clientSecret;
|};

# [Configurable] Email alerting service configuration record.
public type EmailAlertConfig record {|
    # Authorized app UUID provided by the Email service
    string uuid;
    # Email sender
    string 'from;
    # ID of the email template
    string templateId;
|};

# Email notification details record.
public type EmailNotificationDetails record {|
    # Email subject
    string subject;
    # Email body
    string body;
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
    # Recipient email(s) as string 
    string[] to;
    # Sender email
    string 'from;
    # Email subject
    string subject;
    # Email template
    string template;
    # Attachments
    Document[] attachments = [];
    # CC'ed recipient email(s) as string array
    string[] cc?;
    # BCC'd recipient email(s)
    string[] bcc?;
|};
