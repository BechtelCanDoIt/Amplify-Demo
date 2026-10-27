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

export const TOPIC = {
  TOKEN: "token",
  QR_REQUEST: "qr_request",
  ALERT: "alert",
  CONFIRM_ALERT: "confirm_alert",
  TOTP: "totp",
  NATIVE_LOG: "native_log",
  NAVIGATE_TO_MY_APPS: "close_webview",
  DEVICE_SAFE_AREA_INSETS: "device_safe_area_insets",
  MICRO_APP_VERSION: "micro_app_version",
};

export type TopicType = (typeof TOPIC)[keyof typeof TOPIC];

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
