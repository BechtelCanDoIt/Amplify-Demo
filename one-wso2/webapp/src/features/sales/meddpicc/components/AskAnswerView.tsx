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

import { Fragment, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { alpha, Box, Link, Stack, Typography } from "@wso2/oxygen-ui";
import {
  BookOpenIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  InfoIcon,
  MailIcon,
  MessageCircleQuestionIcon,
  NotebookPenIcon,
  VideoIcon,
} from "@wso2/oxygen-ui-icons-react";
import { formatOffset } from "../../api/salesTypes";
import { formatDateTime } from "../../util/salesTime";
import { meetingPath } from "../../util/salesPaths";
import type { AskAnswer, AskSource } from "../types";

const TYPE_ICON: Record<AskSource["type"], typeof VideoIcon> = {
  RECORD: DatabaseIcon,
  FIELD: DatabaseIcon,
  CALL: VideoIcon,
  EMAIL: MailIcon,
  ACTIVITY: NotebookPenIcon,
  LIBRARY: BookOpenIcon,
};

/** The anchor a citation jumps to: one per source, per answer. */
const anchorOf = (answerId: string, n: number) => `ask-${answerId}-source-${n}`;

/**
 * One Ask AI answer: the text, its citations as small numbered links to the sources below,
 * what to ask next when nothing covered the question, and the sources, the opportunity's
 * first and the Library's after, each a way back to where it came from.
 */
export default function AskAnswerView({ answer, answerId }: { answer: AskAnswer; answerId: string }) {
  const opportunity = answer.sources.filter((s) => s.group === "OPPORTUNITY");
  const library = answer.sources.filter((s) => s.group === "LIBRARY");
  return (
    <Box>
      <Typography variant="body2" component="div" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>
        {withCitations(answer.answer, answerId)}
      </Typography>

      {!answer.covered && answer.nextQuestion && (
        <Stack
          direction="row"
          spacing={0.75}
          sx={(theme) => ({
            mt: 1.25,
            px: 1.25,
            py: 0.75,
            borderRadius: 2,
            alignItems: "flex-start",
            bgcolor: alpha(theme.palette.info.main, 0.08),
          })}
        >
          <Box component="span" sx={{ color: "info.main", display: "inline-flex", mt: "2px" }} aria-hidden>
            <MessageCircleQuestionIcon size={14} />
          </Box>
          <Typography variant="body2">
            <Box component="span" sx={{ fontWeight: 600 }}>
              Ask on the next call:
            </Box>{" "}
            {answer.nextQuestion}
          </Typography>
        </Stack>
      )}

      {opportunity.length > 0 && <SourceGroup title="From this opportunity" sources={opportunity} answerId={answerId} />}
      {library.length > 0 && <SourceGroup title="From the Sales Library" sources={library} answerId={answerId} />}

      {answer.libraryUnavailable && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1.25, alignItems: "center", color: "text.secondary" }}>
          <InfoIcon size={12} aria-hidden />
          <Typography variant="caption">Library unavailable: product documents weren&apos;t searched for this answer.</Typography>
        </Stack>
      )}
    </Box>
  );
}

/** The answer's text with each [n] (or [1, 2]) turned into numbered links to its sources. */
function withCitations(text: string, answerId: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const marker = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const numbers = match[1].split(",").map((n) => Number(n.trim()));
    parts.push(
      <Box component="sup" key={`${match.index}`} sx={{ ml: 0.25, whiteSpace: "nowrap" }}>
        {numbers.map((n, i) => (
          <Fragment key={n}>
            {i > 0 && " "}
            <Link
              href={`#${anchorOf(answerId, n)}`}
              aria-label={`Source ${n}`}
              underline="none"
              sx={{
                display: "inline-block",
                minWidth: 16,
                px: 0.4,
                borderRadius: "8px",
                fontSize: "0.65rem",
                fontWeight: 700,
                textAlign: "center",
                lineHeight: "16px",
                color: "primary.main",
                bgcolor: "action.selected",
                "&:hover": { bgcolor: "action.focus" },
              }}
            >
              {n}
            </Link>
          </Fragment>
        ))}
      </Box>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function SourceGroup({ title, sources, answerId }: { title: string; sources: AskSource[]; answerId: string }) {
  return (
    <Box component="section" aria-label={title} sx={{ mt: 1.75 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6, lineHeight: 1.8 }}>
        {title}
      </Typography>
      <Stack component="ol" spacing={0.75} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {sources.map((s) => (
          <SourceRow key={s.n} source={s} anchor={anchorOf(answerId, s.n)} />
        ))}
      </Stack>
    </Box>
  );
}

function SourceRow({ source, anchor }: { source: AskSource; anchor: string }) {
  const Icon = TYPE_ICON[source.type] ?? DatabaseIcon;
  const meta = [source.detail, source.occurredAt ? formatDateTime(source.occurredAt) : null].filter(Boolean).join(" · ");
  return (
    <Stack
      component="li"
      id={anchor}
      direction="row"
      spacing={1}
      sx={{
        alignItems: "flex-start",
        p: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        scrollMarginTop: 80,
        "&:target": { borderColor: "primary.main", bgcolor: "action.selected" },
      }}
    >
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          minWidth: 20,
          height: 20,
          borderRadius: "10px",
          display: "grid",
          placeItems: "center",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "primary.main",
          bgcolor: "action.selected",
        }}
      >
        {source.n}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
          <Box component="span" sx={{ color: "text.secondary", display: "inline-flex", flexShrink: 0 }} aria-hidden>
            <Icon size={13} />
          </Box>
          <SourceTitle source={source} />
        </Stack>
        {meta && (
          <Typography variant="caption" color="text.secondary" component="div">
            {meta}
          </Typography>
        )}
        {source.quote && (
          <Typography
            variant="caption"
            component="div"
            sx={{
              mt: 0.25,
              fontStyle: "italic",
              color: "text.secondary",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            “{source.quote}”
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/** The source's title, as a way back to it: the call's page, or the record or document. */
function SourceTitle({ source }: { source: AskSource }) {
  const label = (
    <Typography variant="body2" component="span" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
      {source.title}
    </Typography>
  );
  if (source.type === "CALL" && source.meetingId) {
    return (
      <Link component={RouterLink} to={meetingPath(source.meetingId, { tab: "meddpicc" })} underline="hover" color="inherit">
        {label}
        {source.offsetSeconds ? (
          <Typography component="span" variant="caption" color="text.secondary">
            {` at ${formatOffset(source.offsetSeconds)}`}
          </Typography>
        ) : null}
      </Link>
    );
  }
  if (source.url) {
    return (
      <Link
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        color="inherit"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
      >
        {label}
        <ExternalLinkIcon size={11} aria-hidden />
      </Link>
    );
  }
  return label;
}
