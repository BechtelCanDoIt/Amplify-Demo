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

import { Box, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { Info } from "@wso2/oxygen-ui-icons-react";
import type { JSX } from "react";
import type { DashboardSummary, RiskScore, RiskTeam } from "../../api/riskApi";
import ChartCard from "./ChartCard";
import SummaryCards from "./SummaryCards";
import StatusPieChart from "./StatusPieChart";
import TreatmentByRegisterChart from "./TreatmentByRegisterChart";
import LevelCountChart from "./LevelCountChart";
import AverageResidualRiskMatrix from "./AverageResidualRiskMatrix";
import { meanRating, residualScoreMethodologySentence } from "./residualRiskMath";
import CertDistributionChart from "./CertDistributionChart";
import { buildRegisterColorMap, certListSentence, CLOSED_COLOR, type OnDrillDown } from "./constants";
import RegisterSection from "./RegisterSection";
import RepeatedRisksTable from "./RepeatedRisksTable";
import RepeatedCategoriesTable from "./RepeatedCategoriesTable";
import CommonOpenCategoriesTable from "./CommonOpenCategoriesTable";
import { groupRepeatedByRegister, scopeRegisters } from "./categoryViews";
import HighRisksTable from "./HighRisksTable";

interface DashboardViewProps {
  dashboard: DashboardSummary;
  scores: RiskScore[];
  // The dashboard's register list (the register filter's options) — the
  // category views need registers with no risks too, which the payload omits.
  // null while the register list is loading or failed to load — see RiskDashboard.
  teams: RiskTeam[] | null;
  // false when the page is scoped to one register — hides charts that only
  // make sense comparing across registers (their x-axis or plotted points
  // *are* the register comparison).
  isAllRegisters: boolean;
  // The register the dashboard itself is scoped to (0 = all registers) —
  // folded into every chart's drill-down click alongside whatever that chart
  // itself narrows on (level, treatment, register).
  registerId: number;
  onDrillDown: OnDrillDown;
}

// Pure layout of the risk dashboard; RiskDashboard supplies fetched data.
export default function DashboardView({
  dashboard,
  scores,
  teams,
  isAllRegisters,
  registerId,
  onDrillDown,
}: DashboardViewProps): JSX.Element {
  // Absent until the backend that serves them is deployed: hide the view
  // rather than present missing data as "nothing repeats".
  const repeatedCategories = dashboard.repeated_categories;
  const commonOpenCategories = dashboard.common_open_categories;
  const payloadRegisters = [
    ...dashboard.registers.map((r) => ({ id: r.register_id, name: r.register_name })),
    ...(repeatedCategories ?? []).map((r) => ({ id: r.register_id, name: r.register_name })),
  ];
  const registers = scopeRegisters(teams ?? [], payloadRegisters, registerId);
  const registerColors = buildRegisterColorMap(scopeRegisters(teams ?? [], payloadRegisters).map((r) => r.name));
  const repeatGroups = groupRepeatedByRegister(registers, repeatedCategories ?? []);
  const registersWithRepeats = repeatGroups.filter((g) => g.rows.length > 0).length;

  return (
    <Stack spacing={3}>
      <SummaryCards summary={dashboard.summary} />

      {isAllRegisters ? (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: 3 }}>
            <ChartCard title="Overall Risk Status Distribution">
              <StatusPieChart summary={dashboard.summary} onDrillDown={onDrillDown} registerId={registerId} />
            </ChartCard>
            <ChartCard title="Risk Treatment Strategy on Open Risks">
              <TreatmentByRegisterChart data={dashboard.treatment_by_register} onDrillDown={onDrillDown} />
            </ChartCard>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            <ChartCard title="Count vs. Risk Level (Open Risks)">
              <LevelCountChart data={dashboard.level_counts} onDrillDown={onDrillDown} registerId={registerId} />
            </ChartCard>
            <ChartCard
              title="Average Residual Risk Score (Open Risks)"
              headerRight={
                (() => {
                  const overall = meanRating(dashboard.org_heatmap);
                  return overall == null ? null : (
                    <Chip label={`Overall Avg  ${overall.toFixed(2)}`} size="small" color="primary" />
                  );
                })()
              }
            >
              {(() => {
                const methodology = residualScoreMethodologySentence(dashboard.registers, dashboard.org_heatmap);
                return (
                  methodology && (
                    <Box
                      sx={{
                        border: `1px solid ${CLOSED_COLOR}`,
                        borderRadius: 1,
                        bgcolor: `${CLOSED_COLOR}0d`,
                        px: 1.5,
                        py: 1,
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {methodology}
                      </Typography>
                    </Box>
                  )
                );
              })()}
              <AverageResidualRiskMatrix
                registers={dashboard.registers}
                orgHeatmap={dashboard.org_heatmap}
                scores={scores}
              />
            </ChartCard>
          </Box>
        </>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <ChartCard title="Overall Risk Status Distribution">
            <StatusPieChart summary={dashboard.summary} onDrillDown={onDrillDown} registerId={registerId} />
          </ChartCard>
          <ChartCard title="Count vs. Risk Level (Open Risks)">
            <LevelCountChart data={dashboard.level_counts} onDrillDown={onDrillDown} registerId={registerId} />
          </ChartCard>
        </Box>
      )}

      {isAllRegisters && (
        <ChartCard
          title="Number of Open Risks against Compliance Certifications"
          subtitle={certListSentence(dashboard.cert_distribution.map((d) => d.cert_name))}
        >
          <CertDistributionChart data={dashboard.cert_distribution} />
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              border: `1px solid ${CLOSED_COLOR}`,
              borderRadius: 1,
              bgcolor: `${CLOSED_COLOR}0d`,
              px: 1.5,
              py: 1,
              mt: 2,
            }}
          >
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", color: CLOSED_COLOR, mt: "1px" }}>
              <Info size={16} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
                Note:
              </Typography>{" "}
              A single risk may appear across multiple compliance certifications. Fixing one risk can
              simultaneously reduce risk exposure in several certifications (making cross-certification
              remediation a high-leverage activity).
            </Typography>
          </Box>
        </ChartCard>
      )}

      {dashboard.registers.map((register) => (
        <RegisterSection key={register.register_id} register={register} scores={scores} onDrillDown={onDrillDown} />
      ))}

      {teams && repeatedCategories && (
        <ChartCard
          title="Repeated Risks Within Each Register"
          subtitle="Risks covering the same category or root cause logged as separate entries. Open/Closed split shown for each repeated category."
          headerRight={
            <Chip
              label={`${registersWithRepeats} ${registersWithRepeats === 1 ? "Register" : "Registers"} With Repeats`}
              size="small"
              sx={{ bgcolor: "#e34948", color: "#fff", fontWeight: 600 }}
            />
          }
        >
          <RepeatedCategoriesTable groups={repeatGroups} registerColors={registerColors} />
        </ChartCard>
      )}

      {isAllRegisters && teams && commonOpenCategories && (
        <ChartCard
          title="Common Open Risks Across All Risk Registers"
          subtitle="Risk categories open in 2 or more registers, each tracked under a separate remediation plan. Closed counts shown for context."
          headerRight={
            <Chip
              label={`${commonOpenCategories.length} ${commonOpenCategories.length === 1 ? "Category" : "Categories"} Still Open`}
              size="small"
              sx={{ bgcolor: "#e34948", color: "#fff", fontWeight: 600 }}
            />
          }
        >
          <CommonOpenCategoriesTable
            rows={commonOpenCategories}
            registers={registers}
            registerColors={registerColors}
          />
        </ChartCard>
      )}

      {isAllRegisters && (
        <ChartCard title="Repeated Risks Potentially Impacting Compliance Certs">
          <RepeatedRisksTable data={dashboard.repeated_compliance_risks} />
        </ChartCard>
      )}

      <ChartCard
        title="High Severity Open Risks"
        headerRight={
          <Chip
            label={`${dashboard.high_risks.length} High Risks`}
            size="small"
            sx={{ bgcolor: "#e34948", color: "#fff", fontWeight: 600 }}
          />
        }
      >
        <HighRisksTable data={dashboard.high_risks} />
      </ChartCard>
    </Stack>
  );
}
