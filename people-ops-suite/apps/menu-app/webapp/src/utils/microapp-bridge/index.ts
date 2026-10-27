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
type Callback<T> = (data?: T) => void;

export enum Topic {
  nativeLog = "native_log",
}

declare global {
  interface Window {
    nativebridge?: {
      requestToken: () => void;
      resolveToken: (token: string) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

/**
 * Fetch the token from the native bridge
 * @param callback - The callback to receive the token
 */
export const getToken = (callback: Callback<string>): void => {
  if (window.nativebridge) {
    window.nativebridge.requestToken();
    window.nativebridge.resolveToken = (token: string) => {
      callback(token);
    };
  } else {
    console.error("Native bridge is not available to fetch token(s)");
    callback();
  }
};

/**
 * Trigger an action in the super app
 * @param topic - The topic to trigger
 * @param data - The data to send
 */
const triggerSuperAppAction = (topic: Topic, data?: any): void => {
  if (window.ReactNativeWebView) {
    const messageData = JSON.stringify({
      topic,
      data,
    });
    window.ReactNativeWebView.postMessage(messageData);
  } else {
    console.error("React Native WebView is not available");
  }
};

type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Send a log message to the native side
 * @param message - The message to send
 * @param data - The data to send
 * @param level - The level of the log
 */
export const sendNativeLog = (message?: any, data?: any, level: LogLevel = "debug"): void => {
  if (window.nativebridge && window.ReactNativeWebView) {
    triggerSuperAppAction(Topic.nativeLog, {
      message,
      data,
      level,
    });
  } else {
    console.error("Native bridge is not available to send logs");
  }
};
