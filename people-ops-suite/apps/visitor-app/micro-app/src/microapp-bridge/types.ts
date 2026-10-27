// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { EdgeInsets } from "../stores/microapp/types";

// Enum representing the topics for native bridge communication
export enum Topic {
  token = "token",
  nativeLog = "native_log",
  navigateToMyApps = "close_webview",
  saveLocalData = "save_local_data",
  getLocalData = "get_local_data",
  deviceSafeAreaInsets = "device_safe_area_insets",
  deleteLocalData = "delete_local_data",
  openUrl = "open_url",
  qrRequest = "qr_request",
  microAppVersion = "micro_app_version",
  launchData = "get_launch_data",
}

// Native bridge methods
declare global {
  interface Window {
    nativebridge?: {
      requestToken: () => void;
      resolveToken: (token: string) => void;
      resolveSaveLocalData?: () => void;
      rejectSaveLocalData?: (error: any) => void;
      resolveGetLocalData?: (data: { value: string }) => void;
      rejectGetLocalData?: (error: any) => void;
      resolveDeviceSafeAreaInsets?: (data: { insets: EdgeInsets }) => void;
      resolveDeleteLocalData?: () => void;
      rejectDeleteLocalData?: (error: any) => void;
      resolveOpenUrl?: () => void;
      rejectOpenUrl?: (error: any) => void;
      resolveQrCode?: (data: string) => void;
      resolveMicroAppVersion?: (version: string) => void;
      resolveGetLaunchData?: (data: any) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Interface for Browser Configs
export interface BrowserConfiguration {
  url: string;
  presentationStyle: "FullScreen" | "FormSheet";
  dismissButtonStyle?: string;
}
