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
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText: string;
  cancelText: string;
}

interface DialogContextType {
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => void;
  hideConfirmation: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel",
  });

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = "Confirm",
    cancelText: string = "Cancel",
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
    });
  };

  const hideConfirmation = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    dialog.onConfirm();
    hideConfirmation();
  };

  const slideUp = keyframes`
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  `;

  return (
    <DialogContext.Provider value={{ showConfirmation, hideConfirmation }}>
      {children}
      <Backdrop
        open={dialog.isOpen}
        onClick={hideConfirmation}
        sx={{
          zIndex: 9999,
          bgcolor: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
          alignItems: "flex-end",
        }}
      >
        <Fade in={dialog.isOpen}>
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: "100%",
              bgcolor: "#fff",
              borderRadius: "20px 20px 0 0",
              overflow: "hidden",
              animation: dialog.isOpen
                ? `${slideUp} 0.35s cubic-bezier(0.16,1,0.3,1)`
                : "none",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {/* Drag handle */}
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: "#D1D5E0",
                }}
              />
            </Box>

            {/* Content */}
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "#1E2132",
                  mb: 1,
                }}
              >
                {dialog.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#6B7294",
                  lineHeight: 1.6,
                  fontSize: "0.875rem",
                }}
              >
                {dialog.message}
              </Typography>
            </Box>

            {/* Actions */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                px: 3,
                pb: 3,
                pt: 1,
              }}
            >
              <Button
                fullWidth
                onClick={handleConfirm}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#fff",
                  background: "linear-gradient(135deg, #FF7300, #FF8C33)",
                  borderRadius: "12px",
                  py: 1.3,
                  boxShadow: "0 4px 12px rgba(255,115,0,0.3)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #E56600, #FF7300)",
                    boxShadow: "0 6px 16px rgba(255,115,0,0.4)",
                  },
                }}
              >
                {dialog.confirmText}
              </Button>
              <Button
                fullWidth
                onClick={hideConfirmation}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#6B7294",
                  bgcolor: "transparent",
                  borderRadius: "12px",
                  py: 1.3,
                  "&:hover": { bgcolor: "#F3F4F8" },
                }}
              >
                {dialog.cancelText}
              </Button>
            </Box>
          </Box>
        </Fade>
      </Backdrop>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
};
