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
import { createContext, useContext } from "react";

/** Shows an "It worked" toast; does nothing outside the CadO2 shell. */
export const Cado2ToastContext = createContext<(message: string) => void>(
  () => undefined,
);

/**
 * "It worked" messages (2026-10-13), e.g. "Synced to Salesforce": a toast at
 * the bottom that goes away by itself. What stays true lives on the page (a
 * status, "Last synced …"); errors stay until fixed or closed.
 */
export const useCado2Toast = (): ((message: string) => void) =>
  useContext(Cado2ToastContext);
