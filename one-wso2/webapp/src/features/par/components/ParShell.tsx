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

import type { ReactNode } from "react";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";
import { isParBackendConfigured } from "../api/useParData";

// Shared page frame for the Employee and Lead Portals: a title + optional
// subtitle, and one place that renders the "backend not configured" state
// so both behave the same when ONE_WSO2_PAR_BACKEND_URL isn't set. Same
// shape as LeaveShell/FinanceShell — title/subtitle are the CALLER's own
// heading, not a shared app-name banner: each portal already names itself,
// so a generic "Performance Appraisal Review" label above that would say
// the same thing twice.
export default function ParShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const configured = isParBackendConfigured();
  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
          {subtitle}
        </Typography>
      )}

      {configured ? (
        children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          PAR isn't connected yet. Set <code>ONE_WSO2_PAR_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> (the par-app backend URL) and reload.
        </Alert>
      )}
    </Box>
  );
}
