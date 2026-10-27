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
import { AsgardeoProvider } from "@asgardeo/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { Provider } from "react-redux";

import { useMemo } from "react";

import { APP_NAME, AsgardeoConfig, isMicroApp } from "@config/config";
import AppAuthProvider from "@context/AuthContext";
import { MicroAppAuthProvider } from "@context/AuthContext";
import { ColorModeContext, useColorMode } from "@hooks/useColorMode";
import { themeSettings } from "@root/src/theme";
import { store } from "@slices/store";
import { ThemeMode } from "@utils/types";

import "./index.css";

function WebApp() {
  document.title = APP_NAME;

  const { mode, toggleColorMode } = useColorMode();

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <SnackbarProvider maxSnack={3} preventDuplicate>
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <AsgardeoProvider {...AsgardeoConfig}>
              <AppAuthProvider>
                <AppHandler />
              </AppAuthProvider>
            </AsgardeoProvider>
          </Provider>
        </ThemeProvider>
      </SnackbarProvider>
    </ColorModeContext.Provider>
  );
}

function MicroApp() {
  const theme = useMemo(() => createTheme(themeSettings(ThemeMode.Light)), []);

  return (
    <Provider store={store}>
      <SnackbarProvider maxSnack={3} preventDuplicate>
        <ThemeProvider theme={theme}>
          <MicroAppAuthProvider>
            <AppHandler />
          </MicroAppAuthProvider>
        </ThemeProvider>
      </SnackbarProvider>
    </Provider>
  );
}

export default function App() {

  return isMicroApp ? <MicroApp /> : <WebApp />;
}
