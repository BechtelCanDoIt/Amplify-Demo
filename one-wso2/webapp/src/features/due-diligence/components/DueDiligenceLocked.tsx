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

import { Box, Button, Card, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import { Link as RouterLink } from "react-router";
import { DUE_DILIGENCE_APPS } from "@constants/dueDiligenceApps";

// What someone sees when they open Due Diligence without holding any of its
// due-diligence roles. Rendered by DueDiligenceShell for `isAuthorized: false`
// only. Same treatment and reasoning as MarketingOpsLocked — a neutral padlock
// panel rather than an Alert, because nothing has failed; the person opened a
// door that isn't theirs yet.
export default function DueDiligenceLocked() {
  const AppIcon = DUE_DILIGENCE_APPS[0].icon;
  return (
    <Card variant="outlined" sx={{ mt: 1.5, p: 3, maxWidth: 620 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: "background.default",
            border: 1,
            borderColor: "divider",
            color: "text.secondary",
          }}
          aria-hidden="true"
        >
          <LockIcon size={19} />
        </Box>
        <Box>
          <Typography
            component="h2"
            sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", mb: 0.6 }}
          >
            You don't have access yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "52ch" }}>
            Access comes from your Asgardeo groups. Ask a Due Diligence admin for the
            group that covers the work you need to do.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: "1px", bgcolor: "divider", my: 2.25 }} />

      <Typography
        component="h3"
        variant="overline"
        sx={{ color: "text.secondary", display: "block", mb: 1.25 }}
      >
        What's inside
      </Typography>
      <Box sx={{ display: "grid", gap: "0.55rem 1.5rem" }}>
        {DUE_DILIGENCE_APPS[0].items.map((item) => (
          <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1.15, minWidth: 0 }}>
            <Box
              sx={{
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: 0.75,
                display: "grid",
                placeItems: "center",
                bgcolor: "background.default",
                border: 1,
                borderColor: "divider",
                color: "text.secondary",
              }}
              aria-hidden="true"
            >
              <AppIcon size={13} />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {item.label}
            </Typography>
            <Box sx={{ ml: "auto", display: "flex", color: "text.disabled", flexShrink: 0 }} aria-hidden="true">
              <LockIcon size={12} />
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ height: "1px", bgcolor: "divider", my: 2.25 }} />

      <Button
        component={RouterLink}
        to="/me"
        variant="outlined"
        startIcon={<ArrowLeftIcon size={15} />}
        sx={{ textTransform: "none", fontSize: 13, fontWeight: 600 }}
      >
        Back to Home
      </Button>
    </Card>
  );
}
