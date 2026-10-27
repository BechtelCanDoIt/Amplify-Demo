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
import { ErrorMessages } from "../utils/constants";
import { BrowserConfiguration, Topic } from "./types";

/**
 * Internal log helper to avoid circular dependency with Logger.
 * Logger imports sendNativeLog from this module, so we cannot import Logger here.
 */
export const bridgeLog = (message: string, level: "info" | "error" | "warn" = "error") => {
  if (typeof window !== "undefined" && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: Topic.nativeLog, data: { message, level } })
    );
  } else {
    console[level]?.(`[MicroApp] ${message}`);
  }
};

type Callback<T> = (data?: T) => void;

// Function to get token from React Native
export const getToken = (callback: Callback<string>): void => {
  if (window.nativebridge) {
    window.nativebridge.requestToken();
    window.nativebridge.resolveToken = (token: string) => {
      callback(token);
    };
  } else {
    bridgeLog(
      ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE + " to fetch token(s)",
    );
    callback();
  }
};

/**
 * Request the device safe area insets from the native app
 */
export const requestDeviceSafeAreaInsets = (
  callback: Callback<{ insets: EdgeInsets }>,
): void => {
  if (window.nativebridge) {
    triggerSuperAppAction(Topic.deviceSafeAreaInsets);
    window.nativebridge.resolveDeviceSafeAreaInsets = (data) => {
      callback(data);
    };
  } else {
    bridgeLog(
      ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE +
        " to fetch device safe area insets",
    );
    callback();
  }
};

/**
 * Request the launch data from the native app
 */
export const requestLaunchData = (callback: Callback<any>): void => {
  if (window.nativebridge) {
    triggerSuperAppAction(Topic.launchData);
    window.nativebridge.resolveGetLaunchData = (data) => {
      callback(data);
    };
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    callback();
  }
};

/**
 * Trigger an action in the super app
 */
const triggerSuperAppAction = (topic: Topic, data?: any): void => {
  if (window.ReactNativeWebView) {
    const messageData = JSON.stringify({
      topic,
      data,
    });
    window.ReactNativeWebView.postMessage(messageData);
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
  }
};

type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Send a log message to the native side
 */
export const sendNativeLog = (
  message?: any,
  data?: any,
  level: LogLevel = "debug",
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.nativeLog, {
      message,
      data,
      level,
    });
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
  }
};

/**
 * Navigate back to the my apps screen (close webview)
 */
export const goToMyAppsScreen = (): void => {
  triggerSuperAppAction(Topic.navigateToMyApps);
};

/**
 * Save data to native local storage
 */
export const saveLocalData = (
  key: string,
  value: any,
  callback?: () => void,
  failedToRespondCallback?: (error: any) => void,
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.saveLocalData, {
      key,
      value: JSON.stringify(value),
    });
    window.nativebridge.resolveSaveLocalData = callback;
    window.nativebridge.rejectSaveLocalData = failedToRespondCallback;
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    if (failedToRespondCallback) {
      failedToRespondCallback(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    }
  }
};

/**
 * Get data from native local storage
 */
export const getLocalData = (
  key: string,
  callback: (data: any) => void,
  failedToRespondCallback?: (error: any) => void,
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.getLocalData, { key });
    window.nativebridge.resolveGetLocalData = ({
      value,
    }: {
      value: string;
    }) => {
      if (!value) {
        callback(null);
      } else {
        try {
          callback(JSON.parse(value));
        } catch (e) {
          bridgeLog(`Failed to parse local data for key: ${key} - ${e}`);
          callback(null);
        }
      }
    };
    window.nativebridge.rejectGetLocalData = failedToRespondCallback;
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    if (failedToRespondCallback) {
      failedToRespondCallback(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    }
  }
};

/**
 * Open a URL in the device's browser
 */
export const openUrl = (
  config: BrowserConfiguration,
  callback?: () => void,
  failedToRespondCallback?: (error: any) => void,
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.openUrl, { config });
    window.nativebridge.resolveOpenUrl = callback;
    window.nativebridge.rejectOpenUrl = failedToRespondCallback;
  } else {
    bridgeLog(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    if (failedToRespondCallback) {
      failedToRespondCallback(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
    }
  }
};

/**
 * Get the micro app version from the native app
 */
export const getMicroAppVersion = (callback: Callback<string>): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.microAppVersion);
    window.nativebridge.resolveMicroAppVersion = (version: string) => {
      callback(version);
    };
  } else {
    bridgeLog(
      ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE + " to fetch micro app version",
    );
    callback("unknown");
  }
};
