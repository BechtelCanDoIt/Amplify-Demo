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

import { create } from "zustand";
import { EdgeInsets, MicroappStore } from "./types";

export const useMicroappStore = create<MicroappStore>((set) => ({
  deviceSafeAreaInsets: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardPossiblyOpen: false,
  keyboardHeight: 0,
  setDeviceSafeAreaInsets: (deviceSafeAreaInsets: EdgeInsets) =>
    set({ deviceSafeAreaInsets }),
  setKeyboardPossiblyOpen: (keyboardPossiblyOpen: boolean) =>
    set({ keyboardPossiblyOpen }),
  setKeyboardHeight: (keyboardHeight: number) => set({ keyboardHeight }),
}));
