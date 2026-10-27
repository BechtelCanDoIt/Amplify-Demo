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
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { ChevronDownIcon, FileDownIcon } from "@wso2/oxygen-ui-icons-react";
import {
  formatLegacyCycleName,
  formatLegacyQuestionAnswers,
  hasLegacyContent,
  parseLegacyQuestionAnswers,
} from "../util/parLegacyHistory";
import { getLegacyQuestionGroups } from "../util/legacyParCatalogs";
import type { LegacyGroup } from "../util/legacyParCatalogs";
import { resolveLegacy2015EmployeeRatingLabel, resolveLegacyRating } from "../util/legacyParRatingResolvers";
import { downloadLegacyParPdf } from "../util/parPdf";
import { ParCommentView } from "./ParContent";
import ParLegacyReviewSection from "./ParLegacyReviewSection";
import ParStatusChip from "./ParStatusChip";
import type { ParLegacyHistory } from "../api/types";

// "PAR Rating"/"Top 5%/20% Rating"/"PAR Shared By" render as rows of ONE
// compact bordered table, not three separately-bordered, separately-rounded
// boxes with a visible gap between each -- InfoRowGroup/InfoRow below give
// that single-box, thin-divider-between-rows look.
function InfoRowGroup({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
      <Stack divider={<Divider />}>{children}</Stack>
    </Box>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  // A 2-column layout (label/value cells each ~25% wide) keeps the value
  // right next to the label, not pushed out to the far edge --
  // "justifyContent: space-between" stretched the value across the whole
  // row width, leaving a big dead gap in the middle. A fixed label-width
  // column keeps it tighter and left-clustered instead.
  return (
    <Box sx={{ display: "flex", alignItems: "center", pl: 2.5, pr: 1.5, py: 0.75 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, width: 160, flexShrink: 0 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// Renders either the category-grouped (2015) or flat (2016/2017/2018 Q1-Q2)
// "Performance Questions and Answers" accordions for one side. Null groups
// means this cycle has no catalog at all (2020+ or an unrecognized cycle
// name) -- the caller falls back to the plain flat comment box instead.
function QuestionRow({ row, type, side }: { row: LegacyGroup["rows"][number]; type: "rating" | "text"; side: "employee" | "lead" }) {
  const answer = (side === "employee" ? row.employeeAnswer : row.managerFeedback) || "—";
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, fontStyle: row.italicLabel ? "italic" : undefined, mb: 0.5 }}>
        {row.label}
      </Typography>
      {row.subtext && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "pre-line", fontStyle: "italic", lineHeight: 1.5, mb: 1.25, opacity: 0.65 }}
        >
          {row.subtext}
        </Typography>
      )}
      {type === "rating" ? (
        <Chip size="small" color="primary" label={answer} sx={{ fontWeight: 700, minWidth: 40 }} />
      ) : (
        <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {answer}
        </Typography>
      )}
    </Box>
  );
}

// Same content as QuestionRow but without its own label -- used inside an
// accordion whose summary already shows the question's label.
function QuestionRowBody({ row, type, side }: { row: LegacyGroup["rows"][number]; type: "rating" | "text"; side: "employee" | "lead" }) {
  const answer = (side === "employee" ? row.employeeAnswer : row.managerFeedback) || "—";
  return (
    <>
      {row.subtext && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "pre-line", fontStyle: "italic", lineHeight: 1.5, mb: 1.25, opacity: 0.65 }}
        >
          {row.subtext}
        </Typography>
      )}
      {type === "rating" ? (
        <Chip size="small" color="primary" label={answer} sx={{ fontWeight: 700, minWidth: 40 }} />
      ) : (
        <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {answer}
        </Typography>
      )}
    </>
  );
}

const ACCORDION_SUMMARY_SX = {
  minHeight: 40,
  "&.Mui-expanded": { minHeight: 40 },
  "& .MuiAccordionSummary-content": {
    alignItems: "baseline" as const,
    margin: "8px 0",
    "&.Mui-expanded": { margin: "8px 0" },
  },
};

