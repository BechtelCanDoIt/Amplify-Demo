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

import { ReactNode } from "react";

// Snackbar variant types
export type SnackbarVariant = "success" | "error" | "warning" | "info";

// Snackbar position types
export type SnackbarPosition = "top" | "bottom";

// Snackbar options
export interface SnackbarOptions {
  message: string;
  variant?: SnackbarVariant;
  duration?: number;
  icon?: ReactNode;
  position?: SnackbarPosition;
}

// Snackbar context interface
export interface SnackbarContextType {
  showSnackbar: (options: SnackbarOptions) => void;
  hideSnackbar: () => void;
}

// Dialog context interface
export interface DialogContextType {
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => void;
  hideConfirmation: () => void;
}
