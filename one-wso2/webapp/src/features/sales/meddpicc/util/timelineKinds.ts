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

import type { TimelineKind } from "../types";

/**
 * How each kind of activity is drawn on the journey's one line: a plain solid dot whose
 * hue says what it was, sized by weight (a customer call is the biggest thing on the
 * track). The four hues validate against each other in both modes.
 */
export const KINDS: Record<
  TimelineKind,
  {
    label: string;
    singular: string;
    plural: string;
    size: number;
    light: string;
    dark: string;
  }
> = {
  CUSTOMER_CALL: { label: "Customer call", singular: "customer call", plural: "customer calls", size: 12, light: "#2a78d6", dark: "#3987e5" },
  EMAIL: { label: "Email", singular: "email", plural: "emails", size: 10, light: "#11936a", dark: "#2fbf8a" },
  INTERNAL_CALL: { label: "Internal discussion", singular: "internal discussion", plural: "internal discussions", size: 10, light: "#eb6834", dark: "#e0703f" },
  ACTIVITY: { label: "Salesforce activity", singular: "Salesforce activity", plural: "Salesforce activities", size: 10, light: "#7a55d3", dark: "#a184ec" },
};
export const KIND_ORDER: TimelineKind[] = ["CUSTOMER_CALL", "INTERNAL_CALL", "EMAIL", "ACTIVITY"];
