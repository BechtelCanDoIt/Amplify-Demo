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

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { goToMyAppsScreen } from "@/components/microapp-bridge";

interface ExitToAppsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExitToAppsDialog({ open, onClose }: ExitToAppsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{ zIndex: 10000 }}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          p: 1.75,
          m: 2,
        },
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <DialogTitle sx={{ p: 0, fontSize: "1rem", fontWeight: 700, lineHeight: 1.5, color: "#1F2A44" }}>
            Return to Apps
          </DialogTitle>
          <DialogContent
            sx={{
              p: 0,
              pt: 1,
              fontSize: "0.875rem",
              lineHeight: 1.2,
              color: "#5F6368",
              whiteSpace: "normal",
            }}
          >
            Are you sure you want to leave this application?
          </DialogContent>
        </Box>

        <DialogActions sx={{ p: 0, justifyContent: "flex-end", gap: 1.25 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              minWidth: 98,
              borderRadius: 999,
              px: 2.25,
              py: 0.75,
              borderColor: "#ff7300",
              color: "#ff7300",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                borderColor: "#e86800",
                backgroundColor: "rgba(255, 115, 0, 0.06)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              goToMyAppsScreen();
            }}
            sx={{
              minWidth: 98,
              borderRadius: 999,
              px: 2.25,
              py: 0.75,
              backgroundColor: "#ff7300",
              color: "#fff",
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#e86800",
                boxShadow: "none",
              },
            }}
          >
            Leave
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
