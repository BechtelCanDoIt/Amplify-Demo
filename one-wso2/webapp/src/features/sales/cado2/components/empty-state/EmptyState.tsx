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

import type { JSX, ReactNode } from "react";
import { Box, Paper, Typography } from "@wso2/oxygen-ui";

interface EmptyStateProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly body?: ReactNode;
  /** A call to action, e.g. a button. */
  readonly action?: ReactNode;
  /** Inside a card: a smaller icon and no box of its own (2026-10-13). */
  readonly compact?: boolean;
}

/**
 * A friendly "nothing here yet" panel with a way forward: page-sized by
 * default, `compact` inside a card.
 */
export default function EmptyState({ icon, title, body, action, compact = false }: EmptyStateProps): JSX.Element {
  if (compact) {
    return (
      <Box sx={{ py: 3, textAlign: "center" }}>
        <Box
          aria-hidden
          sx={{ width: 40, height: 40, mx: "auto", mb: 1.5, borderRadius: 2, display: "grid", placeItems: "center", color: "text.secondary", bgcolor: "action.hover" }}
        >
          {icon}
        </Box>
        <Typography variant="body1" component="p" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {body ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420, mx: "auto" }}>
            {body}
          </Typography>
        ) : null}
        {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
      </Box>
    );
  }
  return (
    <Paper variant="outlined" sx={{ p: { xs: 4, sm: 6 }, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
      <Box
        aria-hidden
        sx={{ width: 56, height: 56, mx: "auto", mb: 2, borderRadius: 3, display: "grid", placeItems: "center", color: "primary.main", bgcolor: "action.selected" }}
      >
        {icon}
      </Box>
      <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {body ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420, mx: "auto" }}>
          {body}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2.5 }}>{action}</Box> : null}
    </Paper>
  );
}
