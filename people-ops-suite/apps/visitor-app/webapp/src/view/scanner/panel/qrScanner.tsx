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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import {
  CameraFront,
  CameraRear,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
} from "@mui/icons-material";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { useAppDispatch } from "@root/src/slices/store";
import { useNavigate } from "react-router-dom";

type FacingMode = "environment" | "user";

const QrScanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const hasScannedRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");

  const readerId = "qr-reader";

  const safeStop = useCallback(async () => {
    try {
      if (html5QrCodeRef.current && isRunningRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        isRunningRef.current = false;
      }
    } catch {
      // ignore — prevents "scanner not running" error
    }
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const toggleCamera = async () => {
    await safeStop();
    hasScannedRef.current = false;
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    const startScanner = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const readerElement = document.getElementById(readerId);
      if (!readerElement) return;

      try {
        html5QrCodeRef.current = new Html5Qrcode(readerId);

        const qrboxSize = { width: 900, height: 600 };

        await html5QrCodeRef.current.start(
          { facingMode },
          {
            fps: 12,
            qrbox: qrboxSize,
          },
          async (decodedText: string) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            await safeStop();
            setIsFullscreen(false);

            navigate(
              `/admin-panel?tab=active-visits&visitVerificationCode=${decodedText}`,
            );
          },
          () => {},
        );

        isRunningRef.current = true;
      } catch {
        dispatch(
          enqueueSnackbarMessage({
            message: "Unable to access camera",
            type: "error",
          }),
        );
      }
    };

    startScanner();

    return () => {
      safeStop();
    };
  }, [dispatch, navigate, safeStop, facingMode, isFullscreen]);

  // Fullscreen QR Scanner overlay
  if (isFullscreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          bgcolor: "#000",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar with controls */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            zIndex: 10000,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
          }}
        >
          <Tooltip title="Close fullscreen">
            <IconButton onClick={toggleFullscreen} sx={{ color: "#fff" }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>

          <Typography
            variant="subtitle1"
            sx={{ color: "#fff", fontWeight: 600 }}
          >
            Scan QR Code
          </Typography>

          <Tooltip
            title={
              facingMode === "environment"
                ? "Switch to front camera"
                : "Switch to back camera"
            }
          >
            <IconButton onClick={toggleCamera} sx={{ color: "#fff" }}>
              {facingMode === "environment" ? <CameraFront /> : <CameraRear />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Scanner view */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Box
            id={readerId}
            sx={{
              width: "100%",
              height: "100%",
              "& video": {
                objectFit: "cover !important",
                width: "100% !important",
                height: "100% !important",
              },
            }}
          />
        </Box>

        {/* Bottom hint */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            p: 3,
            textAlign: "center",
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
          }}
        >
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            Position the QR code within the frame
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1 }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          flex: 1,
          bgcolor: "#000",
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          id={readerId}
          sx={{
            width: "100%",
            height: "100%",
            "& video": {
              objectFit: "cover !important",
              width: "100% !important",
              height: "100% !important",
            },
          }}
        />

        {/* Controls overlay inside camera window */}
        <Box
          sx={{
            position: "absolute",
            bottom: 12,
            right: 12,
            display: "flex",
            gap: 1,
            zIndex: 10,
          }}
        >
          <Tooltip
            title={
              facingMode === "environment"
                ? "Switch to front camera"
                : "Switch to back camera"
            }
          >
            <IconButton
              size="small"
              onClick={toggleCamera}
              sx={{
                bgcolor: "rgba(0,0,0,0.5)",
                color: "#fff",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              {facingMode === "environment" ? <CameraFront /> : <CameraRear />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Fullscreen scanner">
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{
                bgcolor: "rgba(0,0,0,0.5)",
                color: "#fff",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 0.5, display: "block" }}
      >
        Ensure the QR code is clear and visible to the camera.
      </Typography>
    </Box>
  );
};

export default QrScanner;
