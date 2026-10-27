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

import { Avatar, Grid, IconButton, Paper, Typography } from "@wso2/oxygen-ui";
import { EyeIcon } from "@wso2/oxygen-ui-icons-react";
import type { PromotionEmployee } from "../api/types";

// Ports source's own roster card — identical markup in both
// employeesHistory.tsx and indirectReports.tsx, so one shared component
// here instead of two copies. "N/A" fallbacks match source's own literal
// text on this screen (elsewhere in this app that's an em dash — kept as
// "N/A" here specifically since that's what source's own running screen
// shows). Last Promoted Date is source's own commented-out field
// ("Temporary removal") — left out here too, matching what actually
// renders rather than the dead markup around it.
export default function PromotionEmployeeCard({
  employee,
  onView,
}: {
  employee: PromotionEmployee;
  onView: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ px: 2, py: 1.5, mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
    >
      <Avatar src={employee.employeeThumbnail ?? undefined} sx={{ width: "2.2rem", height: "2.2rem", borderRadius: 3 }} />

      <Grid container spacing={2} sx={{ flexGrow: 1, width: "100%" }}>
        <Field size={3} label="Full Name" value={`${employee.firstName ?? "N/A"} ${employee.lastName ?? "N/A"}`} />
        <Field size={3} label="Work Email" value={employee.workEmail ?? "N/A"} />
        <Field size={2} label="Current Job Band" value={String(employee.jobBand ?? "N/A")} />
        <Field size={2} label="Current Job Role" value={employee.jobRole ?? "N/A"} />
        <Field size={2} label="Start Date" value={employee.startDate ?? "N/A"} />
      </Grid>

      <IconButton color="primary" onClick={onView}>
        <EyeIcon size={20} />
      </IconButton>
    </Paper>
  );
}

function Field({ size, label, value }: { size: number; label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: size }}>
      <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "text.secondary" }}>{label}:</Typography>
      <Typography variant="body2">{value}</Typography>
    </Grid>
  );
}
