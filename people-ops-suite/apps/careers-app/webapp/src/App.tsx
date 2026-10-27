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

import AppHandler from "@app/AppHandler";
import { AuthProvider } from "@asgardeo/auth-react";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledEngineProvider, ThemeProvider, createTheme } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { Provider } from "react-redux";

import { useEffect, useMemo, useState } from "react";

import { APP_NAME, AsgardeoConfig } from "@config/config";
import AppAuthProvider from "@context/AuthContext";
import { ColorModeContext } from "@context/ColorModeContext";
import { store } from "@slices/store";
import { themeSettings } from "@src/theme";
import { ThemeMode } from "@/types/types";

import "./index.css";

function App() {
  document.title = APP_NAME || "WSO2 Careers";

  // The candidate's saved choice, or light mode when they have not chosen one.
  const processLocalThemeMode = (): ThemeMode => {
    try {
      return localStorage.getItem("careers-app-theme") === ThemeMode.Dark ? ThemeMode.Dark : ThemeMode.Light;
    } catch {
      return ThemeMode.Light;
    }
  };

  const [mode, setMode] = useState<ThemeMode>(processLocalThemeMode());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        const newMode = mode === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light;
        localStorage.setItem("careers-app-theme", newMode);
        setMode(newMode);
        document.documentElement.setAttribute("data-theme", newMode);
      },
    }),
    [mode],
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <StyledEngineProvider injectFirst>
        <SnackbarProvider maxSnack={3} preventDuplicate>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Provider store={store}>
              <AuthProvider config={AsgardeoConfig}>
                <AppAuthProvider>
                  <AppHandler />
                </AppAuthProvider>
              </AuthProvider>
            </Provider>
          </ThemeProvider>
        </SnackbarProvider>
      </StyledEngineProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
