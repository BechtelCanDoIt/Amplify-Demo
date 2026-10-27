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
import { Alert, Box, Chip, CircularProgress, IconButton, Stack, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon, type LucideIcon } from "@wso2/oxygen-ui-icons-react";
import { isDueDiligenceBackendConfigured } from "@config/apiConfig";
import { useDueDiligenceGate } from "../api/useDueDiligenceGate";
import DueDiligenceLocked from "./DueDiligenceLocked";
import ErrorNotice from "@components/error-notice/ErrorNotice";

// Shared page frame for every Due Diligence screen — the actual access
// boundary for this app, not a cosmetic wrapper. `requireAuthorized` defaults
// to true, so EVERY page that renders its content through this shell is
// blocked for anyone the gate does not report as authorized, independent of
// whether the rail even offered them a link here. One place owns all four
// degraded states so no page has to remember them and none renders them
// differently:
//
//   1. backend URL not set     → say which config key is missing
//   2. /user-info still in flight → spinner, never a premature denial
//   3. /user-info failed       → an error with a retry, NOT a denial
//   4. no due-diligence role   → say plainly that access is missing
//
// Same role and same reasoning as MarketingOpsShell — see the note there on
// why states 3 and 4 must stay distinct.
export default function DueDiligenceShell({
  back,
  eyebrow,
  title,
  headerActions,
  subtitle,
  requireAuthorized = true,
  children,
}: {
  // Renders below the eyebrow chip and above the title — a "Return to X" /
  // bare back arrow belongs with the rest of the page's navigation chrome,
  // not below its own heading. `label` is optional: some of these pages show
  // only the arrow (often paired with a status chip in the page's own
  // content instead).
  back?: { label?: string; onClick: () => void };
  eyebrow?: { icon: LucideIcon; label: string };
  title: string;
  // Renders on the SAME line as the title, pushed to the far end (a
  // ButtonGroup like Partner dashboard's "Generate Report" / edit-access
  // actions) — not a row of its own below it.
  headerActions?: ReactNode;
  subtitle?: string;
  requireAuthorized?: boolean;
  children: ReactNode;
}) {
  const configured = isDueDiligenceBackendConfigured();
  // Only ask the backend who we are once we know there's a backend to ask.
  const gate = useDueDiligenceGate(configured);

  const isLocked =
    configured &&
    requireAuthorized &&
    !gate.isResolving &&
    !gate.isError &&
    !gate.isAuthorized;

  // Mirrors exactly the condition under which DueDiligenceBody renders
  // `children` below — headerActions carry real write actions (Generate
  // Report, Enable/Disable TR, Activate/Deactivate...), so they must not be
  // reachable while the body itself is showing a locked/loading/error state.
  const canRenderProtectedContent =
    configured && (!requireAuthorized || (!gate.isResolving && !gate.isError && gate.isAuthorized));

  return (
    <Box>
      {eyebrow && (
        <Chip
          icon={<eyebrow.icon size={14} />}
          label={eyebrow.label}
          color="primary"
          variant="outlined"
          size="small"
          sx={{ mb: 0.5 }}
        />
      )}
      {back && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <IconButton aria-label="back" size="small" onClick={back.onClick}>
            <ArrowLeftIcon size={18} />
          </IconButton>
          {back.label && (
            <Typography variant="body2" color="text.secondary">
              {back.label}
            </Typography>
          )}
        </Stack>
      )}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mb: 0.5 }}>
        <Typography component="h1" variant="h5" sx={{ mt: 0 }}>
          {title}
        </Typography>
        {canRenderProtectedContent && headerActions}
      </Stack>
      {subtitle && !isLocked && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      <DueDiligenceBody configured={configured} gate={gate} requireAuthorized={requireAuthorized}>
        {children}
      </DueDiligenceBody>
    </Box>
  );
}

function DueDiligenceBody({
  configured,
  gate,
  requireAuthorized,
  children,
}: {
  configured: boolean;
  gate: ReturnType<typeof useDueDiligenceGate>;
  requireAuthorized: boolean;
  children: ReactNode;
}) {
  if (!configured) {
    return (
      <Alert severity="info" sx={{ mt: 1.5 }}>
        Due Diligence isn't connected yet. Set{" "}
        <code>ONE_WSO2_DUE_DILIGENCE_BACKEND_URL</code> in <code>public/config.js</code>{" "}
        (the backend URL) and reload.
      </Alert>
    );
  }

  if (requireAuthorized && gate.isResolving) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Checking your Due Diligence access…
        </Typography>
      </Stack>
    );
  }

  if (requireAuthorized && gate.isError) {
    return (
      <ErrorNotice onRetry={gate.retry} sx={{ mt: 1.5 }}>
        Couldn't check your Due Diligence access. {gate.errorMessage}
      </ErrorNotice>
    );
  }

  if (requireAuthorized && !gate.isAuthorized) {
    return <DueDiligenceLocked />;
  }

  return <>{children}</>;
}
