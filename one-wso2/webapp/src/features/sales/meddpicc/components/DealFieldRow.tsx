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

import { useState } from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import {
  MessageCircleQuestionIcon,
  CircleCheckIcon,
  CircleIcon,
  ExternalLinkIcon,
  PencilIcon,
  SparklesIcon,
  Undo2Icon,
} from "@wso2/oxygen-ui-icons-react";
import type { DealField, EvidenceSourceType, FieldValue } from "../types";
import type { ApprovalDraft } from "../util/approval";
import { formatFieldValue, isEmptyValue, isRoleProposal, letterLabel } from "../util/meddpiccFormat";
import { describeEvidenceSources, hasCustomerEvidence } from "../util/evidenceSource";
import EvidenceList from "./EvidenceList";
import FieldEditor from "./FieldEditor";

const NOT_KNOWN = "__not_known__";

/**
 * What Salesforce has against what the AI heard, as two rows of one box: the reader sees
 * both values side by side, the suggestion tinted while it waits for review, and under
 * it where it was heard and how sure the AI is.
 */
function ProposalCompare({
  salesforceValue,
  proposedValue,
  pending,
  confidence,
  from,
}: {
  /** Absent when the field isn't in Salesforce yet. */
  salesforceValue?: string;
  proposedValue: string;
  pending: boolean;
  confidence: number;
  from: string;
}) {
  const row = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "120px 1fr" }, columnGap: 1.5, rowGap: 0.25, px: 1.25, py: 0.75 };
  return (
    <Box
      sx={{ border: 1, borderColor: pending ? "warning.light" : "divider", borderRadius: "10px", overflow: "hidden" }}
      aria-label="Salesforce and the AI's suggestion"
    >
      {salesforceValue !== undefined && (
        <Box sx={{ ...row, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, pt: "2px" }}>
            In Salesforce
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
            {salesforceValue}
          </Typography>
        </Box>
      )}
      <Box
        sx={(theme) => ({
          ...row,
          bgcolor: pending ? alpha(theme.palette.warning.main, 0.08) : "transparent",
        })}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, pt: "2px", color: pending ? "warning.dark" : "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          <SparklesIcon size={12} aria-hidden />
          {pending ? "AI suggests" : "AI heard"}
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
            {proposedValue}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {from && `From ${from} · `}
            {Math.round(confidence * 100)}% confident
            {/* Only when Salesforce has the field and holds the same value: an approved suggestion
                stays "not pending" after Salesforce is changed, so not pending alone says nothing. */}
            {!pending && salesforceValue !== undefined && salesforceValue === proposedValue && " · matches Salesforce"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function StateIcon({ field }: { field: DealField }) {
  if (field.state === "FILLED") {
    return (
      <Box component="span" sx={{ color: "success.main", display: "inline-flex" }} aria-label="Filled">
        <CircleCheckIcon size={16} />
      </Box>
    );
  }
  if (field.state === "SUGGESTED") {
    return (
      <Box component="span" sx={{ color: "warning.main", display: "inline-flex" }} aria-label="AI suggestion">
        <SparklesIcon size={16} />
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ color: "text.disabled", display: "inline-flex" }} aria-label="Empty">
      <CircleIcon size={16} />
    </Box>
  );
}

/**
 * One Gate field on the deal page: what Salesforce has, what the AI proposes
 * and why, and the AM's control over it.
 *
 * There is no per-field approve. A correct Proposal needs no action at all —
 * Approve all takes it as it is — so the only per-field control is Edit, which
 * can also clear.
 */
export default function DealFieldRow({
  field,
  draft,
  readOnly,
  salesforceUrl,
  onEdit,
  onUndo,
  onRoleMatch,
  sourceFilter = null,
  variant = "full",
  askNext,
  gateTag,
}: {
  field: DealField;
  draft: ApprovalDraft;
  readOnly: boolean;
  salesforceUrl: string;
  onEdit: (key: string, value: FieldValue) => void;
  onUndo: (key: string) => void;
  /** A Contact id, or null for "not known — leave the role unset". */
  onRoleMatch: (key: string, contactId: string | null) => void;
  /** Show evidence from one source only; null shows all. */
  sourceFilter?: EvidenceSourceType | null;
  /**
   * "compact": one quiet line, for a field Salesforce already has. Edit opens the full
   * row in place, and an edited field stays full until approved or undone.
   */
  variant?: "full" | "compact";
  /** The question to ask on the next call, for a field still missing. */
  askNext?: string;
  /** The stage this field belongs to, shown when the list spans stages. */
  gateTag?: string;
}) {
  const [editing, setEditing] = useState(false);
  const { proposal } = field;
  const edited = Object.prototype.hasOwnProperty.call(draft.edits, field.key);
  const editValue = edited ? draft.edits[field.key] : undefined;
  const sfEmpty = isEmptyValue(field.salesforceValue);
  const salesforceOnly = !field.conversational;
  const rolePending = field.kind === "role" && Boolean(proposal?.pending) && isRoleProposal(proposal?.value);

  if (variant === "compact" && !editing && !edited) {
    const value = !field.applicable
      ? "Not needed for this opportunity"
      : field.notInSalesforce
        ? proposal
          ? `${formatFieldValue(proposal.value)} (kept in Echo, not in Salesforce yet)`
          : "Not in Salesforce yet"
        : sfEmpty
          ? field.optional
            ? "Empty · optional"
            : "Empty"
          : formatFieldValue(field.salesforceValue);
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", py: 0.75, borderBottom: 1, borderColor: "divider", minWidth: 0, opacity: field.applicable ? 1 : 0.6 }}
      >
        <StateIcon field={field} />
        <Typography variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
          {field.label}
        </Typography>
        {gateTag && (
          <Chip label={gateTag} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }} />
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          title={value}
          sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {value}
        </Typography>
        {salesforceOnly ? (
          <Link
            href={salesforceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
          >
            Salesforce <ExternalLinkIcon size={12} />
          </Link>
        ) : (
          field.kind !== "role" &&
          !readOnly &&
          field.applicable && (
            <Button size="small" onClick={() => setEditing(true)} aria-label={`Edit ${field.label}`} sx={{ minWidth: 0, flexShrink: 0 }}>
              Edit
            </Button>
          )
        )}
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        opacity: field.applicable ? 1 : 0.6,
      }}
    >
      {/* Title line: state, label, the Letters it feeds, and its tags. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
        <StateIcon field={field} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {field.label}
        </Typography>
        {field.letters.map((letter) => (
          <Chip
            key={letter}
            label={letterLabel(letter)}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem" }}
          />
        ))}
        {field.optional && (
          <Typography variant="caption" color="text.secondary">
            optional
          </Typography>
        )}
        {field.notInSalesforce && (
          <Chip label="Not in Salesforce yet" size="small" color="default" sx={{ height: 18, fontSize: "0.65rem" }} />
        )}
        {gateTag && <Chip label={gateTag} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {field.attest && (
          <Chip
            label="You confirm"
            size="small"
            variant="outlined"
            title="Only the account manager confirms this. The AI never proposes Yes on it."
            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600 }}
          />
        )}
      </Stack>

      {/* What to ask, for a field nothing has been heard for yet. */}
      {askNext && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start", mt: 0.75, pl: 3 }}>
          <Box component="span" sx={{ color: "info.main", display: "inline-flex", mt: "2px" }} aria-hidden>
            <MessageCircleQuestionIcon size={14} />
          </Box>
          <Typography variant="body2">
            <Box component="span" sx={{ color: "text.secondary" }}>
              Ask next call:{" "}
            </Box>
            {askNext}
          </Typography>
        </Stack>
      )}

      {!field.applicable && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Not needed for this opportunity, given the answers it depends on.
        </Typography>
      )}

      <Box sx={{ pl: 3, mt: 0.75 }}>
        {/* Salesforce's value on its own line, when there is no proposal to set it
            against. With a proposal, the comparison below shows both. */}
        {!field.notInSalesforce && !proposal && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              Salesforce:
            </Box>{" "}
            {formatFieldValue(field.salesforceValue)}
          </Typography>
        )}

        {salesforceOnly && (
          <Link
            href={salesforceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.25 }}
          >
            {sfEmpty ? "Fill in Salesforce" : "Edit in Salesforce"} <ExternalLinkIcon size={12} />
          </Link>
        )}

        {proposal && (
          <Box sx={{ mt: salesforceOnly ? 1 : 0 }}>
            <ProposalCompare
              salesforceValue={field.notInSalesforce ? undefined : formatFieldValue(field.salesforceValue)}
              proposedValue={formatFieldValue(proposal.value)}
              pending={proposal.pending}
              confidence={proposal.confidence}
              from={describeEvidenceSources(proposal.evidence)}
            />

            {/* An attest field backed only by WSO2's words, or by words nobody could
                attribute, is a claim about the customer rather than the customer's own
                position: said plainly, before anyone approves it. */}
            {field.attest && !hasCustomerEvidence(proposal.evidence) && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "warning.dark", fontWeight: 600 }}>
                Needs customer evidence: no quote from the customer backs this yet.
              </Typography>
            )}

            {proposal.rationale && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  Why:
                </Box>{" "}
                {proposal.rationale}
              </Typography>
            )}

            <Box sx={{ mt: 1.25 }}>
              <EvidenceList evidence={proposal.evidence} sourceFilter={sourceFilter} limit={2} />
            </Box>
          </Box>
        )}

        {/* The contact picker, for a role Proposal waiting on a match. */}
        {rolePending && isRoleProposal(proposal?.value) && (
          <FormControl size="small" fullWidth sx={{ mt: 1.5 }} disabled={readOnly}>
            {/* Shrunk and notched for good: with displayEmpty the box shows "Pick a
                contact" while nothing is chosen, and a resting label would sit on it. */}
            <InputLabel id={`meddpicc-role-${field.key}`} shrink>
              Matching contact
            </InputLabel>
            <Select
              labelId={`meddpicc-role-${field.key}`}
              label="Matching contact"
              notched
              value={
                edited && editValue === null ? NOT_KNOWN : (draft.roleMatches[field.key] ?? "")
              }
              onChange={(event) => {
                const value = event.target.value as string;
                onRoleMatch(field.key, value === NOT_KNOWN ? null : value);
              }}
              displayEmpty
              renderValue={(value) => {
                if (value === NOT_KNOWN) return "Not known — leave unset";
                const candidate = (isRoleProposal(proposal?.value) ? proposal.value.candidates : []).find(
                  (c) => c.contactId === value,
                );
                return candidate ? candidate.name : <em>Pick a contact</em>;
              }}
            >
              {proposal.value.candidates.map((candidate) => (
                <MenuItem key={candidate.contactId} value={candidate.contactId}>
                  <Box>
                    <Typography variant="body2">
                      {candidate.name}
                      {candidate.contactId === (proposal.value as { suggestedContactId: string | null }).suggestedContactId &&
                        " · suggested"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[candidate.title, candidate.email, `match ${Math.round(candidate.score * 100)}%`]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              <MenuItem value={NOT_KNOWN}>Not known — leave unset</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* The AM's own value, once they have edited. */}
        {edited && field.kind !== "role" && !editing && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
              <Box component="span" sx={{ fontWeight: 600 }}>
                Your value:
              </Box>{" "}
              {editValue === null ? "cleared" : formatFieldValue(editValue)}
            </Typography>
            <Tooltip title="Undo your edit" arrow>
              <Button
                size="small"
                startIcon={<Undo2Icon size={14} />}
                onClick={() => onUndo(field.key)}
                aria-label={`Undo edit to ${field.label}`}
              >
                Undo
              </Button>
            </Tooltip>
          </Stack>
        )}

        {editing ? (
          <FieldEditor
            field={field}
            initial={
              edited
                ? (editValue ?? null)
                : proposal && !isRoleProposal(proposal.value)
                  ? proposal.value
                  : field.salesforceValue
            }
            onSave={(value) => {
              onEdit(field.key, value);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          field.conversational &&
          field.kind !== "role" &&
          !readOnly && (
            <Button
              size="small"
              startIcon={<PencilIcon size={14} />}
              onClick={() => setEditing(true)}
              sx={{ mt: 0.75 }}
              aria-label={`Edit ${field.label}`}
            >
              Edit
            </Button>
          )
        )}
      </Box>
    </Box>
  );
}
