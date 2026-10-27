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

// Ports promotion-app's own view/functionalLead/panels/timeBased.tsx —
// informational only ("No action is required"): every TIME_BASED request
// in the functional lead's own BU scope, for the open cycle, showing each
// recommending lead's own status. Not a grid — source's own screen is a
// plain card list, matching the Lead Portal's own row style rather than
// CustomTable (this is the one FL tab source itself didn't build on that
// component).
import { Box, Chip, Grid, Skeleton, Typography } from "@wso2/oxygen-ui";
import { humanizeHttpError } from "@api/http";
import { useActivePromotionCycle } from "../api/usePromotionCycle";
import { usePromotionRequests } from "../api/usePromotionRequests";
import JobBandTransitionChips from "../components/JobBandTransitionChips";
import PromotionDeadlineBanner from "../components/PromotionDeadlineBanner";
import PromotionEmptyState from "../components/PromotionEmptyState";
import PromotionTableHeader from "../components/PromotionTableHeader";
import { recommendationChipColor } from "../util/promotionStatus";
import type { RecommendationStatus } from "../api/types";

const COLUMNS = [
  { title: "Employee Email", size: 3, align: "left" as const },
  { title: "Lead Status", size: 2, align: "left" as const },
  { title: "Lead Email", size: 3, align: "left" as const },
  { title: "Team", size: 2, align: "left" as const },
  { title: "Promote to", size: 2, align: "right" as const },
];

const LEAD_STATUS_LABEL: Partial<Record<RecommendationStatus, string>> = {
  REQUESTED: "Pending",
  SUBMITTED: "Submitted",
};

export default function FLTimeBasedTab() {
  const cycle = useActivePromotionCycle();
  const requests = usePromotionRequests(
    { enableBuFilter: true, type: "TIME_BASED", cycleId: cycle.cycle?.id },
    !cycle.isPending && Boolean(cycle.cycle),
  );

  const rows = requests.data?.promotionRequests ?? [];

  return (
    <>
      {cycle.cycle && (
        <PromotionDeadlineBanner>
          Functional leads can view eligible employees for time-based promotions within their team and check the
          status here. No action is required; this is for information purposes only.
        </PromotionDeadlineBanner>
      )}

      {cycle.isPending || (requests.isPending && Boolean(cycle.cycle)) ? (
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1 }} />
      ) : cycle.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load the promotion cycle. ${humanizeHttpError(cycle.error)}`}
        />
      ) : !cycle.cycle ? (
        <PromotionEmptyState message="There are no active promotion cycles" />
      ) : requests.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load promotion requests. ${humanizeHttpError(requests.error)}`}
        />
      ) : rows.length === 0 ? (
        <PromotionEmptyState message="There are no time based promotion requests" />
      ) : (
        <>
          <PromotionTableHeader columns={COLUMNS} />
          {rows.map((request) => (
            <Box
              key={request.id}
              sx={{ border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1, p: 2, mb: 1.25 }}
            >
              <Grid container spacing={2} sx={{ width: "100%", alignItems: "center" }}>
                <Grid size={3}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.employeeEmail}</Typography>
                </Grid>
                <Grid size={2}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {request.recommendations.map((rec) => (
                      <Chip
                        key={rec.recommendationID}
                        label={LEAD_STATUS_LABEL[rec.recommendationStatus] ?? rec.recommendationStatus}
                        size="small"
                        variant="outlined"
                        color={recommendationChipColor(rec.recommendationStatus)}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid size={3}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {request.recommendations.map((rec) => (
                      <Chip key={rec.recommendationID} label={`Lead: ${rec.leadEmail}`} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
                <Grid size={2}>
                  <Typography variant="body2">{request.team}</Typography>
                </Grid>
                <Grid size={2} sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <JobBandTransitionChips currentJobBand={request.currentJobBand} nextJobBand={request.nextJobBand} />
                </Grid>
              </Grid>
            </Box>
          ))}
        </>
      )}
    </>
  );
}
