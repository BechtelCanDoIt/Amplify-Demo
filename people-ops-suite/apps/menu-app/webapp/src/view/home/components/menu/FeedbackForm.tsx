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
import { Box, Button, TextField, Typography, useTheme } from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useMemo, useState } from "react";

import { menuApi, useSubmitFeedbackMutation } from "@services/menu.api";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { useAppDispatch, useAppSelector } from "@slices/store";
import { formatMenuData } from "@utils/utils";
import { useFeedback } from "@view/home/hooks/useFeedBack";

interface FeedbackFormProps {
  handleCloseFeedback: () => void;
}

const FeedbackForm = (props: FeedbackFormProps) => {
  const { handleCloseFeedback } = props;
  const theme = useTheme();
  const [submitFeedback] = useSubmitFeedbackMutation();
  const menu = useAppSelector((state) => menuApi.endpoints.getMenu.select()(state)?.data);
  const dispatch = useAppDispatch();

  const [isFocused, setIsFocused] = useState(false);

  const { useFeedbackTime } = useFeedback();

  const date = formatMenuData(menu?.date) ?? "";

  const validationSchema = useMemo(
    () =>
      Yup.object({
        message: Yup.string()
          .min(10, "Feedback must be at least 10 characters")
          .required("Feedback is required"),
      }),
    [],
  );

  const formik = useFormik({
    initialValues: { message: "" },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await submitFeedback({ message: values.message }).unwrap();
        resetForm();
        handleCloseFeedback();
      } catch (error) {
        console.error("Failed to submit feedback:", error);
        dispatch(
          enqueueSnackbarMessage({
            message: "Failed to submit meal feedback. Try again...",
            type: "error",
          }),
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const isFeedbackTime = useFeedbackTime();

  if (!isFeedbackTime) {
    return (
      <Typography
        variant="body1"
        sx={{
          "& strong": {
            fontWeight: 500,
            color: "#000",
          },
        }}
      >
        Feedback is accepted only on{" "}
        <span style={{ color: theme.palette.customText.brand.p1.active, fontWeight: 500 }}>{date}</span>
        {" "}from{" "}
        <span style={{ color: theme.palette.customText.brand.p1.active, fontWeight: 500 }}>12:00PM - 04:15PM</span>.{" "}
        <span style={{ fontStyle: "italic", color: theme.palette.customText.brand.p1.active }}>
          Your email will be recorded along with your feedback.
        </span>
      </Typography>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={formik.handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography
        variant="body2"
        sx={{
          fontStyle: "italic",
          color: theme.palette.customText.brand.p1.active,
        }}
      >
        Your email will be recorded along with your feedback.
      </Typography>
      <TextField
        id="feedback-message"
        name="message"
        label="Share your feedback"
        variant="outlined"
        multiline
        rows={4}
        value={formik.values.message}
        onChange={formik.handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          setIsFocused(false);
          formik.handleBlur(e);
        }}
        error={!isFocused && formik.touched.message && Boolean(formik.errors.message)}
        helperText={!isFocused && formik.touched.message && formik.errors.message}
        sx={{
          width: "100%",
          "& .MuiOutlinedInput-root": {
            minHeight: "100px",
            padding: "16px 12px",
            alignItems: "flex-start",
            borderRadius: "8px",
            "& fieldset": {
              borderColor: "#E6E6E6",
            },
            "&:hover fieldset": {
              borderColor: "#ccc",
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.customBorder.secondary.active,
            },
          },
          "& .MuiOutlinedInput-input": {
            padding: 0,
          },
          // Label styling (default state)
          "& .MuiInputLabel-root": {
            color: theme.palette.customText.primary.p3.active,
            fontSize: "16px",
          },
          // Label when focused
          "& .MuiInputLabel-root.Mui-focused": {
            color: theme.palette.customBorder.secondary.active,
          },
          // Label when filled
          "& .MuiInputLabel-shrink": {
            color: theme.palette.customBorder.secondary.active,
          },
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "right", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => {
            formik.resetForm();
            handleCloseFeedback();
          }}
          disabled={formik.isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
          {formik.isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </Box>
    </Box>
  );
};

export default FeedbackForm;
