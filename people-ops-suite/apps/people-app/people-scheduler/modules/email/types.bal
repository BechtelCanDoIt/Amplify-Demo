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

# OAuth2 client auth configurations.
type Oauth2Config record {|
    # Token URL
    string tokenUrl;
    # Client ID
    string clientId;
    # Client Secret
    string clientSecret;
|};

# [Configurable] Email notification service configs.
type EmailServiceConfig record {|
    # Email Service Endpoint
    string emailServiceEndpoint;
    # Auth Configurations
    Oauth2Config oauthConfig;
    # Recipient email(s) for the leaver auto-transition summary.
    #
    # Each job names its own recipients rather than sharing one list: the summaries
    # answer to different people, this one being an offboarding notice while the
    # scheduled-change summary reports whether planned changes to employee records
    # landed. Required, so a new job cannot quietly inherit an audience nobody chose
    # for it.
    string[] leaverTransitionRecipients;
    # Recipient email(s) for the scheduled-change summary.
    string[] scheduledChangeRecipients;
    # Recipient email(s) for the New-joiner activation summary, which also lists the
    # joiners still on the placeholder work email so HR can add their real one.
    string[] joinerActivationRecipients;
    # Sender email
    string 'from;
|};

# Payload of the email alerting service.
public type EmailPayload record {|
    # Recipient email(s) as string array
    string[] to;
    # Sender email
    string 'from;
    # Email subject
    string subject;
    # Email template
    string template;
    # CC'ed recipient email(s) as string array
    string[] cc?;
    # BCC'd recipient email(s)
    string[] bcc?;
|};
