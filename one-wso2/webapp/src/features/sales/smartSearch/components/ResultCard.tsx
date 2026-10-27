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

import type { JSX } from "react";
import { Box, ButtonBase, Chip, Link, Paper, Stack, Typography, alpha } from "@wso2/oxygen-ui";
import { ExternalLinkIcon } from "@wso2/oxygen-ui-icons-react";
import { highlightParts, snippetOf } from "../util/libraryHighlight";
import { rise } from "../util/libraryMotion";
import { KIND_NAME, freshnessOf, strengthOf, type ResultGroup } from "../util/libraryResults";
import { KIND_ICON } from "./kindIcon";

interface ResultCardProps {
  readonly group: ResultGroup;
  /** Its place in the list, 1-based. */
  readonly number: number;
  readonly selected: boolean;
  /** Which of its passages the preview is showing, when it is the selected card. */
  readonly selectedPassage: number;
  readonly query: string;
  /** The moment the item's age is measured from, fixed for the page's life so a render is repeatable. */
  readonly now: Date;
  /** Set on the best match when there are several, to say so. */
  readonly top?: boolean;
  readonly onSelect: (key: string, passage: number) => void;
}

function StrengthDots({ level }: { readonly level: 1 | 2 | 3 }): JSX.Element {
  return (
    <Stack direction="row" spacing={0.5} aria-hidden="true">
      {[1, 2, 3].map((dot) => (
        <Box
          key={dot}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: dot <= level ? "primary.main" : "action.disabled",
          }}
        />
      ))}
    </Stack>
  );
}

/** One document that matched: what it is, how well, when it was last verified, and the passages that answered. */
export default function ResultCard({
  group,
  number,
  selected,
  selectedPassage,
  query,
  now,
  top = false,
  onSelect,
}: ResultCardProps): JSX.Element {
  const Icon = KIND_ICON[group.kind];
  const strength = strengthOf(group.score);
  const freshness = freshnessOf(group.content?.createdOn, now, group.content?.lastVerifiedOn);
  const tags = (group.content?.tags ?? []).filter((tag) => tag.trim() !== "");

  return (
    <Paper
      variant="outlined"
      id={`library-result-${number}`}
      data-testid="library-result"
      sx={(theme) => ({
        borderRadius: 1.5,
        p: 2,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : undefined,
        "@media (prefers-reduced-motion: no-preference)": {
          transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
          "&:hover": { transform: "translateY(-1px)", boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.18)}` },
        },
        ...rise(Math.min(number - 1, 6) * 60),
      })}
    >
      <ButtonBase
        onClick={() => onSelect(group.key, 0)}
        aria-pressed={selected}
        aria-label={`Preview ${group.title}`}
        sx={{ display: "flex", width: "100%", gap: 1.5, alignItems: "flex-start", textAlign: "left" }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          <Icon size={19} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip size="small" label={number} sx={{ height: 20, minWidth: 20, flexShrink: 0, fontSize: 11 }} />
            {top && <Chip size="small" color="primary" label="Top match" sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />}
            <Typography variant="subtitle2" component="span">
              {group.title}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ mt: 0.75, columnGap: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
            <Chip size="small" variant="outlined" label={KIND_NAME[group.kind]} />
            {tags.map((tag) => (
              <Chip key={tag} size="small" variant="outlined" label={tag} />
            ))}
          </Stack>
        </Box>
      </ButtonBase>

      <Stack direction="row" sx={{ mt: 1.5, alignItems: "center", columnGap: 2, flexWrap: "wrap", rowGap: 0.5 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <StrengthDots level={strength.level} />
          <Typography variant="caption" color="text.secondary">
            {strength.label}
          </Typography>
        </Stack>
        {freshness && (
          <Typography
            variant="caption"
            color={freshness.stale ? "warning.main" : "text.secondary"}
            sx={{ fontWeight: freshness.stale ? 600 : undefined }}
          >
            {freshness.label}
          </Typography>
        )}
      </Stack>

      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {group.passages.map((passage, index) => {
          // A stand-in result's text is the stand-in document's own, so it is never shown.
          const text = snippetOf(passage.source.content);
          const active = selected && index === selectedPassage;
          return (
            <Box
              key={`${passage.source.page ?? "x"}-${index}`}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                borderRadius: 1,
                p: 1,
                bgcolor: active ? "action.selected" : undefined,
              }}
            >
              <ButtonBase
                onClick={() => onSelect(group.key, index)}
                aria-label={`Preview ${passage.location ?? "this passage"} of ${group.title}`}
                sx={{ flex: 1, minWidth: 0, display: "block", textAlign: "left", borderRadius: 1 }}
              >
                {passage.location && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={passage.location}
                    sx={{ mb: 0.5, fontWeight: 600 }}
                  />
                )}
                {text && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: "block" }}>
                    {highlightParts(text, query).map((part, partIndex) =>
                      part.match ? (
                        <Box
                          key={partIndex}
                          component="mark"
                          sx={(theme) => ({
                            bgcolor: alpha(theme.palette.primary.main, 0.22),
                            color: "text.primary",
                            borderRadius: 0.5,
                            px: 0.25,
                          })}
                        >
                          {part.text}
                        </Box>
                      ) : (
                        part.text
                      ),
                    )}
                  </Typography>
                )}
              </ButtonBase>
              {passage.openUrl && (
                <Link
                  href={passage.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${group.title}${passage.location ? ` at ${passage.location}` : ""} in a new tab`}
                  sx={{ display: "flex", alignItems: "center", color: "primary.main", pt: 0.5 }}
                >
                  <ExternalLinkIcon size={16} />
                </Link>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
