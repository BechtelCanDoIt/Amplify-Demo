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
import { Box, Button, useMediaQuery, useTheme } from "@mui/material";
import { useFormik } from "formik";

import { useCallback } from "react";

import { DinnerRequest, MealOption } from "@/types/types";
import { MEAL_OPTIONS } from "@config/constant";
import { useSubmitDinnerRequestMutation } from "@services/dod.api";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { useAppDispatch } from "@slices/store";

import DodInfoMessage from "./DodInfoMessage";
import { MealOptionBox } from "./MealOptionBox";
import { OrderInfoSection } from "./OrderInfo";

interface DodFormProps {
  dinner: DinnerRequest | undefined;
  userInfo: any;
  initialMealOption: MealOption | null;
  orderPlaced: boolean;
  isFormDisabled: boolean;
  onCancelClick: () => void;
}

export const DodForm = ({
  dinner,
  userInfo,
  initialMealOption,
  orderPlaced,
  isFormDisabled,
  onCancelClick,
}: DodFormProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const [submitDinner, { isLoading: isSubmittingDinner }] = useSubmitDinnerRequestMutation();

  const handleSubmit = useCallback(
    async (mealOption: MealOption | null) => {
      if (!mealOption || !userInfo) {
        dispatch(
          enqueueSnackbarMessage({
            message:
              "Unable to submit your dinner request. Please try refreshing the page or signing in again.",
            type: "error",
          }),
        );
        return;
      }

      const date = new Date().toLocaleDateString("en-CA");

      const submitPayload: DinnerRequest = {
        id: dinner?.id,
        mealOption,
        date,
        department: userInfo.department,
        team: userInfo.team,
        managerEmail: userInfo.managerEmail,
      };

      await submitDinner(submitPayload).unwrap();
    },
    [dinner?.id, userInfo, submitDinner, dispatch],
  );

  const formik = useFormik({
    initialValues: { mealOption: initialMealOption },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await handleSubmit(values.mealOption);
      } catch (error) {
        console.error("Failed to submit dinner request:", error);
      }
    },
  });

  const handleMealOptionClick = useCallback(
    (mealValue: MealOption) => {
      if (isFormDisabled) return;

      const isCurrentlySelected = formik.values.mealOption === mealValue;
      const isOriginallyOrdered = initialMealOption === mealValue;

      if (isCurrentlySelected) {
        if (isOriginallyOrdered && orderPlaced) return;
        formik.setFieldValue("mealOption", null);
      } else {
        formik.setFieldValue("mealOption", mealValue);
      }
    },
    [formik, isFormDisabled, initialMealOption, orderPlaced],
  );

  // Simple derived state - no need for useMemo
  const isUpdatingOrder = orderPlaced && formik.values.mealOption !== initialMealOption;

  const isSubmitDisabled =
    isSubmittingDinner ||
    isFormDisabled ||
    !formik.values.mealOption ||
    (orderPlaced && formik.values.mealOption === initialMealOption);

  const submitButtonText = orderPlaced
    ? formik.isSubmitting
      ? "Updating Dinner"
      : "Update Dinner"
    : formik.isSubmitting
      ? "Ordering Dinner"
      : "Order Dinner";

  return (
    <Box
      component="form"
      onSubmit={formik.handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Meal Options */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          width: "100%",
          gap: 2,
        }}
      >
        {MEAL_OPTIONS.map((meal) => (
          <MealOptionBox
            key={meal.value}
            meal={{ ...meal, icon: <meal.icon /> }}
            isSelected={formik.values.mealOption === meal.value}
            isOrdered={initialMealOption === meal.value && isUpdatingOrder}
            isDisabled={isFormDisabled}
            onClick={() => handleMealOptionClick(meal.value)}
          />
        ))}
      </Box>

      {/* Info Message */}
      <DodInfoMessage />

      {/* Order Info */}
      {initialMealOption && (
        <OrderInfoSection mealType={initialMealOption} onCancelClick={onCancelClick} />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitDisabled}
        sx={{
          px: 2,
          py: 1,
          backgroundColor: theme.palette.fill.primary.active,
          boxShadow: "none",
          width: "fit-content",
          "&:hover": {
            backgroundColor: theme.palette.fill.primary.active,
            boxShadow: "none",
          },
        }}
      >
        {submitButtonText}
      </Button>
    </Box>
  );
};
