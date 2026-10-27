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

import { useState, type JSX } from "react";
import { Box, Button, Paper, Skeleton, Stack, Typography, alpha } from "@wso2/oxygen-ui";
import { CheckIcon, CopyIcon, SparklesIcon } from "@wso2/oxygen-ui-icons-react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { writeToClipboard } from "../util/libraryCopyText";
import { canAnimate, pop, useTypedText } from "../util/libraryMotion";
import type { ResultGroup } from "../util/libraryResults";
import { useSlowAfter } from "../util/useSlowAfter";

const visuallyHidden = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" } as const;

/** A long answer is cut to this many lines until "Show more" is pressed. */
const COLLAPSED_LINES = 7;
const LONG_ANSWER_LENGTH = 500;

// A wait this long is longer than usual, so the card says so.
const SLOW_AFTER_MS = 15_000;

interface AnswerCardProps {
  /** The answer is fetched after the documents, so it is loading for a moment first. */
  readonly status: "loading" | "ready" | "none";
  readonly text: string | null;
  /** Why there is no answer, when that is known (for example a rate limit). */
  readonly notice: string | null;
  /** The results on screen, which the answer was written from. */
  readonly groups: readonly ResultGroup[];
}

/**
 * The written answer. The sources it was written from are the list beside it.
 * The answer is model-written, so it is always plain text, never markup.
 */
export default function AnswerCard({
  status,
  text,
  notice,
  groups,
}: AnswerCardProps): JSX.Element {
  const { showWarning } = useNotifications();
  // The text last copied; "Copied" shows only while it is still the answer on screen.
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Only an answer that arrives while the card is open is typed out; one that was already there (back to a search) is not.
  const [animate] = useState(() => status !== "ready" && canAnimate());
  const typed = useTypedText(text ?? "", animate);
  const slow = useSlowAfter(status === "loading", SLOW_AFTER_MS);
  const isLong = (text?.length ?? 0) > LONG_ANSWER_LENGTH;
  const copied = text !== null && copiedText === text;

  const copy = async () => {
    if (!text) return;
    try {
      await writeToClipboard(text);
      setCopiedText(text);
    } catch {
      showWarning("Couldn't copy. Select the answer and copy it yourself.");
    }
  };

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="AI-generated answer"
      sx={(theme) => ({
        borderRadius: 1.5,
        p: 3,
        borderColor: alpha(theme.palette.primary.main, 0.45),
        bgcolor: alpha(theme.palette.primary.main, 0.07),
      })}
    >
      <Stack direction="row" sx={{ alignItems: "center", columnGap: 1, flexWrap: "wrap", rowGap: 0.5 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>
          <SparklesIcon size={16} />
        </Box>
        <Typography variant="overline" color="primary" component="h2" sx={{ fontWeight: 700 }}>
          AI-generated answer
        </Typography>
        {status === "ready" && (
          <Typography variant="caption" color="text.secondary">
            Written from the sources
          </Typography>
        )}
      </Stack>

      <Box aria-live="polite" sx={{ mt: 1 }}>
        {status === "loading" && (
          <Box role="status" aria-label="Writing an answer">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {slow
                ? "This is taking longer than usual - the service may be busy. The documents are already here to use."
                : groups.length > 0
                  ? `Found ${groups.length} ${groups.length === 1 ? "document" : "documents"}. Writing your answer…`
                  : "Writing your answer…"}
            </Typography>
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        )}
        {status === "ready" && text && (
          <>
            <Typography
              aria-hidden={typed.typing || undefined}
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: "0.9375rem",
                lineHeight: 1.65,
                ...(isLong && !expanded && {
                  display: "-webkit-box",
                  WebkitLineClamp: COLLAPSED_LINES,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }),
              }}
            >
              {typed.shown}
            </Typography>
            {typed.typing && (
              <>
                <Box component="span" sx={visuallyHidden}>
                  {text}
                </Box>
                <Button size="small" onClick={typed.skip} sx={{ mt: 0.5, ml: -1 }}>
                  Skip
                </Button>
              </>
            )}
            {isLong && !typed.typing && (
              <Button size="small" onClick={() => setExpanded((open) => !open)} sx={{ mt: 0.5, ml: -1 }}>
                {expanded ? "Show less" : "Show more"}
              </Button>
            )}
          </>
        )}
        {status === "none" && (
          <Typography variant="body2" color="text.secondary">
            {notice ?? "No written answer for this search. The matching documents are in the list of sources."}
          </Typography>
        )}
      </Box>

      {status === "ready" && text && !typed.typing && (
        <Button
          size="small"
          onClick={() => void copy()}
          startIcon={
            copied ? (
              <Box component="span" sx={{ display: "flex", ...pop }}>
                <CheckIcon size={14} />
              </Box>
            ) : (
              <CopyIcon size={14} />
            )
          }
          sx={{ mt: 1.5, ml: -1 }}
        >
          {copied ? "Copied" : "Copy answer"}
        </Button>
      )}
    </Paper>
  );
}