function QuestionGroupAccordions({ groups, side }: { groups: LegacyGroup[]; side: "employee" | "lead" }) {
  // 2018 Q3/Q4 and all of 2019 (1-3 questions, always exactly one flat
  // group) render as plain boxes -- no accordion, no "Performance
  // Questions and Answers" heading -- for these shorter cycles.
  if (groups.length === 1 && groups[0].layout === "flat") {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {groups[0].rows.map((row) => (
          <QuestionRow key={row.label} row={row} type={groups[0].type} side={side} />
        ))}
      </Stack>
    );
  }

  // 2016/2017/2018 Q1-Q2: there's no real category here -- the single
  // group's own title is just the generic heading shown once above, and
  // EACH QUESTION gets its own accordion (3 separate "Job performance"/
  // "Communication"/"Teamwork" accordions, not one wrapping all 3).
  if (groups.length === 1 && groups[0].layout === "perQuestion") {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1.5 }}>{groups[0].title}</Typography>
        {groups[0].rows.map((row) => (
          <Accordion key={row.label} variant="outlined" disableGutters sx={{ mb: 1.5, "&:last-of-type": { mb: 0 } }}>
            <AccordionSummary expandIcon={<ChevronDownIcon size={16} />} sx={ACCORDION_SUMMARY_SX}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.label}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Divider sx={{ mb: 1.5 }} />
              <QuestionRowBody row={row} type={groups[0].type} side={side} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  }

  // 2015: each GROUP (category) is its own accordion, with every question
  // inside rendered as a plain labeled box, not its own accordion.
  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ fontWeight: 600, mb: 1.5 }}>Performance Questions and Answers</Typography>
      {groups.map((group) => (
        <Accordion key={group.title} variant="outlined" disableGutters sx={{ mb: 1.5, "&:last-of-type": { mb: 0 } }}>
          <AccordionSummary expandIcon={<ChevronDownIcon size={16} />} sx={ACCORDION_SUMMARY_SX}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {group.title}
              {group.type === "rating" && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (Rating scale from 1 to 5)
                </Typography>
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1.5}>
              {group.rows.map((row) => (
                <QuestionRow key={row.label} row={row} type={group.type} side={side} />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

// One legacy record's full detail -- two side-by-side panels (Employee PAR
// | Lead's Feedback) with per-era question-catalog grouping (see
// util/legacyParCatalogs.ts and util/legacyParRatingResolvers.ts for each
// cycle's own question set and rating scale). Shared by ParHistoryTab.tsx
// (employee self-view) and ParAdminLegacyCycleView.tsx (admin org-wide
// drill-down) -- never by a lead viewing a report's record; see
// hideThreeSixtyFeedback below and ParEmployeeHistoryView.tsx's own comment
// on why a lead never reaches this component with real legacy data at all.
export default function ParLegacyRecordDetail({
  record,
  thumbnail,
  hideThreeSixtyFeedback = false,
}: {
  record: ParLegacyHistory;
  thumbnail?: string;
  // Privacy rule: an employee's own self-view (and its PDF export) must
  // never show reviewer-identifiable 360 feedback. Every admin call site
  // omits this, so it defaults to visible there -- only ParHistoryTab.tsx's
  // own self-view passes true.
  hideThreeSixtyFeedback?: boolean;
}) {
  const questionAnswers = parseLegacyQuestionAnswers(record.questionAnswers);
  // Real migrated data can carry either the raw or canonical 2015 cycle
  // name (see formatLegacyCycleName's own comment) -- normalize before any
  // catalog/rating lookup.
  const cycleName = formatLegacyCycleName(record.cycleName);
  // Top 5%/20% was only introduced starting 2021 -- every earlier era
  // (2015-2020) never captured it, so a dedicated "Not Assigned" row there
  // would just be clutter.
  const hideSpecialRating = (Number(cycleName.match(/^(\d{4})/)?.[1]) || 0) < 2021;
  const employeeGroups = getLegacyQuestionGroups(cycleName, questionAnswers, "employee");
  const leadGroups = getLegacyQuestionGroups(cycleName, questionAnswers, "lead");

  // The overall comment and the catalogued question groups are NOT mutually
  // exclusive -- both show together when both exist. For a 2017 Q1,
  // "perQuestion"-layout cycle: when there's a catalog but no real overall
  // comment, the Employee/Lead Comment box still shows -- with the literal
  // "N/A" -- rather than being hidden. But for a 2018 Q3, "flat"-layout
  // cycle, it's the opposite: no comment box at all when blank, not even
  // "N/A" -- the flat question's own box already carries the real content
  // there, and leadContent CAN be genuinely blank in that case. Only fall
  // back to the flat per-question dump when there's no catalogued groups
  // at all.
  const isFlatLayout = (groups: LegacyGroup[] | null) => groups?.[0]?.layout === "flat";
  const employeeComment = hasLegacyContent(record.overallCommentEmployee)
    ? record.overallCommentEmployee!
    : employeeGroups
      ? (isFlatLayout(employeeGroups) ? "" : "N/A")
      : formatLegacyQuestionAnswers(questionAnswers);
  const leadComment = hasLegacyContent(record.overallCommentManager)
    ? record.overallCommentManager!
    : leadGroups
      ? (isFlatLayout(leadGroups) ? "" : "N/A")
      : "";

  // "category" layout is exclusive to the 2015 catalog (see
  // getLegacyQuestionGroups) -- gating on employeeGroups alone showed this
  // for every catalogued era (2016-2019 too), using the 2015 label table on
  // scores that table was never meant for. Only 2015 cycles have a real
  // employee-side rating at all; every other era's employeeScoreCode isn't
  // a meaningful rating (only the lead/manager side is).
  const legacy2015EmployeeRating = resolveLegacy2015EmployeeRatingLabel(
    employeeGroups && employeeGroups[0]?.layout === "category" ? record.employeeScoreCode : null,
  );
  const resolved = resolveLegacyRating(cycleName, record.managerScoreCode, questionAnswers);
  const rating = resolved.rating ?? record.overallRating;
  const special = resolved.special ?? record.overallSpecialRating;

  // 2017 Q3/Q4 specifically: a manager score of 3 ("Score" on that
  // quarter's own scale) means the Manager Overall Comments field isn't a
  // narrative comment at all -- it's just the score value (e.g. "68.0").
  // Shown after the "Score breakdown" question's answer (i.e. after the
  // whole per-question accordion list) instead of in the usual Lead
  // Comment spot above it, and labeled "Score" rather than "Lead Comment".
  const isLegacy2017ScoreCycle =
    (cycleName === "2017 Quarterly Review - Q3" || cycleName === "2017 Quarterly Review - Q4") &&
    record.managerScoreCode === 3;

  // "360 Confirmation" (stored with a trailing period in real 2020-2023
  // data, without one in 2024) is a workflow note -- did the lead actually
  // run the 360s -- not real feedback prose, so it's deliberately excluded
  // from the normal catalog/leadComment above. Surfaced here instead, in
  // its own section -- explicit local request: shown to the employee too,
  // on their own Lead's Feedback panel, not admin-only.
  const threeSixtyConfirmationAnswer = questionAnswers.find(
    (qa) => qa.title?.trim().replace(/\.$/, "") === "360 Confirmation" && hasLegacyContent(qa.managerFeedback),
  )?.managerFeedback;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ p: 1.75 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar variant="rounded" src={thumbnail} alt="Employee Thumbnail" />
              <Typography sx={{ fontWeight: 600 }}>Employee PAR</Typography>
            </Stack>
            <Button
              variant="contained"
              size="small"
              startIcon={<FileDownIcon size={16} />}
              onClick={() => downloadLegacyParPdf(record, questionAnswers, hideThreeSixtyFeedback)}
            >
              Download
            </Button>
          </Stack>

          <Stack spacing={1.5}>
            {legacy2015EmployeeRating && (
              <InfoRowGroup>
                <InfoRow label="PAR Rating">
                  <ParStatusChip content={legacy2015EmployeeRating} />
                </InfoRow>
              </InfoRowGroup>
            )}
            {employeeComment && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Employee Comment
                </Typography>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
                  <ParCommentView html={employeeComment} />
                </Box>
              </Box>
            )}
            {employeeGroups && <QuestionGroupAccordions groups={employeeGroups} side="employee" />}
          </Stack>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ p: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            <Avatar variant="rounded" alt="Lead Thumbnail" />
            <Stack>
              <Typography sx={{ fontWeight: 600 }}>Lead's Feedback</Typography>
              {(record.reviewerName || record.reviewerEmail) && (
                <Typography variant="body2" color="text.secondary">
                  {record.reviewerName ?? record.reviewerEmail}
                </Typography>
              )}
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <InfoRowGroup>
              <InfoRow label="PAR Rating">
                <ParStatusChip content={rating && rating !== "NOT_ASSIGNED" ? rating : "Not Assigned"} />
              </InfoRow>
              {!hideSpecialRating && (
                <InfoRow label="Top 5%/20% Rating">
                  <ParStatusChip content={special && special !== "NOT_ASSIGNED" ? special : "Not Assigned"} />
                </InfoRow>
              )}
              {(record.reviewerEmail || record.reviewerName) && (
                <InfoRow label="PAR Shared By">
                  <Typography variant="body2">{record.reviewerEmail ?? record.reviewerName}</Typography>
                </InfoRow>
              )}
            </InfoRowGroup>
            {leadComment && !isLegacy2017ScoreCycle && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Lead Comment
                </Typography>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
                  <ParCommentView html={leadComment} />
                </Box>
              </Box>
            )}
            {threeSixtyConfirmationAnswer && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  360 Confirmation
                </Typography>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
                  <ParCommentView html={threeSixtyConfirmationAnswer} />
                </Box>
              </Box>
            )}
            {leadGroups && <QuestionGroupAccordions groups={leadGroups} side="lead" />}
            {leadComment && isLegacy2017ScoreCycle && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Score
                </Typography>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 2 }}>
                  <ParCommentView html={leadComment} />
                </Box>
              </Box>
            )}
            {!hideThreeSixtyFeedback && <ParLegacyReviewSection feedback360={record.feedback360} />}
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );
}
