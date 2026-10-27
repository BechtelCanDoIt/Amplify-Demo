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
import { Alert, Avatar, Box, Button, Chip, CircularProgress, IconButton, Snackbar, Stack, TextField, Tooltip, Typography } from "@wso2/oxygen-ui";
import { EditIcon } from "@wso2/oxygen-ui-icons-react";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { humanizeHttpError } from "@api/http";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { FINANCE_RESULT } from "@features/due-diligence/constants";
import { useAddFinanceComment, useEditFinanceComment } from "../api/useFinance";
import type { FinanceComment } from "../api/financeTypes";

// Ported from the source app's Resellers/ResellerDashboard/Finance/CommentInputs.js
// — the threaded comments on questions 42 (Creator) / 43 (Reviewer). Only a
// financeCreator may add to question 42, only a financeReviewer to question
// 43 — see `canAddComment` below, unchanged from the source.
//
// saveNewComment's status transition is business logic, not styling: the
// FIRST creator comment moves the finance result to "reviewer-pending"; once
// a reviewer comment also exists, it moves to "approval-pending". Kept
// exactly as the source computes it.
export default function FinanceCommentInputs({
  questionId,
  companyId,
  comments,
}: {
  questionId: 42 | 43;
  companyId: string;
  comments: FinanceComment[];
}) {
  const gate = useDueDiligenceGate();
  const user = useAsgardeoUser();
  const addComment = useAddFinanceComment(companyId);
  const editComment = useEditFinanceComment(companyId);

  const [showNewCommentField, setShowNewCommentField] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedComment, setEditedComment] = useState("");
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const questionComments = comments.filter((c) => c.questionId === questionId);
  const canAddComment =
    (questionId === 42 && gate.hasRole("financialCreator")) || (questionId === 43 && gate.hasRole("financialReviewer"));

  const saveNewComment = () => {
    if (currentComment.trim() === "") return;
    const hasQ42 = questionId === 42 || comments.some((c) => c.questionId === 42);
    const hasQ43 = questionId === 43 || comments.some((c) => c.questionId === 43);
    let financeResult = "";
    if (hasQ42 && !hasQ43) financeResult = FINANCE_RESULT.REVIEWER_PENDING;
    else if (hasQ42 && hasQ43) financeResult = FINANCE_RESULT.APPROVAL_PENDING;

    addComment.mutate(
      {
        sortIndex: questionComments.length,
        userEmail: user.email ?? "",
        comment: currentComment,
        questionId,
        companyId: Number(companyId),
        financeResult,
      },
      {
        onSuccess: () => {
          setCurrentComment("");
          setShowNewCommentField(false);
        },
        onError: (err) => setSnack({ open: true, severity: "error", message: humanizeHttpError(err) }),
      },
    );
  };

  const saveEditedComment = (commentId: number) => {
    const existing = comments.find((c) => c.commentId === commentId);
    editComment.mutate(
      {
        commentId,
        sortIndex: existing?.sortIndex ?? 0,
        userEmail: existing?.userEmail ?? user.email ?? "",
        comment: editedComment,
        questionId,
        companyId: Number(companyId),
      },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditedComment("");
        },
        onError: (err) => setSnack({ open: true, severity: "error", message: humanizeHttpError(err) }),
      },
    );
  };

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Stack spacing={1.5}>
        {questionComments.map((item) => {
          const isEditing = editingCommentId === item.commentId;
          return (
            <Box key={item.commentId} sx={{ bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Tooltip title={item.userEmail}>
                  <Chip
                    avatar={<Avatar sx={{ width: 20, height: 20, fontSize: 13 }} />}
                    label={item.userName}
                    variant="outlined"
                    size="small"
                  />
                </Tooltip>
                {!isEditing && canAddComment && item.userEmail === user.email && (
                  <IconButton size="small" onClick={() => { setEditingCommentId(item.commentId); setEditedComment(item.comment); }}>
                    <EditIcon size={15} />
                  </IconButton>
                )}
              </Stack>
              {isEditing ? (
                <Stack spacing={1.5}>
                  <TextField
                    autoFocus
                    value={editedComment}
                    onChange={(e) => setEditedComment(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    size="small"
                    sx={{ "& .MuiInputBase-root": { p: 1.5 } }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={() => saveEditedComment(item.commentId)} disabled={editComment.isPending}>
                      Save
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setEditingCommentId(null)}>
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {item.comment}
                </Typography>
              )}
            </Box>
          );
        })}

        {canAddComment && !showNewCommentField && (
          <Box
            onClick={() => setShowNewCommentField(true)}
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5, cursor: "pointer", color: "text.disabled" }}
          >
            Add comment…
          </Box>
        )}
        {showNewCommentField && (
          <Stack spacing={1.5}>
            <TextField
              autoFocus
              placeholder="Add comment…"
              value={currentComment}
              onChange={(e) => setCurrentComment(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              size="small"
              sx={{ "& .MuiInputBase-root": { p: 1.5 } }}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" onClick={saveNewComment} disabled={currentComment.trim() === "" || addComment.isPending}>
                {addComment.isPending ? <CircularProgress size={16} /> : "Save"}
              </Button>
              <Button variant="outlined" size="small" onClick={() => { setShowNewCommentField(false); setCurrentComment(""); }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
