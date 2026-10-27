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
import { createContext, useMemo, useState } from "react";

import { localStorageTheme } from "@config/constant";
import { ThemeMode } from "@utils/types";

export const ColorModeContext = createContext({
  mode: ThemeMode.Light,
  toggleColorMode: () => {},
});

const processLocalThemeMode = (): ThemeMode => {
  try {
    const savedTheme = localStorage.getItem(localStorageTheme);
    if (savedTheme === ThemeMode.Light || savedTheme === ThemeMode.Dark) {
      return savedTheme;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const systemTheme = prefersDark ? ThemeMode.Dark : ThemeMode.Light;

    localStorage.setItem(localStorageTheme, systemTheme);
    return systemTheme;
  } catch (err) {
    console.error("Theme detection failed, defaulting to light mode.", err);
    return ThemeMode.Light;
  }
};

export const useColorMode = () => {
  const [mode, setMode] = useState<ThemeMode>(processLocalThemeMode());

  const toggleColorMode = useMemo(
    () => () => {
      const newMode = mode === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light;
      localStorage.setItem(localStorageTheme, newMode);
      setMode(newMode);
      document.documentElement.setAttribute("data-theme", newMode);
    },
    [mode],
  );

  return { mode, toggleColorMode };
};
