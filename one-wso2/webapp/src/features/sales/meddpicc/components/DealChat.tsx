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

import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { Box, Button, Chip, CircularProgress, IconButton, InputBase, Paper, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ArrowUpRightIcon, RotateCcwIcon, SendHorizontalIcon, SparklesIcon } from "@wso2/oxygen-ui-icons-react";
import { HttpError } from "@api/http";
import { isSmartSearchBackendConfigured } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { askDeal, libraryQuery, searchLibrary } from "../api/askAi";
import type { AskAnswer, AskRequest } from "../types";
import AskAnswerView from "./AskAnswerView";

/** One message in the thread: a question, an answer, or a notice when there is no answer. */
export type ChatEntry =
  | { role: "user"; text: string }
  | { role: "answer"; id: string; answer: AskAnswer }
  | { role: "notice"; text: string };

/** How long a question may be, as the backend takes it. */
const MAX_QUESTION = 1000;
/** How many earlier turns go with a question, for follow-ups. */
const HISTORY_TURNS = 6;

const ASK_SUGGESTIONS = [
  "Summarise where this opportunity stands.",
  "What's blocking the next stage?",
  "Who is the economic buyer, and how do we know?",
  "What did the customer say about competitors?",
  "What should I ask on the next call?",
];

/** Said instead of an answer by a backend that does not answer questions yet. */
const NOT_CONNECTED = "Ask AI isn't connected yet, so this question wasn't answered.";

/** What to say when no answer came back. */
function noAnswer(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return NOT_CONNECTED;
    if (error.status === 429) return "You've asked a lot in the last minute. Try again in a moment.";
    if (error.status === 504) return "That took too long to answer. Try a narrower question.";
    if (error.status === 400) return "That question couldn't be sent. Try a shorter one.";
  }
  return "Ask AI couldn't answer just now. Try again.";
}

/** The earlier turns that go with a question: each question and its answer, the last few. */
function historyOf(entries: ChatEntry[]): AskRequest["history"] {
  const turns: AskRequest["history"] = [];
  entries.forEach((entry, i) => {
    const next = entries[i + 1];
    if (entry.role === "user" && next?.role === "answer") turns.push({ question: entry.text, answer: next.answer.answer });
  });
  return turns.slice(-HISTORY_TURNS);
}

/**
 * Ask anything about this opportunity. Each question is first searched in the Sales Library
 * as the signed-in user (only what they may see), then answered by Echo from the
 * opportunity's own record and those passages, every claim citing its source: the
 * opportunity's first, the Library's for product facts. Nothing here writes to Salesforce.
 *
 * The thread is held by the deal page, so it survives switching tabs; it is not kept
 * after the page is left, and nothing asked is stored.
 */
