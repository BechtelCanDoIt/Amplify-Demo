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
import { Box, Typography, useTheme } from "@mui/material";
import { SerializedError } from "@reduxjs/toolkit";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { useCallback, useState } from "react";

import { DinnerRequest } from "@/types/types";
import ErrorHandler from "@component/common/ErrorHandler";
import { RootState, useAppSelector } from "@slices/store";

import CancelModal from "./components/dod/CancelModal";
import { DodForm } from "./components/dod/DodForm";
import DodInfoMessage from "./components/dod/DodInfoMessage";
import { useDodTimeActive } from "./components/dod/hooks/useDodTimeActive";

interface DinnerOnDemandProps {
  dinner?: DinnerRequest;
  error?: FetchBaseQueryError | SerializedError;
}

export default function DinnerOnDemand({ dinner, error }: DinnerOnDemandProps) {
  const theme = useTheme();
  const userInfo = useAppSelector((state: RootState) => state.user.userInfo);
  const isDodTimeActive = useDodTimeActive();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const is404 = error && "status" in error && error.status === 404;
  const initialMealOption = is404 ? null : (dinner?.mealOption ?? null);
  const orderPlaced = !!initialMealOption;
  const isFormDisabled = !isDodTimeActive;

  const handleOpenCancelDialog = useCallback(() => setIsCancelDialogOpen(true), []);
  const handleCloseCancelDialog = useCallback(() => setIsCancelDialogOpen(false), []);

  if (error && !is404) {
    return <ErrorHandler message="Failed to load dinner request" />;
  }

  if (isFormDisabled) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          alignItems: "center",
          pt: 6
        }}
      >
        <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p2.active }}>
          Dinner On Demand
        </Typography>

        <DodInfoMessage />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
          Dinner On Demand
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography
            variant="body1"
            sx={{ color: theme.palette.customText.primary.p2.active, fontWeight: 500 }}
          >
            Select a meal option
          </Typography>

          <DodForm
            dinner={dinner}
            userInfo={userInfo}
            initialMealOption={initialMealOption}
            orderPlaced={orderPlaced}
            isFormDisabled={isFormDisabled}
            onCancelClick={handleOpenCancelDialog}
          />
        </Box>
      </Box>

      <CancelModal
        handleCloseModal={handleCloseCancelDialog}
        isCancelDialogOpen={isCancelDialogOpen}
      />
    </>
  );
}
