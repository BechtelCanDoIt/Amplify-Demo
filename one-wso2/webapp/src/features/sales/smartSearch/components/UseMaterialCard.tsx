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
import { Box, Button, ButtonBase, Paper, Skeleton, Stack, TextField, Typography, alpha } from "@wso2/oxygen-ui";
import {
  CheckIcon,
  CircleCheckIcon,
  CopyIcon,
  FileTextIcon,
  LightbulbIcon,
  MailIcon,
  MessageSquareIcon,
  PencilLineIcon,
  RefreshCwIcon,
  type LucideIcon,
} from "@wso2/oxygen-ui-icons-react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useComposeMessage } from "../api/useComposeMessage";
import type { ComposeIntent } from "../api/smartSearchTypes";
import {
  COMPOSE_OPTIONS,
  MAX_COMPOSE_SOURCES,
  MAX_NAME_LENGTH,
  MAX_PURPOSE_LENGTH,
  asksForNames,
  asksForPurpose,
  buildMessageHtml,
  buildMessageText,
  cleanPurpose,
  type MessageSource,
} from "../util/libraryCompose";
import { writeToClipboard } from "../util/libraryCopyText";
import { describeLibraryFailure } from "../util/libraryFailure";
import { pop } from "../util/libraryMotion";
import type { ResultGroup } from "../util/libraryResults";
import { useSlowAfter } from "../util/useSlowAfter";

const OPTION_ICON: Record<ComposeIntent, LucideIcon> = {
  email: MailIcon,
  chat: MessageSquareIcon,
  plain: FileTextIcon,
  explain: LightbulbIcon,
  custom: PencilLineIcon,
};

// A wait this long is longer than usual, so the page says so rather than leaving the reader to wonder.
const SLOW_AFTER_MS = 12_000;

interface UseMaterialCardProps {
  /** The results on screen, best match first: the message is written from all of them (the first few, when there are many). */
  readonly groups: readonly ResultGroup[];
  readonly query: string;
}

/**
 * "What do you need these for?": small cards for an email, a chat message, a plain summary or an explanation, or
 * "something else", where the seller types what they need it for. The text is written by the model from all the
 * results' excerpts together. An email first asks for the customer's name and the sender's, which are put in here and
 * never sent anywhere; the questions can be skipped.
 */
