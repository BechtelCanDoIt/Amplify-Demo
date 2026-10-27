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

import React from "react";
import { APP_NAME } from "@config/config";
import logoBlack from "@assets/images/WSO2-Logo-Black.png";
import logoWhite from "@assets/images/WSO2-Logo-White.png";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAppAuthContext } from "@context/AuthContext";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import {
  AppBar,
  Avatar,
  Box,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import { resetEmployee } from "@root/src/slices/employeeSlice/employee";
import { resetPersonalInfo } from "@root/src/slices/employeeSlice/employeePersonalInfo";

const Header = () => {
  const theme = useTheme();
  const authContext = useAppAuthContext();
  const dispatch = useAppDispatch();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const user = useAppSelector((state: RootState) => state.user);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    dispatch(resetEmployee());
    dispatch(resetPersonalInfo());
    setAnchorElUser(null);
    authContext.appSignOut();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        color: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.primary.main
            : theme.palette.common.white,

        background: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.common.white
            : theme.palette.primary.dark,
        boxShadow: 2,
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          paddingY: 0.3,
          "&.MuiToolbar-root": {
            pl: 0.3,
          },
        }}
      >
        <img
          alt="wso2"
          style={{
            height: "20px",
            width: "auto",
            cursor: "pointer",
            paddingLeft: "5px",
            paddingRight: "2px"
          }}
          onClick={() => (window.location.href = "/")}
          src={theme.palette.mode === "dark" ? logoWhite : logoBlack}
        ></img>
        <Typography
          variant="h5"
          sx={{
            ml: 1,
            flexGrow: 1,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => (window.location.href = "/")}
        >
          {APP_NAME}
        </Typography>

        <Box sx={{ flexGrow: 0 }}>
          {user.userInfo && (
            <>
              <Stack flexDirection={"row"} alignItems={"center"} gap={2}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {user.userInfo?.firstName + " " + user.userInfo.lastName}
                  </Typography>
                  <Typography variant="body2">
                    {user.userInfo?.designation}
                  </Typography>
                </Box>
                <Tooltip title="Open settings">
                  <Avatar
                    onClick={handleOpenUserMenu}
                    sx={{
                      border: 1,
                      borderColor: "primary.main",
                      cursor: "pointer",
                    }}
                    src={user.userInfo?.employeeThumbnail || ""}
                    alt={user.userInfo?.firstName || "Avatar"}
                    imgProps={{ referrerPolicy: "no-referrer" }}
                  >
                    {user.userInfo?.firstName?.charAt(0)}
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
                <MenuItem key={"logout"} onClick={handleLogout}>
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
