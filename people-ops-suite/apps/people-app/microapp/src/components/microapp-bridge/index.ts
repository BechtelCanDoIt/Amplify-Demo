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

import { ErrorMessages } from "@/utils/constants";
import { TOPIC, type EdgeInsets, type LogLevel, type TopicType } from "./types";
import { Logger } from "@/utils/logger";

type Callback<T> = (data?: T) => void;

let isNativeTokenRequestInProgress = false;
let nativeTokenCallbackQueue: Callback<string>[] = [];

declare global {
  interface Window {
    nativebridge?: {
      requestToken: () => void;
      resolveToken: (token: string) => void;
      requestQR: () => void;
      resolveQR: (qrString: string) => void;
      resolveQRCode: (qrData: string) => void;
      rejectQRCode: (error: string) => void;
      resolveDeviceSafeAreaInsets?: (data: { insets: EdgeInsets }) => void;
      resolveMicroAppVersion?: (version: string) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Function to get token from React Native
export const getToken = (callback: Callback<string>): void => {

  if (!window.nativebridge) {
    Logger.error("Native bridge is not available");
    callback();
    return;
  }

  nativeTokenCallbackQueue.push(callback);
  if (isNativeTokenRequestInProgress) return;

  isNativeTokenRequestInProgress = true;
  window.nativebridge.resolveToken = (token: string) => {
    const queue = nativeTokenCallbackQueue;
    nativeTokenCallbackQueue = [];
    isNativeTokenRequestInProgress = false;

    queue.forEach((cb) => {
      try {
        cb(token);
      } catch (error) {
        Logger.error("Error while executing native token callback", error);
      }
    });
  };

  try {
    window.nativebridge.requestToken();
  } catch (error) {
    Logger.error("Failed to request token from native bridge", error);
    const queue = nativeTokenCallbackQueue;
    nativeTokenCallbackQueue = [];
    isNativeTokenRequestInProgress = false;
    window.nativebridge.resolveToken = () => {};
    queue.forEach((cb) => {
      try {
        cb();
      } catch (callbackError) {
        Logger.error(
          "Error while executing native token callback after request failure",
          callbackError,
        );
      }
    });
  }
};

/**
 * Trigger an action in the super app
 * @param topic - The topic to trigger
 * @param data - The data to send
 */
const triggerSuperAppAction = (topic: TopicType, data?: unknown): void => {
  if (window.ReactNativeWebView) {
    const messageData = JSON.stringify({
      topic,
      data,
    });
    window.ReactNativeWebView.postMessage(messageData);
  } else {
    Logger.error(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
  }
};

/**
 * Send a log message to the native side
 * @param message - The message to send
 * @param data - The data to send
 * @param level - The level of the log
 */
export const sendNativeLog = (
  message?: string,
  data?: unknown,
  level: LogLevel = "debug",
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(TOPIC.NATIVE_LOG, {
      message,
      data,
      level,
    });
  } else {
    Logger.error(ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE);
  }
};

export const goToMyAppsScreen = (): void => {
  if (window.nativebridge) {
    triggerSuperAppAction(TOPIC.NAVIGATE_TO_MY_APPS);
  }
};

export const requestDeviceSafeAreaInsets = (
  callback: Callback<{ insets: EdgeInsets }>,
): void => {
  if (window.nativebridge) {
    triggerSuperAppAction(TOPIC.DEVICE_SAFE_AREA_INSETS);
    window.nativebridge.resolveDeviceSafeAreaInsets = (data) => {
      callback(data);
    };
  } else {
    Logger.error(
      ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE + " to fetch device safe area insets",
    );
    callback();
  }
};

// Scan QR Code
export const scanQRCode = (
  successCallback: (qrData: string) => void,
  failedToRespondCallback: (error: string) => void,
): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ topic: TOPIC.QR_REQUEST }),
    );

    window.nativebridge.resolveQRCode = (qrData: string) =>
      successCallback(qrData);
    window.nativebridge.rejectQRCode = (error: string) =>
      failedToRespondCallback(error);
  } else {
    Logger.error("Native bridge is not available");
  }
};

export const requestMicroAppVersion = (
  callback: Callback<string>,
): void => {
  if (window.nativebridge) {
    triggerSuperAppAction(TOPIC.MICRO_APP_VERSION);
    window.nativebridge.resolveMicroAppVersion = (version) => {
      callback(version);
    };
  } else {
    Logger.error(
      ErrorMessages.NATIVE_BRIDGE_NOT_AVAILABLE + " to fetch micro app version",
    );
    callback();
  }
};
