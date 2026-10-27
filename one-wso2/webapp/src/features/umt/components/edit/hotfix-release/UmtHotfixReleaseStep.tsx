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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { Alert, Button, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { useNotifications } from "@context/notifications/NotificationsContext";
import type { UmtUpdateSummary } from "../../../api/umtUpdates";
import { useUmtHotfixTestStatus, useUmtTriggerHotfixTests } from "../../../api/useUmtHotfixRelease";
import { umtHotfixTestsPassed, umtHotfixTestsRunning, umtHotfixTestStatusLabel } from "../../../lib/umtHotfixRelease";

// A hotfix's Testing step, in place of the staging test review a regular
// update gets. It runs the hotfix's integration tests and shows their status;
// the shell's Proceed bar releases the hotfix, or marks a failed testing
// environment created.
export default function UmtHotfixReleaseStep({ id, update }: { id: string; update: UmtUpdateSummary }) {
  const { showSuccess, showError } = useNotifications();
  const testStatus = useUmtHotfixTestStatus(id, update.lifecycleState);
  const triggerTests = useUmtTriggerHotfixTests(id);

  if (update.lifecycleState === "TestingEnvironmentRequested") {
    return <Alert severity="info">Waiting for the hotfix testing environment to be created.</Alert>;
  }
  if (update.lifecycleState === "TestingEnvironmentFailed") {
    return (
      <Alert severity="warning">
        Creating the hotfix testing environment failed. Set it up manually, then proceed to mark it created.
      </Alert>
    );
  }

  async function handleRunTests() {
    try {
      await triggerTests.mutateAsync();
      showSuccess("Integration tests triggered.");
    } catch (error) {
      showError(`Failed to trigger the integration tests. ${describeError(error)}`);
    }
  }

  const status = testStatus.data ?? null;
  const isRunning = umtHotfixTestsRunning(status);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Release Hotfix</Typography>
      {testStatus.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void testStatus.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load the integration test status. {describeError(testStatus.error)}
        </Alert>
      ) : (
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="body1">Integration tests:</Typography>
          <Chip
            size="small"
            label={testStatus.isPending ? "Checking…" : umtHotfixTestStatusLabel(status)}
            color={umtHotfixTestsPassed(status) ? "success" : isRunning || status === null ? "default" : "error"}
          />
          <Button
            variant="outlined"
            disabled={testStatus.isPending || isRunning}
            loading={triggerTests.isPending}
            onClick={() => void handleRunTests()}
          >
            {status === null ? "Run Integration Tests" : "Rerun Integration Tests"}
          </Button>
        </Stack>
      )}
      {!testStatus.isPending && !umtHotfixTestsPassed(status) && (
        <Typography variant="body2" color="text.secondary">
          A hotfix is released once its integration tests pass. A lead or admin can release it without a pass, with a
          reason.
        </Typography>
      )}
    </Stack>
  );
}