export default function UseMaterialCard({ groups, query }: UseMaterialCardProps): JSX.Element {
  const { showWarning } = useNotifications();
  const compose = useComposeMessage();
  const [intent, setIntent] = useState<ComposeIntent | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [purpose, setPurpose] = useState("");
  // The text last copied; "Copied" shows only while it is still what the box says.
  const [copiedText, setCopiedText] = useState<string | null>(null);
  // The results the message is written from: the first few that have a Pitstop id.
  const written = groups.filter((group) => group.documentId !== "").slice(0, MAX_COMPOSE_SOURCES);
  const canWrite = written.length > 0;

  const write = (kind: ComposeIntent) =>
    compose.mutate({
      query,
      documentIds: written.map((group) => group.documentId),
      intent: kind,
      ...(asksForPurpose(kind) ? { purpose: cleanPurpose(purpose) } : {}),
    });

  const choose = (kind: ComposeIntent) => {
    if (kind === intent) return;
    compose.reset();
    setCopiedText(null);
    // Each pick starts fresh: what was typed for one message doesn't follow the seller to the next. Their own name
    // stays, since it is the same person writing.
    setPurpose("");
    setCustomerName("");
    setIntent(kind);
    // An email and "something else" have questions to answer first; the others are written straight away.
    if (!asksForNames(kind) && !asksForPurpose(kind)) write(kind);
  };

  // Stops waiting for the message. What was typed stays for an email or "something else"; the others go back to the
  // choices, since picking the same one again is otherwise not possible.
  const cancel = () => {
    compose.reset();
    if (intent && !asksForNames(intent) && !asksForPurpose(intent)) setIntent(null);
  };

  const writeWithoutNames = () => {
    setCustomerName("");
    setSenderName("");
    if (intent) write(intent);
  };

  // The sources the backend says it used, each with the link to its best passage.
  const sources: MessageSource[] = (compose.data?.documentIds ?? []).flatMap((id) => {
    const group = groups.find((candidate) => candidate.documentId === id);
    const passage = group?.passages.find((candidate) => candidate.openUrl !== null);
    return group ? [{ title: group.title, location: passage?.location ?? null, url: passage?.openUrl ?? null }] : [];
  });
  const parts =
    intent && compose.data
      ? { intent, body: compose.data.text, subject: compose.data.subject, query, sources, customerName, senderName }
      : null;
  const text = parts ? buildMessageText(parts) : null;
  const copied = text !== null && copiedText === text;

  const copy = async () => {
    if (!parts || text === null) return;
    try {
      await writeToClipboard(text, buildMessageHtml(parts) ?? undefined);
      setCopiedText(text);
    } catch {
      showWarning("Couldn't copy. Select the text in the box and copy it yourself.");
    }
  };

  const failure = compose.isError ? describeLibraryFailure(compose.error, "write") : null;
  const slow = useSlowAfter(compose.isPending, SLOW_AFTER_MS);
  const showNames = intent !== null && asksForNames(intent);
  const showPurpose = intent !== null && asksForPurpose(intent);
  const canWritePurpose = cleanPurpose(purpose) !== "" && !compose.isPending;

  return (
    <Paper variant="outlined" component="section" aria-label="Use these sources" sx={{ borderRadius: 1.5, p: 2.5 }}>
      <Typography variant="overline" color="text.secondary" component="h2">
        Use these sources
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Pick what you need, and we&apos;ll write it from all the sources found.
      </Typography>

      {canWrite ? (
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            // Two to a row, and "something else" alone on the last; one to a row only on a phone.
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          {COMPOSE_OPTIONS.map((option) => {
            const Icon = OPTION_ICON[option.id];
            const selected = option.id === intent;
            return (
              <Paper
                key={option.id}
                variant="outlined"
                component={ButtonBase}
                aria-pressed={selected}
                onClick={() => choose(option.id)}
                disabled={compose.isPending}
                sx={(theme) => ({
                  // "Something else" has the row to itself, since it is the one that asks you to type.
                  gridColumn: asksForPurpose(option.id) ? "1 / -1" : undefined,
                  // Fixed size and corners, so the cards look the same in every theme: some themes round a card
                  // so far that text beside the corner looks cramped.
                  borderRadius: "14px",
                  minHeight: 68,
                  position: "relative",
                  pl: 1.75,
                  // Room on the right for the tick on the chosen card, on every card so none of them shifts.
                  pr: 4.5,
                  py: 1.5,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 1.25,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : undefined,
                  "@media (prefers-reduced-motion: no-preference)": {
                    transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
                    "&:hover": { transform: "translateY(-1px)" },
                  },
                  "&:hover": { borderColor: selected ? "primary.main" : "text.secondary" },
                })}
              >
                <Box
                  sx={(theme) => ({
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, selected ? 0.2 : 0.12),
                  })}
                >
                  <Icon size={19} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3 }}>
                    {option.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4, mt: 0.25 }}>
                    {option.hint}
                  </Typography>
                </Box>
                {selected && (
                  // In the corner, in the room kept for it.
                  <Box
                    sx={{ color: "primary.main", display: "flex", position: "absolute", top: 8, right: 10 }}
                    aria-hidden="true"
                  >
                    <CircleCheckIcon size={16} />
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          A message can&apos;t be written for these results.
        </Typography>
      )}

      {showPurpose && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            label="What do you need it for?"
            placeholder="For example: a short note for the customer's security team"
            helperText="We'll write it from these sources only."
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canWritePurpose) write("custom");
            }}
            slotProps={{ htmlInput: { maxLength: MAX_PURPOSE_LENGTH } }}
            autoComplete="off"
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disabled={!canWritePurpose} onClick={() => write("custom")}>
              {compose.data ? "Write it again" : "Write it"}
            </Button>
          </Stack>
        </Stack>
      )}

      {showNames && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Two quick questions, to put the names in. They stay in your browser, and you can skip them.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Customer's name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
              autoComplete="off"
            />
            <TextField
              size="small"
              fullWidth
              label="Your name"
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
              autoComplete="off"
            />
          </Stack>
          {!compose.data && !compose.isPending && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              <Button size="small" variant="contained" onClick={() => intent && write(intent)}>
                Write the email
              </Button>
              <Button size="small" onClick={writeWithoutNames}>
                Write it without names
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      <Box aria-live="polite" sx={{ mt: intent ? 2 : 0 }}>
        {compose.isPending && (
          <Box role="status" aria-label="Writing the message">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {slow
                ? "This is taking longer than usual - the service may be busy. You can keep waiting, or cancel and try again in a moment."
                : "Writing it…"}
            </Typography>
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="60%" />
            <Button size="small" onClick={cancel} sx={{ mt: 1 }}>
              Cancel
            </Button>
          </Box>
        )}

        {failure && (
          <Stack spacing={1} sx={{ alignItems: "flex-start" }} role="alert">
            <Typography variant="body2" color="text.secondary">
              {failure.message}
            </Typography>
            {/* The email and "something else" have their own Write button above, which is the way to try again. */}
            {intent && failure.retryable && !showNames && !showPurpose && (
              <Button size="small" onClick={() => write(intent)} startIcon={<RefreshCwIcon size={14} />}>
                Try again
              </Button>
            )}
          </Stack>
        )}

        {text !== null && (
          <>
            <Box
              component="pre"
              aria-label="The written message"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                border: 1,
                borderColor: "divider",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.6,
                color: "text.primary",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                userSelect: "text",
              }}
            >
              {text}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1 }}>
              <Button
                size="small"
                variant="contained"
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
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              {!showPurpose && (
                <Button
                  size="small"
                  onClick={() => intent && write(intent)}
                  disabled={compose.isPending}
                  startIcon={<RefreshCwIcon size={14} />}
                >
                  Write it again
                </Button>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Written by AI from these sources. Check it before you send it to a customer.
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
}
