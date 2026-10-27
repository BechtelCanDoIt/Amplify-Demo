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
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { Box, Button, Dialog, DialogContent, Typography, useTheme } from "@mui/material";

import { useState } from "react";

import infoIcon from "@assets/images/info-icon.svg";
import { useDeleteDinnerRequestMutation } from "@root/src/services/dod.api";

interface CancelModalProps {
  handleCloseModal: () => void;
  isCancelDialogOpen: boolean;
}

export default function CancelModal(props: CancelModalProps) {
  const { isCancelDialogOpen, handleCloseModal } = props;

  const theme = useTheme();
  const [deleteDinnerRequest] = useDeleteDinnerRequestMutation();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleDeleteDinnerRequest = async () => {
    setIsSubmitting(true);
    try {
      await deleteDinnerRequest().unwrap();

      handleCloseModal();
      await wait(100);
    } catch (error) {
      console.error("Error occurred when deleting order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isCancelDialogOpen}
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
      sx={{
        borderRadius: "12px",
        bottom: "50%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
        }}
      >
        <Typography variant="h5">Cancel Your Dinner</Typography>
        <CloseOutlinedIcon
          onClick={handleCloseModal}
          sx={{ cursor: "pointer" }}
        ></CloseOutlinedIcon>
      </Box>

      <DialogContent
        sx={{
          color: theme.palette.customText.primary.p2.active,
          p: 2,
          pt: 0,
          overflow: "visible",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box
              component="img"
              src={infoIcon}
              alt="info"
              sx={{
                width: 16,
                height: 16,
                alignItems: "center",
              }}
            />
            <Typography variant="body2" sx={{ color: theme.palette.customText.primary.p3.active }}>
              Are you sure you want to cancel your Dinner ?
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              onClick={handleCloseModal}
              disabled={isSubmitting}
              sx={{
                width: "100%",
                py: 1,
                alignItems: "center",
                border: `1px solid ${theme.palette.customBorder.primary.active}`,
                borderRadius: "4px",
                color: theme.palette.customText.primary.p2.active,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  border: `1px solid ${theme.palette.customBorder.brand.active}`,
                  color: theme.palette.customText.brand.p1.active,
                  background: "none",
                },
              }}
            >
              No Keep My Order
            </Button>
            <Button
              onClick={handleDeleteDinnerRequest}
              sx={{
                width: "100%",
                py: 1,
                alignItems: "center",
                border: `1px solid ${
                  isSubmitting
                    ? theme.palette.customBorder.brand.disabled
                    : theme.palette.customBorder.primary.active
                }`,
                borderRadius: "4px",
                color: isSubmitting
                  ? theme.palette.customText.brand.p1.disabled
                  : theme.palette.customText.primary.p2.active,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  border: `1px solid ${theme.palette.customBorder.brand.active}`,
                  color: !isSubmitting ? theme.palette.customText.brand.p1.active : undefined,
                  background: "none",
                },
              }}
            >
              {isSubmitting ? "Cancelling Order" : "Yes Cancel My Order"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
