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

import { Accordion, AccordionDetails, AccordionSummary, Chip, IconButton, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon, CopyIcon } from "@wso2/oxygen-ui-icons-react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { parseLegacyFeedback360, stripRedundantRatingPrefix } from "../util/parLegacyHistory";
import { ParCommentView } from "./ParContent";
import type { ParLegacyThreeSixtyReview } from "../api/types";

// Read-only legacy counterpart of ParHistoryReviewSection, ported from
// LegacyThreeSixtyFeedbackSection.tsx — sourced from the migrated
// `par_360_feedback` JSON column instead of a fetched review list. Legacy
// data has no reviewer email, only a name, and no rejected/pending state to
// filter on — every parsed entry is shown. The question caption (the
// actual reviewer prompt, e.g. "What is the overall rating you would give
// based on your interactions?") is always shown, for every era -- an
// earlier version of this component hid it for 2021 H2 onward, which
// turned out to not match the real legacy data's intent.

export default function ParLegacyReviewSection({ feedback360 }: { feedback360: string | null }) {
  const { showSuccess, showError } = useNotifications();
  const reviews = parseLegacyFeedback360(feedback360);

  // Cycles with no 360 feedback at all shouldn't show a disabled "360°
  // Feedback" placeholder -- just show nothing, same as the on-screen
  // Employee/Lead Comment boxes above, which are likewise omitted entirely
  // when there's no real content rather than shown empty/disabled.
  if (reviews.length === 0) {
    return null;
  }

  const copyReview = (review: ParLegacyThreeSixtyReview) => {
    const rating = review.reviewRating ? stripRedundantRatingPrefix(review.reviewRating) : "";
    const ratingLine = rating ? `\nRating: ${rating}` : "";
    const text = `${review.reviewerName}:${ratingLine}\nFeedback: ${review.reviewComment ?? "No comment provided"}`;
    navigator.clipboard.writeText(text).then(
      () => showSuccess("Review copied to clipboard"),
      () => showError("Unable to copy review to clipboard"),
    );
  };

  return (
    <Accordion variant="outlined">
      <AccordionSummary expandIcon={<ChevronDownIcon size={18} />}>
        <Typography variant="h6">360° Feedback</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {reviews.map((review, index) => {
            const rating = review.reviewRating ? stripRedundantRatingPrefix(review.reviewRating) : "";
            // Real org-wide data can plausibly have two 360 reviewers share a
            // name -- reviewerName alone isn't a safe React key there
            // (silent mis-render, not a crash), so the index disambiguates.
            return (
            <Accordion key={`${review.reviewerName}-${index}`} variant="outlined">
              <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
                <Stack sx={{ width: "100%" }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ mr: "auto", fontWeight: 500 }}>{review.reviewerName}</Typography>
                    <Tooltip title="Copy review">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyReview(review);
                        }}
                      >
                        <CopyIcon size={14} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      {review.ratingQuestion}
                    </Typography>
                    {/* Always show the rating chip, with "N/A" when the
                    rating is blank. */}
                    <Chip size="small" label={`Rating: ${rating || "N/A"}`} />
                  </Stack>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  {review.commentQuestion}
                </Typography>
                <ParCommentView html={review.reviewComment ?? ""} />
              </AccordionDetails>
            </Accordion>
            );
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
