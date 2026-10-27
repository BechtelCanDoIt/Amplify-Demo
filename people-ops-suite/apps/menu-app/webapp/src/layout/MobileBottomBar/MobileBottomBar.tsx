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
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, IconButton, Typography, useTheme } from "@mui/material";
import { Home, Moon, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface MobileBottomBarProps {
  onMenuClick: () => void;
  onThemeToggle: () => void;
  mode: string;
  open: boolean;
}

export default function MobileBottomBar({
  onMenuClick,
  onThemeToggle,
  open,
  mode,
}: MobileBottomBarProps) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === "/" || location.pathname === "/home";

  return (
    <AppBar
      position="fixed"
      sx={{
        top: "auto",
        bottom: 10,
        backgroundColor: "transparent",
        backgroundImage: "none",
        alignItems: "center",
        boxShadow: "none",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "3px 2px",
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(255, 255, 255, 0.95)"
              : (theme.palette as any).surface?.secondary?.active || theme.palette.background.paper,
          border: `0.5px solid ${
            theme.palette.mode === "light"
              ? "rgba(230, 230, 230, 0.8)"
              : (theme.palette as any).border?.territory?.active || theme.palette.divider
          }`,
          borderRadius: "10px",
          boxShadow: "0px 3px 4px 0px rgba(0, 0, 0, 0.25)",
          pointerEvents: "auto",
        }}
      >
        {/* Home Button */}
        <Box
          onClick={() => navigate("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "5px 8px",
            borderRadius: "8px",
            backgroundColor: isHomePage
              ? (theme.palette as any).fill?.primary_light?.active || "rgba(252, 241, 232, 1)"
              : "transparent",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            "&:hover": {
              backgroundColor: isHomePage
                ? (theme.palette as any).fill?.primary_light?.hover || "rgba(252, 241, 232, 1)"
                : theme.palette.mode === "light"
                  ? "rgba(0, 0, 0, 0.04)"
                  : "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          <Home
            size={16}
            color={
              isHomePage
                ? (theme.palette as any).customText?.brand?.p1?.active || "#ff7300"
                : (theme.palette as any).customText?.primary?.p1?.active ||
                  theme.palette.text.primary
            }
            strokeWidth={2}
          />
          <Typography
            sx={{
              fontSize: "14px",
              fontFamily: "'Geist', sans-serif",
              fontWeight: 400,
              lineHeight: 1.5,
              color: isHomePage
                ? (theme.palette as any).customText?.brand?.p1?.active || "#ff7300"
                : (theme.palette as any).customText?.primary?.p1?.active ||
                  theme.palette.text.primary,
              whiteSpace: "nowrap",
            }}
          >
            Home
          </Typography>
        </Box>

        {/* Theme Toggle Button */}
        <IconButton
          color="inherit"
          aria-label="toggle theme"
          onClick={onThemeToggle}
          sx={{
            padding: "8px",
            color:
              (theme.palette as any).customText?.primary?.p1?.active || theme.palette.text.primary,
          }}
        >
          {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        {/* Menu Button */}
        <IconButton
          color="inherit"
          aria-label="open menu"
          onClick={onMenuClick}
          sx={{
            padding: "3px 5px 3px 0",
            color:
              (theme.palette as any).customText?.primary?.p1?.active || theme.palette.text.primary,
          }}
        >
          {open ? (
            <CloseOutlinedIcon sx={{ fontSize: "20px" }} />
          ) : (
            <MenuIcon sx={{ fontSize: "20px" }} />
          )}
        </IconButton>
      </Box>
    </AppBar>
  );
}
