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
import { Navigate, Outlet } from "react-router";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { ReceiptTextIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { NothingHere, PageTitle } from "@components/perspective-landing/PerspectiveLanding";
import { isCado2BackendConfigured } from "@config/apiConfig";
import { cado2Access, useCado2Me, type Cado2Access } from "../api/useCado2Me";
import Cado2ToastProvider from "@features/sales/cado2/components/toast/Cado2ToastProvider";
import { cado2Paths } from "../cado2Paths";

const NAME = "CADO2";

/**
 * The frame every CadO2 route renders in: resolves access once, in the order
 * docs/conventions.md sets out, before any page asks for data.
 *
 *   not configured -> name the key to set; nothing is asked.
 *   checking       -> hold the page; nothing is redirected while resolving.
 *   check failed   -> an error with Retry, never presented as "no access".
 *   no CadO2 role  -> the shared "Nothing here for you yet" card.
 *   allowed        -> the page.
 */
export default function Cado2Shell(): JSX.Element {
  const me = useCado2Me();

  if (!isCado2BackendConfigured()) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {NAME} isn&apos;t connected yet. Set <code>ONE_WSO2_CADO2_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> and reload.
        </Alert>
      </Box>
    );
  }

  // isPending as well as isLoading: while the caller's identity is still
  // resolving the query is disabled, which React Query reports as pending only.
  if (me.isPending || me.isLoading) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Checking your {NAME} access…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (me.isError) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <ErrorNotice onRetry={() => void me.refetch()} error={me.error} sx={{ mt: 1.5 }}>
          Couldn&apos;t check your {NAME} access.
        </ErrorNotice>
      </Box>
    );
  }

  const access = cado2Access(me.data);
  if (!access.canQuote && !access.canApprove && !access.isAdmin) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <NothingHere label={NAME} icon={ReceiptTextIcon} />
      </Box>
    );
  }

  return (
    <Cado2ToastProvider>
      <Outlet />
    </Cado2ToastProvider>
  );
}

/** What a route needs, in CadO2's terms. */
export type Cado2Need = "quote" | "approve" | "admin";

function allows(need: Cado2Need, access: Cado2Access): boolean {
  if (need === "quote") return access.canQuote;
  if (need === "approve") return access.canApprove;
  return access.isAdmin;
}

/**
 * Guards one route inside the shell (which has already resolved `/me`). A
 * person without the role is sent to CadO2's landing, which always has a page
 * for them: the shell only lets in someone holding at least one CadO2 role.
 */
export function Cado2Requires({ need, children }: { need: Cado2Need; children: ReactNode }): JSX.Element {
  const me = useCado2Me();
  if (!allows(need, cado2Access(me.data))) return <Navigate to={cado2Paths.home} replace />;
  return <>{children}</>;
}

/** `/sales/cado2`: My Quotes for a rep, else My Approvals for an approver, else Admin. */
export function Cado2Landing(): JSX.Element {
  const me = useCado2Me();
  const access = cado2Access(me.data);
  const to = access.canQuote ? cado2Paths.quotes : access.canApprove ? cado2Paths.approvals : cado2Paths.admin;
  return <Navigate to={to} replace />;
}
