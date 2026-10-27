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
import { Link as RouterLink } from "react-router";
import { alpha, Avatar, Box, Chip, Link, Stack, Typography } from "@wso2/oxygen-ui";
import { ExternalLinkIcon, MailIcon, NotebookPenIcon, PlayIcon, UserRoundIcon, VideoIcon } from "@wso2/oxygen-ui-icons-react";
import { formatOffset } from "../../api/salesTypes";
import { formatDateTime } from "../../util/salesTime";
import type { EvidenceQuote, EvidenceSourceType } from "../types";
import { roleOf, sourceOf } from "../util/evidenceSource";
import { meetingPath } from "../../util/salesPaths";

const SOURCE_ICON: Record<EvidenceSourceType, typeof VideoIcon> = {
  CALL: VideoIcon,
  EMAIL: MailIcon,
  ACTIVITY: NotebookPenIcon,
};
const SOURCE_NAME: Record<EvidenceSourceType, string> = { CALL: "Call", EMAIL: "Email", ACTIVITY: "Salesforce activity" };

/**
 * One quote, wherever evidence is shown: what was said, who said it and whether they are
 * the customer, where it came from, and a way back to it.
 *
 * Drawn as a chat message: the speaker's initials beside a bubble holding their words,
 * then who they are and where it was said. The customer's bubble is tinted.
 *
 * The customer's own words read at full strength. A WSO2 person's words are drawn lighter
 * and tagged WSO2, and a rep's note says "reported by the rep": they are WSO2's claim about
 * the customer, not the customer's position, and must never read as if they were.
 *
 * `onSeek` plays a call quote in the recording on screen, so it is only passed for quotes
 * from `currentMeetingId`. Any other call links to its meeting page.
 */
export default function EvidenceItem({
  quote,
  currentMeetingId,
  onSeek,
}: {
  quote: EvidenceQuote;
  currentMeetingId?: number;
  onSeek?: (seconds: number) => void;
}) {
  const source = sourceOf(quote);
  const role = roleOf(quote);
  const Icon = SOURCE_ICON[source.type] ?? VideoIcon;
  const fromWso2 = role === "WSO2";
  const isCall = source.type === "CALL";
  const thisCall = isCall && currentMeetingId !== undefined && quote.meetingId === currentMeetingId;

  const parts: ReactNode[] = [];
  if (!thisCall) {
    parts.push(
      isCall && quote.meetingId ? (
        <Link
          key="title"
          component={RouterLink}
          to={meetingPath(quote.meetingId, { tab: "meddpicc" })}
          variant="caption"
          underline="hover"
          color="inherit"
        >
          {source.title}
        </Link>
      ) : (
        <span key="title">{source.title}</span>
      ),
      <span key="date">{formatDateTime(source.occurredAt)}</span>,
    );
  }
  if (isCall) {
    parts.push(
      thisCall && onSeek ? (
        <Link
          key="play"
          component="button"
          type="button"
          variant="caption"
          underline="hover"
          onClick={() => onSeek(quote.offsetSeconds)}
          aria-label={`Play from ${formatOffset(quote.offsetSeconds)}, ${quote.speaker}`}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, verticalAlign: "baseline" }}
        >
          <PlayIcon size={12} /> {formatOffset(quote.offsetSeconds)}
        </Link>
      ) : (
        <span key="at">at {formatOffset(quote.offsetSeconds)}</span>
      ),
    );
  } else if (source.url) {
    parts.push(
      <Link
        key="open"
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        variant="caption"
        underline="hover"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
      >
        Open {source.type === "EMAIL" ? "email" : "in Salesforce"} <ExternalLinkIcon size={11} />
      </Link>,
    );
  }

  const customer = role === "CUSTOMER";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", opacity: fromWso2 ? 0.8 : 1, minWidth: 0 }}>
      <SpeakerAvatar name={quote.speaker} role={role} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={(theme) => ({
            display: "inline-block",
            maxWidth: "100%",
            px: 1.25,
            py: 0.75,
            borderRadius: "4px 14px 14px 14px",
            border: 1,
            borderColor: customer ? alpha(theme.palette.success.main, 0.35) : "divider",
            bgcolor: customer ? alpha(theme.palette.success.main, 0.08) : "action.hover",
          })}
        >
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            “{quote.quote}”
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.25, color: "text.secondary", mt: 0.25, pl: 0.5 }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
            {quote.speaker}
          </Typography>
          {role !== "UNKNOWN" && (
            <Chip
              label={customer ? "Customer" : "WSO2"}
              size="small"
              variant="outlined"
              color={customer ? "success" : "default"}
              sx={{ height: 16, fontSize: "0.6rem", fontWeight: 600 }}
            />
          )}
          <Box
            component="span"
            role="img"
            title={SOURCE_NAME[source.type]}
            aria-label={SOURCE_NAME[source.type]}
            sx={{ display: "inline-flex" }}
          >
            <Icon size={12} aria-hidden />
          </Box>
          {parts.map((part, i) => (
            <Typography key={i} variant="caption" component="span">
              {i > 0 ? "· " : ""}
              {part}
            </Typography>
          ))}
          {fromWso2 && source.type === "ACTIVITY" && (
            <Typography variant="caption" sx={{ fontStyle: "italic" }}>
              · reported by the rep
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

/** The speaker's initials, coloured by side: green for the customer, blue for WSO2. */
function SpeakerAvatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <Avatar
      aria-hidden
      sx={{
        width: 26,
        height: 26,
        mt: 0.25,
        fontSize: "0.65rem",
        fontWeight: 700,
        bgcolor: role === "CUSTOMER" ? "success.main" : role === "WSO2" ? "primary.main" : "action.disabled",
      }}
    >
      {initials || <UserRoundIcon size={14} />}
    </Avatar>
  );
}
