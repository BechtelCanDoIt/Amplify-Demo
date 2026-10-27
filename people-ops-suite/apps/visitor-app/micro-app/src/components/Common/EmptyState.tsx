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

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, icon }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
        textAlign: "center",
      }}
    >
      {icon && <Box sx={{ color: "#8F9BBB", mb: 2 }}>{icon}</Box>}
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, color: "#4B5064", mb: 1 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "#7E87AD" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default EmptyState;
