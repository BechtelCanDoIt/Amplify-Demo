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
import {
  Avatar,
  Box,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import React from "react";

import { APP_NAME } from "@config/config";
import { useAppAuthContext } from "@context/AuthContext";
import { useWso2Logo } from "@hooks/useWso2Logo";
import BasicBreadcrumbs from "@layout/BreadCrumbs/BreadCrumbs";
import { userApi } from "@services/user.api";
import { useAppSelector } from "@slices/store";

const Header = () => {
  const { appSignOut } = useAppAuthContext();
  const theme = useTheme();
  const wso2Logo = useWso2Logo();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

  const user = useAppSelector((state) => userApi.endpoints.getUserInfo.select()(state)?.data);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
        backgroundColor: theme.palette.surface.secondary.active,
        boxShadow: theme.shadows[4],
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          paddingY: 0.3,
          display: "flex",
          gap: 2,
          "&.MuiToolbar-root": {
            p: 0.5,
            px: 2,
          },
        }}
      >
        <img
          alt="wso2"
          style={{
            maxWidth: "100px",
          }}
          onClick={() => (window.location.href = "/")}
          src={wso2Logo}
        ></img>

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
            }}
          >
            {APP_NAME}
          </Typography>
          <BasicBreadcrumbs />
        </Box>

        <Box sx={{ flexGrow: 0 }}>
          {user && (
            <>
              <Stack flexDirection={"row"} alignItems={"center"} gap={1.5}>
                {!isMobile && (
                  <Box sx={{ width: "fit-content" }}>
                    <Typography
                      noWrap
                      variant="body1"
                      sx={{
                        textAlign: "right",
                        color: theme.palette.customText.primary.p2.active,
                      }}
                    >
                      {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                    </Typography>

                    <Typography
                      noWrap
                      variant="body2"
                      sx={{
                        textAlign: "right",
                        color: theme.palette.customText.primary.p3.active,
                      }}
                    >
                      {user.jobRole}
                    </Typography>
                  </Box>
                )}

                <Tooltip title="Open settings">
                  <Avatar
                    onClick={handleOpenUserMenu}
                    sx={{
                      width: 48,
                      height: 48,
                      border: 1,
                      borderColor: theme.palette.customBorder.territory.active,
                    }}
                    src={user.employeeThumbnail || ""}
                    alt={user.firstName || "Avatar"}
                  >
                    {user.firstName?.charAt(0)}
                  </Avatar>
                </Tooltip>
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
                    appSignOut();
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
