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

import { Box, Grid, Typography } from "@wso2/oxygen-ui";

export interface PromotionTableColumn {
  title: string;
  /** Out of 12, matching source's own Grid `xs` sizing. */
  size: number;
  align: "left" | "right" | "center";
}

// Ports promotion-app's own component/recommendation/header.tsx — a plain
// bold column-title row, shared by the Lead Portal's Pending Requests and
// History tabs (source reuses the same component for both).
export default function PromotionTableHeader({ columns }: { columns: PromotionTableColumn[] }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px dashed",
        borderColor: "divider",
        // Matches the `p: 2` every row component below uses on its own Grid
        // container — anything else and the header labels drift out of
        // register with the column content beneath them.
        px: 2,
        py: 0.75,
        mb: 0.75,
      }}
    >
      <Grid container spacing={2} sx={{ width: "100%" }}>
        {columns.map((column, i) => (
          <Grid key={i} size={column.size} sx={{ display: "flex", justifyContent: column.align }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{column.title}</Typography>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