export default function DealChat({
  opportunityId,
  entries,
  onChange,
}: {
  opportunityId: string;
  entries: ChatEntry[];
  /** The deal page's setter: entries are appended to the thread as it is then, not as it was. */
  onChange: Dispatch<SetStateAction<ChatEntry[]>>;
}) {
  const getAccessToken = useAccessToken();
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState<"library" | "answer" | null>(null);
  // One question at a time, guarded synchronously: two clicks in the same moment both see
  // the step still unset.
  const inFlight = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [entries.length, step]);

  const send = async (question: string) => {
    const text = question.trim().slice(0, MAX_QUESTION);
    if (!text || inFlight.current) return;
    // In flight before anything is awaited, so the question cannot be sent twice.
    inFlight.current = true;
    setStep(isSmartSearchBackendConfigured() ? "library" : "answer");
    const earlier = entries.flatMap((e) => (e.role === "user" ? [e.text] : []));
    const history = historyOf(entries);
    onChange((thread) => [...thread, { role: "user", text }]);
    setDraft("");
    try {
      const token = await getAccessToken();
      const passages = await searchLibrary(libraryQuery(text, earlier), token);
      setStep("answer");
      const answer = await askDeal(
        opportunityId,
        { question: text, history, librarySources: passages ?? [], libraryUnavailable: passages === null },
        token,
      );
      onChange((thread) => [...thread, { role: "answer", id: `${Date.now()}`, answer }]);
    } catch (error) {
      onChange((thread) => [...thread, { role: "notice", text: noAnswer(error) }]);
    } finally {
      inFlight.current = false;
      setStep(null);
    }
  };

  const asked = new Set(entries.filter((e) => e.role === "user").map((e) => e.text));
  const followUps = ASK_SUGGESTIONS.filter((q) => !asked.has(q)).slice(0, 3);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Not while an input method is composing: there Enter confirms a character.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  };

  return (
    <Paper variant="outlined" sx={{ maxWidth: 900, borderRadius: 3, p: { xs: 2, md: 3 }, bgcolor: "background.paper" }}>
      {/* Header: what this is, and that it is not answering yet. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 2.5 }}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "primary.main",
            bgcolor: "action.selected",
          }}
        >
          <SparklesIcon size={18} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Ask about this opportunity
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Answers come from this opportunity first (its MEDDPICC, what was said on calls and in emails, its activity) and
            from the Sales Library for product questions. Every answer lists the sources it used.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.75} role="log" aria-label="Conversation about this opportunity" aria-live="polite" sx={{ mb: 2 }}>
        {entries.length === 0 && (
          <Box
            role="group"
            aria-label="Suggested questions"
            sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}
          >
            {ASK_SUGGESTIONS.map((q) => (
              <Button
                key={q}
                variant="outlined"
                color="inherit"
                onClick={() => void send(q)}
                disabled={step !== null}
                endIcon={<ArrowUpRightIcon size={14} />}
                sx={{
                  justifyContent: "space-between",
                  textAlign: "left",
                  textTransform: "none",
                  fontWeight: 400,
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.75,
                  py: 1,
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                {q}
              </Button>
            ))}
          </Box>
        )}

        {entries.map((entry, i) =>
          entry.role === "answer" ? (
            <Box key={i} sx={{ alignSelf: "flex-start", maxWidth: "92%", width: "100%" }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.5, color: "primary.main" }}>
                <SparklesIcon size={13} aria-hidden />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Echo AI
                </Typography>
              </Stack>
              <Box sx={{ border: 1, borderColor: "divider", px: 1.75, py: 1.25, borderRadius: 2.5, borderTopLeftRadius: 6 }}>
                <AskAnswerView answer={entry.answer} answerId={entry.id} />
              </Box>
            </Box>
          ) : entry.role === "user" ? (
            <Box key={i} sx={{ alignSelf: "flex-end", maxWidth: "80%" }}>
              <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", px: 1.75, py: 1, borderRadius: 2.5, borderBottomRightRadius: 6 }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {entry.text}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box key={i} sx={{ alignSelf: "flex-start", maxWidth: "88%" }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.5, color: "primary.main" }}>
                <SparklesIcon size={13} aria-hidden />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Echo AI
                </Typography>
              </Stack>
              <Box sx={{ bgcolor: "action.hover", px: 1.75, py: 1.25, borderRadius: 2.5, borderTopLeftRadius: 6 }}>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {entry.text}
                </Typography>
              </Box>
            </Box>
          ),
        )}
        {step && (
          <Stack direction="row" spacing={1} sx={{ alignSelf: "flex-start", alignItems: "center", color: "text.secondary" }} role="status">
            <CircularProgress size={14} />
            <Typography variant="body2">{step === "library" ? "Searching the Library…" : "Writing the answer…"}</Typography>
          </Stack>
        )}
        <div ref={endRef} />
      </Stack>

      {entries.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.25, alignItems: "center" }}>
          {followUps.map((q) => (
            <Chip key={q} label={q} size="small" variant="outlined" onClick={() => void send(q)} disabled={step !== null} />
          ))}
          <Button
            size="small"
            variant="text"
            startIcon={<RotateCcwIcon size={13} />}
            onClick={() => onChange([])}
            disabled={step !== null}
            sx={{ textTransform: "none", ml: "auto" }}
          >
            New conversation
          </Button>
        </Stack>
      )}

      {/* The composer: the send button sits inside the box, which lights up when focused. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          pl: 1.75,
          pr: 0.75,
          py: 0.75,
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: "background.paper",
          transition: "border-color 120ms, box-shadow 120ms",
          "&:focus-within": { borderColor: "primary.main", boxShadow: (theme) => `0 0 0 3px ${theme.palette.action.focus}` },
        }}
      >
        <InputBase
          fullWidth
          multiline
          maxRows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={entries.length ? "Ask a follow-up" : "Ask anything about this opportunity"}
          inputProps={{ "aria-label": "Your question", maxLength: MAX_QUESTION }}
          sx={{ py: 0.75, fontSize: "0.9rem" }}
        />
        <Tooltip title="Send (Enter)" arrow>
          <span>
            <IconButton
              onClick={() => void send(draft)}
              disabled={!draft.trim() || step !== null}
              aria-label="Send question"
              sx={{
                color: "primary.contrastText",
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
              }}
            >
              <SendHorizontalIcon size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
        Answers can be wrong: check the sources. Asking changes nothing in Salesforce, and nothing asked is kept;
        changes are approved on the MEDDPICC tab.
      </Typography>
    </Paper>
  );
}
