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

import { Alert, AlertTitle, Box } from "@wso2/oxygen-ui";
import type { JSX } from "react";

// What a lifted PrivilegeGuard renders when the caller lacks a route's
// privilege.
//
// NOT the source's Error403Page. That one is a full-page illustration built on
// a `@assets/error/*.svg` alias this app doesn't have, and it assumes GRC's own
// shell around it — here the page already sits inside this app's layout and
// side rail, so a full-bleed error screen would render inside the frame and
// read as a broken page rather than a refused one.
//
// The rest of the source's error pages (400/401/404/500/NoAccess) are not
// carried at all: this app routes and handles those itself.
export default function Error403Page(): JSX.Element {
  return (
    <Box sx={{ p: 3, maxWidth: 620 }}>
      <Alert severity="warning">
        <AlertTitle>You don't have access to this page</AlertTitle>
        Access here comes from a role granted in Admin Console, not from your Asgardeo groups —
        so being in the right team does not grant it on its own. Ask someone who can reach
        Security and Compliance → Admin Console → Users to grant you the role that covers your work.
      </Alert>
    </Box>
  );
}
