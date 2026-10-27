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
import BlenderOutlinedIcon from "@mui/icons-material/BlenderOutlined";
import BreakfastDiningOutlinedIcon from "@mui/icons-material/BreakfastDiningOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CookieOutlinedIcon from "@mui/icons-material/CookieOutlined";
import DinnerDiningOutlinedIcon from "@mui/icons-material/DinnerDiningOutlined";
import LunchDiningOutlinedIcon from "@mui/icons-material/LunchDiningOutlined";
import {
  Box,
  Card,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

import { useState } from "react";

import FeedbackForm from "./FeedbackForm";

interface MealData {
  title: string | null;
  description: string | null;
}

interface MenuCardProps {
  mealType: string;
  mealData: MealData;
}

export default function MenuCard(props: MenuCardProps) {
  const { mealType, mealData } = props;

  const theme = useTheme();

  // State to control modal open/close
  const [openFeedback, setOpenFeedback] = useState(false);

  const handleOpenFeedback = () => {
    setOpenFeedback(true);
  };

  const handleCloseFeedback = () => {
    setOpenFeedback(false);
  };

  // Define time ranges for each meal type
  const mealTimeRanges: Record<string, string> = {
    breakfast: "07:30 - 09:30",
    juice: "10:30 - 11:00",
    lunch: "12:00 - 14:00",
    dessert: "12:00 - 14:00",
    snack: "15:30 - 16:30",
  };

  return (
    <>
      <Card
        key={mealType}
        sx={{
          display: "flex",
          padding: "16px",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "16px",
          borderRadius: "12px",
          border: `1px solid ${theme.palette.customBorder.territory.active}`,
          background: theme.palette.surface.secondary.active,
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: theme.palette.customText.primary.p2.active,
            }}
          >
            {mealType.toLocaleLowerCase() === "breakfast" && <BreakfastDiningOutlinedIcon />}
            {mealType.toLocaleLowerCase() === "juice" && <BlenderOutlinedIcon />}
            {mealType.toLocaleLowerCase() === "lunch" && <DinnerDiningOutlinedIcon />}
            {mealType.toLocaleLowerCase() === "dessert" && <CookieOutlinedIcon />}
            {mealType.toLocaleLowerCase() === "snack" && <LunchDiningOutlinedIcon />}
            <Typography
              variant="h5"
              sx={{
                textTransform: "capitalize",
              }}
            >
              {mealType}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.customText.primary.p3.active,
              fontSize: "14px",
            }}
          >
            {mealTimeRanges[mealType.toLocaleLowerCase()]}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: theme.palette.customText.primary.p3.active,
            lineHeight: 1.6,
            minHeight: "60px",
          }}
        >
          {mealData.description ?? ""}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.customText.primary.p2.active,
              fontWeight: 500,
            }}
          >
            Supplier : {mealData.title}
          </Typography>

          <IconButton
            onClick={handleOpenFeedback}
            disabled={mealType !== "lunch"}
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              border: `1px solid ${theme.palette.customBorder.brand.active}`,
              px: 1,
              py: 0.5,
              borderRadius: 0.5,
              color: theme.palette.customText.brand.p1.active,
              visibility: mealType !== "lunch" ? "hidden" : "visible",
              "&:hover": {
                backgroundColor: alpha(theme.palette.fill.primary_light.active, 0.5),
              },
            }}
          >
            <ChatOutlinedIcon />
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
              }}
            >
              Feedback
            </Typography>
          </IconButton>
        </Box>
      </Card>

      {/* Feedback Modal */}
      <Dialog
        open={openFeedback}
        onClose={handleCloseFeedback}
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
            backgroundColor: theme.palette.surface.primary.active,
          }}
        >
          <Typography variant="h5">Lunch Feedback</Typography>

          <CloseOutlinedIcon
            onClick={handleCloseFeedback}
            sx={{ cursor: "pointer" }}
          ></CloseOutlinedIcon>
        </Box>

        <DialogContent
          sx={{
            backgroundColor: theme.palette.surface.primary.active,
            color: theme.palette.customText.primary.p2.active,
            p: 2,
            pt: 0,
            overflow: "visible",
          }}
        >
          <FeedbackForm handleCloseFeedback={handleCloseFeedback} />
        </DialogContent>
      </Dialog>
    </>
  );
}
