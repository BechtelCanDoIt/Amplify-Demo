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

// Ports promotion-app's own view/administration/panels/promotionCycle.tsx —
// the currently OPEN cycle's own lifecycle (create when none exists, end
// when one is open), its own stats, and the Notification Hub drill-in.
// Source drives the home/notification-hub split with a `subView` query
// param; this uses local state instead — a two-pane drill-down within one
// tab, not a linkable top-level tab the way the portal's own five tabs are.
import { useState } from "react";
import { Box, Breadcrumbs, Button, Chip, Link, Paper, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import { BellIcon, XCircleIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { isPromotionDeadlinePast, useActivePromotionCycle } from "../api/usePromotionCycle";
import { useCreatePromotionCycle, useEndPromotionCycle } from "../api/useAdminPromotionCycle";
import { usePromotionRequests } from "../api/usePromotionRequests";
import PromotionCycleCreateForm from "../components/PromotionCycleCreateForm";
import PromotionCycleStatsPanel from "../components/PromotionCycleStatsPanel";
import NotificationHubPanel from "../components/NotificationHubPanel";
import PromotionEmptyState from "../components/PromotionEmptyState";
import PromotionFeedbackSnackbar from "../components/PromotionFeedbackSnackbar";
import { usePromotionFeedback } from "../util/usePromotionFeedback";
import { formatDate } from "../util/promotionHistory";
import type { PromotionCycle } from "../api/types";

// The 3 role deadlines, in the order they fall — a horizontal track with a
// connecting line, the first one not yet past highlighted as "NEXT" (all
// passed once the cycle is effectively done but not yet closed).
function CycleDeadlineTrack({ cycle }: { cycle: PromotionCycle }) {
  const steps = [
    { label: "Lead Deadline", date: cycle.leadDeadline },
    { label: "Functional Lead Deadline", date: cycle.functionalLeadDeadline },
    { label: "Promotion Board Deadline", date: cycle.promotionBoardDeadline },
  ];
  const nextIndex = steps.findIndex((s) => !isPromotionDeadlinePast(s.date));

  return (
    <Stack direction="row" sx={{ mt: 2.5 }}>
      {steps.map((step, i) => {
        const isNext = i === nextIndex;
        return (
          <Box key={step.label} sx={{ flex: 1, minWidth: 140 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: isNext ? "primary.main" : "background.paper",
                  border: "2px solid",
                  borderColor: isNext ? "primary.main" : "divider",
                }}
              />
              {i < steps.length - 1 && <Box sx={{ flex: 1, height: 2, bgcolor: "divider" }} />}
            </Box>
            <Box sx={{ mt: 1, pr: 2 }}>
              {isNext && (
                <Typography variant="caption" sx={{ display: "block", color: "primary.main", fontWeight: 700 }}>
                  NEXT
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {step.label}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25, fontWeight: isNext ? 600 : 400 }}>
                {formatDate(step.date)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function AdminPromotionCycleTab() {
  const cycle = useActivePromotionCycle();
  const requests = usePromotionRequests({ cycleId: cycle.cycle?.id }, Boolean(cycle.cycle));
  const createCycle = useCreatePromotionCycle();
  const endCycle = useEndPromotionCycle();
  const [view, setView] = useState<"home" | "notifications">("home");
  const [confirmEnd, setConfirmEnd] = useState<ConfirmationContent | null>(null);
  const { feedback, notifySuccess, notifyError, close } = usePromotionFeedback();

  if (cycle.isPending) return <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />;
  if (cycle.isError) {
    return (
      <PromotionEmptyState
        tone="error"
        message={`Unable to load the promotion cycle. ${humanizeHttpError(cycle.error)}`}
      />
    );
  }

  const rows = requests.data?.promotionRequests ?? [];

  return (
    <>
      <ConfirmationDialog content={confirmEnd} onClose={() => setConfirmEnd(null)} />
      <PromotionFeedbackSnackbar feedback={feedback} onClose={close} />

      {view === "notifications" && (
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs>
            <Link component="button" onClick={() => setView("home")} sx={{ color: "primary.main" }}>
              Home
            </Link>
            <Typography sx={{ color: "text.secondary" }}>Notification Hub</Typography>
          </Breadcrumbs>
        </Box>
      )}

      {view === "notifications" ? (
        <NotificationHubPanel cycle={cycle.cycle ?? null} requests={rows} loading={requests.isPending} />
      ) : !cycle.cycle ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 4 }}>
          <Typography variant="h5">Active promotion cycle not found</Typography>
          <Box sx={{ width: "100%", maxWidth: 640 }}>
            <PromotionCycleCreateForm
              creating={createCycle.isPending}
              onCreate={(payload) =>
                createCycle.mutate(payload, {
                  onSuccess: () => notifySuccess("Promotion cycle created."),
                  onError: (error) => notifyError(`Unable to create the promotion cycle. ${humanizeHttpError(error)}`),
                })
              }
            />
          </Box>
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ bgcolor: "action.hover", borderRadius: 2, p: 3, display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "space-between" }}>
            <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
              <Chip
                label={cycle.cycle.status === "OPEN" ? "Open" : cycle.cycle.status}
                size="small"
                variant="outlined"
                color={cycle.cycle.status === "OPEN" ? "info" : "default"}
              />
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {cycle.cycle.name} Promotion Cycle
              </Typography>
              {cycle.cycle.status === "OPEN" && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatDate(cycle.cycle.startDate)} – {formatDate(cycle.cycle.endDate)}
                  </Typography>
                  <CycleDeadlineTrack cycle={cycle.cycle} />
                </>
              )}
            </Box>
            {cycle.cycle.status === "OPEN" && (
              <Stack spacing={1} sx={{ alignItems: { xs: "stretch", sm: "flex-end" }, justifyContent: "center" }}>
                <Button startIcon={<BellIcon size={16} />} onClick={() => setView("notifications")}>
                  Notification Hub
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<XCircleIcon size={16} />}
                  disabled={endCycle.isPending}
                  onClick={() =>
                    setConfirmEnd({
                      title: "End Promotion Cycle",
                      text: "This will close the currently open promotion cycle. This action cannot be undone.",
                      confirmLabel: "End Cycle",
                      confirmAction: () => {
                        if (!cycle.cycle) return;
                        endCycle.mutate(cycle.cycle.id, {
                          onSuccess: () => notifySuccess("Promotion cycle ended."),
                          onError: (error) => notifyError(`Unable to end the promotion cycle. ${humanizeHttpError(error)}`),
                        });
                      },
                    })
                  }
                >
                  End Cycle
                </Button>
              </Stack>
            )}
          </Paper>

          {cycle.cycle.status === "OPEN" && (
            <Box sx={{ mt: 3 }}>
              <PromotionCycleStatsPanel loading={requests.isPending} data={rows} />
            </Box>
          )}
        </>
      )}
    </>
  );
}
