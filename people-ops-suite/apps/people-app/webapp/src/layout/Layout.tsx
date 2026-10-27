// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import { Suspense, useCallback, useEffect, useState } from "react";

import { useSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import ConfirmationModalContextProvider from "@context/DialogContext";
import Header from "@layout/header";
import Sidebar from "@layout/sidebar";
import { alpha, Box, Typography, CircularProgress } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { useTheme } from "@mui/material/styles";
import pJson from "@root/package.json";
import { selectRoles } from "@slices/authSlice/auth";
import { RootState, useAppSelector } from "@slices/store";

export default function Layout() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const common = useAppSelector((state: RootState) => state.common);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const roles = useSelector(selectRoles);

  // Memoize enqueueSnackbar to prevent unnecessary re-renders
  const showSnackbar = useCallback(() => {
    if (common.timestamp != null) {
      enqueueSnackbar(common.message, {
        variant: common.type,
        preventDuplicate: true,
        anchorOrigin: { horizontal: "center", vertical: "bottom" },
        action: (key) => (
          <button
            onClick={() => closeSnackbar(key)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              marginLeft: 8,
              marginRight: 8,
              padding: 0,
            }}
            aria-label="close"
          >
            ✕
          </button>
        ),
      });
    }
  }, [
    common.message,
    common.type,
    common.timestamp,
    enqueueSnackbar,
    closeSnackbar,
  ]);

  // Show Snackbar Notifications
  useEffect(() => {
    showSnackbar();
  }, [showSnackbar]);

  // Handle Redirect After Login
  useEffect(() => {
    const redirectUrl = localStorage.getItem("people-app-redirect-url");
    if (redirectUrl) {
      navigate(redirectUrl);
      localStorage.removeItem("people-app-redirect-url");
    }
  }, [navigate]);

  return (
    <ConfirmationModalContextProvider>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <Sidebar
          roles={roles}
          currentPath={location.pathname}
          open={open}
          handleDrawer={() => setOpen(!open)}
          theme={theme}
        />
        <Header />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: "100vh",
            p: 3,
            pt: 7.5,
            pb: 4.5,
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "calc(100vh - 120px)",
                  height: "100%",
                  width: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 10,
                  backgroundColor: "background.default",
                }}
              >
                <CircularProgress size={48} thickness={2} />
              </Box>
            }
          >
            <Outlet />
          </Suspense>
          <Box
            className="layout-note"
            sx={{
              background:
                theme.palette.mode === "light"
                  ? (theme) =>
                      alpha(
                        theme.palette.secondary.main,
                        theme.palette.action.activatedOpacity
                      )
                  : (theme) => alpha(theme.palette.common.black, 0.4),
            }}
          >
            <Typography variant="h6" sx={{ color: "#919090" }}>
              v {pJson.version} | © {new Date().getFullYear()} WSO2 LLC
            </Typography>
          </Box>
        </Box>
      </Box>
    </ConfirmationModalContextProvider>
  );
}
