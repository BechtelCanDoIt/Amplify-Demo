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
import { Avatar, Box, Menu, MenuItem, Stack, Tooltip, useTheme } from "@mui/material";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import React from "react";

import Wso2LogoBlack from "@assets/images/wso2-logo_black.svg";
import Wso2LogoWhite from "@assets/images/wso2-logo_white.svg";
import { APP_NAME } from "@config/config";
import { useAppAuthContext } from "@context/AuthContext";
import { RootState, useAppSelector } from "@slices/store";

const Header = ({ sidebarOpen }: { sidebarOpen: boolean }) => {
  const authContext = useAppAuthContext();
  const theme = useTheme();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const user = useAppSelector((state: RootState) => state.user);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <Box
      sx={{
        zIndex: 10,
        backgroundColor: theme.palette.surface.territory.active,
        boxShadow: theme.shadows[4],
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          py: "0.5rem",
          display: "flex",
          gap: 2,
          "&.MuiToolbar-root": {
            pl: 1,
          },
        }}
      >
        <Box
          key={String(sidebarOpen)}
          onClick={() => (window.location.href = "/")}
          sx={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            alt="wso2"
            style={{ height: "45px", width: "auto", objectFit: "contain" }}
            src={theme.palette.mode === "dark" ? Wso2LogoWhite : Wso2LogoBlack}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing(0.5),
            width: "100%",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.customText.primary.p1.active,
              fontWeight: "600",
            }}
          >
            {APP_NAME}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 0 }}>
          {user.userInfo && (
            <>
              <Stack flexDirection={"row-reverse"} alignItems={"center"} gap={1.5}>
                <Tooltip title="Open settings">
                  <Avatar
                    onClick={handleOpenUserMenu}
                    sx={{
                      width: "2.5rem",
                      height: "2.5rem",
                      border: 1,
                      borderColor: theme.palette.customBorder.territory.active,
                    }}
                    src={user.userInfo?.employeeThumbnail || ""}
                    alt={user.userInfo?.firstName || "Avatar"}
                  >
                    {user.userInfo?.firstName?.charAt(0)}
                  </Avatar>
                </Tooltip>
                <Box sx={{ width: "fit-content" }}>
                  <Typography
                    noWrap
                    variant="body1"
                    sx={{
                      color: theme.palette.customText.primary.p2.active,
                    }}
                  >
                    {user.userInfo?.firstName + " " + user.userInfo.lastName}
                  </Typography>
                  <Typography
                    noWrap
                    variant="body2"
                    sx={{
                      color: theme.palette.customText.primary.p3.active,
                    }}
                  >
                    {user.userInfo?.jobRole}
                  </Typography>
                </Box>
              </Stack>

              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem
                  key={"logout"}
                  onClick={() => {
                    authContext.appSignOut();
                  }}
                >
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </Box>
  );
};

export default Header;
