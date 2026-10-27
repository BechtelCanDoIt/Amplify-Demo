// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { createContext, ReactNode, useContext, useState } from "react";
import MuiSnackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { SnackbarContextType, SnackbarOptions } from "./types";

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined,
);

const variantToSeverity = (
  variant?: string,
): "error" | "success" | "warning" | "info" => {
  switch (variant) {
    case "error":
      return "error";
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "info";
  }
};

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [snackbar, setSnackbar] = useState<SnackbarOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showSnackbar = (options: SnackbarOptions) => {
    const finalOptions = {
      ...options,
      variant: options.variant || ("info" as const),
      position: options.position || ("top" as const),
    };
    if (isVisible) {
      setIsVisible(false);
      setTimeout(() => {
        setSnackbar(finalOptions);
        setIsVisible(true);
      }, 300);
    } else {
      setSnackbar(finalOptions);
      setIsVisible(true);
    }
  };

  const hideSnackbar = () => {
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setSnackbar(null);
    }, 300);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <MuiSnackbar
        open={isVisible && !!snackbar}
        autoHideDuration={snackbar?.duration || 3000}
        onClose={handleClose}
        anchorOrigin={{
          vertical: snackbar?.position === "bottom" ? "bottom" : "top",
          horizontal: "center",
        }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={handleClose}
          severity={variantToSeverity(snackbar?.variant)}
          variant="filled"
          sx={{
            width: "100%",
            maxWidth: 448,
            borderRadius: "12px",
            fontWeight: 500,
            fontSize: "0.875rem",
          }}
          icon={snackbar?.icon ? <>{snackbar.icon}</> : undefined}
        >
          {snackbar?.message}
        </Alert>
      </MuiSnackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};
