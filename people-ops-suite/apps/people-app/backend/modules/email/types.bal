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

# [Configurable] OAuth2 application configuration.
public type Oauth2Config record {|
    # The URL of the token endpoint
    string tokenUrl;
    # The client ID of the application
    string clientId;
    # The client secret of the application
    string clientSecret;
    # OAuth2 scopes
    string[] scopes = [];
|};

# Email Service Configuration.
public type EmailServiceConfig record {|
    # Email Service Endpoint
    string emailServiceEndpoint;
    # Auth Configurations
    Oauth2Config oauthConfig;
    # Recipient email(s) as string array
    string[] to;
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
|};
