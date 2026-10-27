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

import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useMicroappStore } from "../../stores/microapp/microapp";

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  {
    path: "/create-visit",
    label: "New Visit",
    icon: <AddCircleOutlineIcon />,
  },
  {
    path: "/visit-history",
    label: "History",
    icon: <AccessTimeIcon />,
  },
];

const Tabbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { deviceSafeAreaInsets } = useMicroappStore();

  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        borderTop: "1px solid #E9EBF5",
        display: "flex",
        justifyContent: "space-around",
        paddingBottom: deviceSafeAreaInsets.bottom
          ? deviceSafeAreaInsets.bottom + "px"
          : "8px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <ButtonBase
            key={tab.path}
            onClick={() => navigate(tab.path)}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 1,
              px: 2,
              minWidth: 80,
              color: isActive ? "#FF7300" : "#7E87AD",
              transition: "color 0.2s",
            }}
          >
            {tab.icon}
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, mt: 0.25, fontSize: "0.75rem" }}
            >
              {tab.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};

export default Tabbar;
