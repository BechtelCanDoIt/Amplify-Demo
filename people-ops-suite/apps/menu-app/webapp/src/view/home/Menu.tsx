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

import ErrorHandler from "@component/common/ErrorHandler";
import { formatMenuData } from "@root/src/utils/utils";
import { Menu as MenuData } from "@services/menu.api";

import MenuCard from "./components/menu/MenuCard";

interface MenuProps {
  data: MenuData | undefined;
  isError: boolean;
}

export default function Menu({ data, isError }: MenuProps) {
  const theme = useTheme();

  if (isError || !data) {
    return <ErrorHandler message={"Oops something went wrong, Couldn't load the menu"} />;
  }

  const { date, ...meals } = data;
  const formatDate = formatMenuData(date);

  if (!meals.breakfast.title && !meals.lunch.title) {
    return <ErrorHandler message={`No menu available on ${formatDate}`} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body1" sx={{ color: theme.palette.customText.primary.p2.active, ml: 1 }}>
        {formatDate}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {Object.entries(meals).map(([mealType, mealData]) => {
          if (!mealData.title) return null;

          return <MenuCard key={mealType} mealType={mealType} mealData={mealData} />;
        })}
      </Box>
    </Box>
  );
}
