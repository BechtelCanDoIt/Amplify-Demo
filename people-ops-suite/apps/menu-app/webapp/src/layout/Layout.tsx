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
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Suspense, useContext, useEffect, useMemo, useState } from "react";

import PreLoader from "@component/common/PreLoader";
import { isMicroApp } from "@config/config";
import { redirectUrl as savedRedirectUrl } from "@config/constant";
import ConfirmationModalContextProvider from "@context/DialogContext";
import { ColorModeContext } from "@hooks/useColorMode";
import Header from "@layout/header";
import Sidebar from "@layout/sidebar";
import { selectRoles } from "@slices/authSlice/auth";
import { type RootState, useAppSelector } from "@slices/store";

import MobileBottomBar from "./MobileBottomBar/MobileBottomBar";

export default function Layout() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const roles = useSelector(selectRoles);
  const common = useAppSelector((state: RootState) => state.common);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const colorMode = useContext(ColorModeContext);

  const snackbarConfig = useMemo(
    () => ({
      preventDuplicate: true,
      anchorOrigin: { horizontal: "right" as const, vertical: "bottom" as const },
    }),
    [],
  );

  useEffect(() => {
    if (common.timestamp !== null) {
      enqueueSnackbar(common.message, {
        variant: common.type,
        ...snackbarConfig,
      });
    }
  }, [common.message, common.type, common.timestamp, enqueueSnackbar, snackbarConfig]);

  useEffect(() => {
    const redirectUrl = localStorage.getItem(savedRedirectUrl);
    if (redirectUrl) {
      navigate(redirectUrl, { replace: true });
      localStorage.removeItem(savedRedirectUrl);
    }
  }, [navigate]);

  const sidebar = useMemo(
    () => (
      <Sidebar
        roles={roles}
        currentPath={location.pathname}
        open={open}
        handleDrawer={() => setOpen(!open)}
        mode={colorMode.mode}
        onThemeToggle={colorMode.toggleColorMode}
      />
    ),
    [roles, location.pathname, open, colorMode.mode, colorMode.toggleColorMode],
  );

  return (
    <ConfirmationModalContextProvider>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          backgroundColor: theme.palette.surface.primary.active,
        }}
      >
        {/* Header */}
        {!isMicroApp && <Header />}

        {/* Main content container */}
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Sidebar - show on small screens and hide on MicroApps */}
          {!isMicroApp &&
            (isMobile ? (
              <>
                {/* Backdrop when sidebar is open */}
                {open && (
                  <Box
                    onClick={() => setOpen(false)}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      zIndex: 999,
                    }}
                  />
                )}
                {/* Sidebar overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    zIndex: 1000,
                    transform: open ? "translateX(0)" : "translateX(-100%)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                >
                  {sidebar}
                </Box>
              </>
            ) : (
              <Box sx={{ width: "fit-content", height: "100%" }}>{sidebar}</Box>
            ))}

          {/* Page body - Content area */}
          <Box
            sx={{
              flex: 1,
              padding: theme.spacing(3),
              paddingBottom: isMobile ? "80px" : "18px",
              overflowY: "auto",
            }}
          >
            <Suspense fallback={<PreLoader isLoading message="Loading page data ..." />}>
              <Outlet />
            </Suspense>
          </Box>

          {/* Mobile Bottom Bar - Only on Mobile */}
          {!isMicroApp && isMobile && (
            <MobileBottomBar
              onMenuClick={() => setOpen(!open)}
              onThemeToggle={colorMode.toggleColorMode}
              open={open}
              mode={colorMode.mode}
            />
          )}
        </Box>
      </Box>
    </ConfirmationModalContextProvider>
  );
}
