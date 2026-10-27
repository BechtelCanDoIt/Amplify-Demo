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

import { Alert, Box, useTheme } from "@mui/material";
import { useSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import PreLoader from "@component/common/PreLoader";
import { redirectUrl as savedRedirectUrl } from "@config/constant";
import ConfirmationModalContextProvider from "@context/DialogContext";
import Header from "@layout/header";
import Sidebar from "@layout/sidebar";
import { selectRoles } from "@slices/authSlice/auth";
import { type RootState, useAppSelector } from "@slices/store";
import { selectUser } from "@slices/userSlice/user";

export default function Layout() {
  const { enqueueSnackbar } = useSnackbar();
  const common = useAppSelector((state: RootState) => state.common);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const roles = useSelector(selectRoles);
  const theme = useTheme();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const userInfo = useAppSelector(selectUser);
  const hasNoManager = userInfo !== null && userInfo.leadEmail == null;
  const isBannerSuppressedRoute =
    location.pathname.includes("history") ||
    location.pathname.includes("reports") ||
    location.pathname.includes("apply/sabbatical");
  const showManagerBanner = hasNoManager && !isBannerSuppressedRoute;
  const HEADER_HEIGHT = 64;

  const showSnackbar = useCallback(() => {
    if (common.timestamp !== null) {
      enqueueSnackbar(common.message, {
        variant: common.type,
        preventDuplicate: true,
        anchorOrigin: { horizontal: "center", vertical: "bottom" },
      });
    }
  }, [common.message, common.type, common.timestamp, enqueueSnackbar]);

  useEffect(() => {
    showSnackbar();
  }, [showSnackbar]);

  useEffect(() => {
    const redirectUrl = localStorage.getItem(savedRedirectUrl);
    if (redirectUrl) {
      navigate(redirectUrl);
      localStorage.removeItem(savedRedirectUrl);
    }
  }, [navigate]);

  // Scroll to top when route changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  return (
    <ConfirmationModalContextProvider>
      {/* Full screen container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100vw",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.palette.background.default,
            zIndex: -1,
          }}
        />
        {/* Header */}
        <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1300 }}>
          <Header sidebarOpen={open} />
        </Box>

        {/* Main content container */}
        <Box sx={{ display: "flex", flex: 1, position: "relative", marginTop: `${HEADER_HEIGHT}px` }}>
          {/* Sidebar */}
          <Box
            sx={{
              position: "fixed",
              top: `${HEADER_HEIGHT}px`,
              left: 0,
              width: "fit-content",
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              zIndex: 1200,
              backgroundColor: theme.palette.surface.secondary.active,
            }}
          >
            <Sidebar
              roles={roles}
              currentPath={location.pathname}
              open={open}
              handleDrawer={() => setOpen(!open)}
            />
          </Box>

          {/* Main content area */}
          <Box
            ref={mainContentRef}
            sx={{
              flex: 1,
              marginLeft: open ? "200px" : "60px",
              minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
              padding: theme.spacing(3),
              overflow: "auto",
              transition:
                "margin-left 0.3s ease, opacity 0.2s ease-in-out, transform 0.2s ease-in-out",
              /* Hide scrollbar */
              "&::-webkit-scrollbar": {
                display: "none",
              },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              "& > *": {
                animation: "fadeInSlide 0.3s ease-out",
              },
              "@keyframes fadeInSlide": {
                "0%": {
                  opacity: 0,
                  transform: "translateY(10px)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
            }}
          >
            {showManagerBanner && (
              <Alert
                severity="warning"
                sx={{ borderRadius: 0, mx: -3, mt: -3, mb: 3 }}
              >
                Your reporting lead is not set in the people management system. Please contact the
                People Operations team to update your profile.
              </Alert>
            )}
            <Suspense fallback={<PreLoader isLoading message="Loading page data" />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
    </ConfirmationModalContextProvider>
  );
}
