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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DataGrid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PlusIcon, TrashIcon } from "@wso2/oxygen-ui-icons-react";
import { describeError } from "@api/errors";
import { useNotifications } from "@context/notifications/NotificationsContext";
import type { UmtBundleInfoChange, UmtFileOperation, UmtPullRequestAnalysisItem, UmtUpdateSummary } from "../../../api/umtUpdates";
import type { UmtUpdateType } from "../../../api/umtTypes";
import { useUmtLifecycleTransition } from "../../../api/useUmtLifecycleTransition";
import { useUmtPullRequestAnalysis } from "../../../api/useUmtUpdateViewData";
import {
  UmtProductAnalysisFailedError,
  useUmtPrAnalysisStatus,
  useUmtProceedFromPrAnalysis,
  useUmtStartPullRequestAnalysis,
  useUmtUploadPullRequestAnalysisFile,
} from "../../../api/useUmtPrAnalysis";
import {
  bundleInfoApplies,
  GITHUB_PR_REGEX,
  isPrAnalyzeDisabled,
  pluginsFileHasMatchingBundleInfo,
  prAnalysisStatusMessage,
  type UmtPendingManualUpload,
} from "../../../lib/umtPrAnalysis";
import {
  readPersistedBundleInfoChanges,
  readPersistedManualFiles,
  readPersistedPullRequests,
  writePersistedBundleInfoChanges,
  writePersistedManualFiles,
  writePersistedPullRequests,
} from "../../../lib/umtLocalState";
import UmtAddManualFilesSection from "./UmtAddManualFilesSection";
import UmtPrAnalysisResults from "./UmtPrAnalysisResults";

const { DataGrid: DataGridComponent } = DataGrid;

export default function UmtPrAnalysisStep({
  id,
  update,
  onDirtyChange,
}: {
  id: string;
  update: UmtUpdateSummary;
  // Reports inputs changed since the last analysis, so the Files Analysis
  // Proceed can ask before promoting past them.
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const { showSuccess, showError } = useNotifications();
  const pullRequestAnalysis = useUmtPullRequestAnalysis(id, update.lifecycleState, { alwaysEnabled: true });
  const isDevelopment = update.lifecycleState === "Development";
  // Analyze in PRAnalyzed demotes to Development first: the backend only
  // accepts uploads and a new analysis there.
  const isPrAnalyzed = update.lifecycleState === "PRAnalyzed";
  const status = useUmtPrAnalysisStatus(id, update.praStatus, isDevelopment);
  const startAnalysis = useUmtStartPullRequestAnalysis(id);
  const upload = useUmtUploadPullRequestAnalysisFile(id);
  const transition = useUmtLifecycleTransition(id);
  const proceed = useUmtProceedFromPrAnalysis(id);
  const [isFilesWarningOpen, setIsFilesWarningOpen] = useState(false);

  // The type the last analysis was submitted with, as the backend recorded it.
  const submittedUpdateType: UmtUpdateType = update.isInstructionsOnly
    ? "instructionsOnlyUpdate"
    : update.isContainerizedUpdate
      ? "containerizedProductUpdate"
      : "generalUpdate";
  const [updateType, setUpdateType] = useState<UmtUpdateType>(submittedUpdateType);
  // Drafts are persisted to localStorage scoped by update id, so rows from
  // one update's PR Analysis step never leak into another's.
  const [pullRequests, setPullRequests] = useState<UmtPullRequestAnalysisItem[]>(() =>
    readPersistedPullRequests(id),
  );
  const [manualFiles, setManualFiles] = useState<UmtFileOperation[]>(() => readPersistedManualFiles(id));
  const [bundlesInfoChanges, setBundlesInfoChanges] = useState<UmtBundleInfoChange[]>(() =>
    readPersistedBundleInfoChanges(id),
  );
  // Manual files added but not uploaded yet. Their contents only live in
  // memory until Analyze uploads them, so they are never persisted.
  const [pendingUploads, setPendingUploads] = useState<UmtPendingManualUpload[]>([]);
  const [hasNewInputs, setHasNewInputs] = useState(true);
  // Unlike hasNewInputs (true on mount so Analyze starts enabled), this is
  // set only by an edit made in this session — not by filling the inputs from
  // the saved analysis — so Proceed can ask before it drops changes the last
  // analysis never saw.
  const [hasUnanalyzedChanges, setHasUnanalyzedChanges] = useState(false);
  useEffect(() => {
    onDirtyChange?.(hasUnanalyzedChanges);
  }, [hasUnanalyzedChanges, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // On reaching PRAnalyzed, the inputs start from what the backend analyzed
  // rather than this browser's drafts, which may be stale or missing entirely.
  // Waits out a refetch: until it lands, the cached analysis can still be the
  // previous run's, and seeding happens only once.
  const analyzed = pullRequestAnalysis.data;
  const [seededForPrAnalyzed, setSeededForPrAnalyzed] = useState(false);
  if (isPrAnalyzed && analyzed && !pullRequestAnalysis.isFetching && !seededForPrAnalyzed) {
    setSeededForPrAnalyzed(true);
    setUpdateType(submittedUpdateType);
    setPullRequests(analyzed.pullRequests ?? []);
    setManualFiles((analyzed.additionalFileOperations ?? []).map(({ file, operation }) => ({ file, operation })));
    setBundlesInfoChanges(
      (analyzed.bundlesInfoChanges ?? []).map((row) => ({
        bundlesInfoPath: row.bundlesInfoPath,
        jarName: row.jarName,
        jarVersion: row.jarVersion,
        relativeJarPath: row.relativeJarPath,
        entryType: row.changeType,
      })),
    );
    setPendingUploads([]);
    setHasNewInputs(false);
  }
  if (!isPrAnalyzed && seededForPrAnalyzed) setSeededForPrAnalyzed(false);

  // Persisted from effects rather than the setters, so the values seeded
  // above reach the drafts too and survive the demote Analyze starts with.
  useEffect(() => {
    writePersistedPullRequests(id, pullRequests);
  }, [id, pullRequests]);
  useEffect(() => {
    const pendingRows = new Set(pendingUploads.map((pending) => pending.row));
    writePersistedManualFiles(id, manualFiles.filter((row) => !pendingRows.has(row)));
  }, [id, manualFiles, pendingUploads]);
  useEffect(() => {
    writePersistedBundleInfoChanges(id, bundlesInfoChanges);
  }, [id, bundlesInfoChanges]);

  // Spans Analyze's whole run (demote, uploads, submission). The cached
  // update can briefly read Development with a COMPLETED analysis during it,
  // so the advance below must wait for it to finish.
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // A completed analysis in Development moves the update on to PRAnalyzed and
  // starts the product analysis. Reads the update itself, whose
  // lifecycleState and praStatus come from the same response, and fires once
  // per completed analysis so a failure doesn't retry in a loop.
  const isAnalysisCompleteInDevelopment = isDevelopment && update.praStatus === "COMPLETED";
  const advancedRef = useRef(false);
  const advance = proceed.mutateAsync;
  useEffect(() => {
    if (!isAnalysisCompleteInDevelopment) {
      advancedRef.current = false;
      return;
    }
    if (isAnalyzing || advancedRef.current) return;
    advancedRef.current = true;
    advance()
      .then(() => showSuccess(`Update ${id} advanced to PRAnalyzed.`))
      .catch((error: unknown) => {
        // The analysis has to be run again, which Analyze only allows once
        // there is something new to analyze.
        setHasNewInputs(true);
        if (error instanceof UmtProductAnalysisFailedError) {
          showError(`${error.message} ${describeError(error.analysisError)}`);
        } else {
          showError(`Moving the update to PRAnalyzed failed. ${describeError(error)}`);
        }
      });
  }, [isAnalysisCompleteInDevelopment, isAnalyzing, advance, id, showSuccess, showError]);

  const [isPrDialogOpen, setIsPrDialogOpen] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [preferredVersion, setPreferredVersion] = useState("");
  const [prError, setPrError] = useState<string | undefined>();
  const [deletePr, setDeletePr] = useState<string | null>(null);
  const [missingBundleInfoFiles, setMissingBundleInfoFiles] = useState<UmtFileOperation[]>([]);

  const markDirty = () => {
    setHasNewInputs(true);
    setHasUnanalyzedChanges(true);
  };

  const isInFlight = status.data === "QUEUED" || status.data === "PROCESSING";
  const isCompleted = status.data === "COMPLETED";

  // Disable inputs from the moment Analyze is clicked (the mutation's own
  // isPending), not just once the server confirms QUEUED. No separate "awaiting confirmation" grace flag
  // is needed once the mutation resolves: the backend commits praStatus to
  // QUEUED synchronously before the start-analysis POST even returns
  // (verified against the backend source), so the query invalidation the
  // mutation fires on success is guaranteed to refetch an already-QUEUED
  // status — isInFlight picks it up immediately, no race to bridge.
  //
  // The run isn't over when the PR analysis completes: in Development a
  // completed analysis is always on its way to PRAnalyzed and its product
  // analysis, so that counts as running too until the advance settles. The
  // poll's status is checked alongside the update's, which is refetched a
  // moment later, so the spinner doesn't drop out in between. A failed
  // advance stops it.
  const isRunningProductAnalysis =
    proceed.isPending ||
    (isDevelopment && (update.praStatus === "COMPLETED" || isCompleted) && !proceed.isError);
  const isBusy = isInFlight || startAnalysis.isPending || isAnalyzing || isRunningProductAnalysis;
  const runningMessage =
    isAnalyzing || startAnalysis.isPending
      ? "Starting analysis…"
      : isRunningProductAnalysis && !isInFlight
        ? "PR Analysis was successfully completed. Running product analysis…"
        : undefined;

  if (!isDevelopment && !isPrAnalyzed) {
    return <Alert severity="info">PR Analysis can only be done in Development.</Alert>;
  }

  function addPullRequest() {
    const trimmed = prUrl.trim();
    if (!GITHUB_PR_REGEX.test(trimmed)) {
      setPrError("Invalid Pull Request URL");
      return;
    }
    if (pullRequests.some((row) => row.pr === trimmed)) {
      setPrError("This pull request has already been added.");
      return;
    }
    const normalizedVersion = preferredVersion.trim().toLowerCase() === "auto" ? "" : preferredVersion.trim();
    setPullRequests([...pullRequests, { pr: trimmed, preferredVersion: normalizedVersion }]);
    markDirty();
    setPrUrl("");
    setPreferredVersion("");
    setPrError(undefined);
    setIsPrDialogOpen(false);
  }

  function confirmDeletePr() {
    if (!deletePr) return;
    setPullRequests(pullRequests.filter((row) => row.pr !== deletePr));
    markDirty();
    setDeletePr(null);
  }

  // Blocks Analyze (with a "Missing Bundle Info Paths" dialog) when a
  // /plugins/ Added or Removed file has no corresponding bundle-info entry,
  // since validating only at add time would let a file added before its
  // bundle info (or one whose entry was later deleted) reach the backend
  // unguarded. Only General Update collects manual files/bundle info at all.
  function handleAnalyzeClick() {
    if (updateType === "generalUpdate") {
      const missing = manualFiles.filter(
        (file) =>
          bundleInfoApplies(file.file ?? "", file.operation) &&
          !pluginsFileHasMatchingBundleInfo(file.file ?? "", bundlesInfoChanges),
      );
      if (missing.length > 0) {
        setMissingBundleInfoFiles(missing);
        return;
      }
      // Warns before analyzing that added/modified files will be copied into
      // all applicable products once the analysis moves the update on.
      //
      // Manually added files only, not PR-identified ones: the dialog's remedy
      // (remove them and make a separate update) only applies to files the
      // user added by hand.
      const hasAddedOrModifiedFiles = manualFiles.some(
        (op) => op.operation?.toLowerCase() === "added" || op.operation?.toLowerCase() === "modified",
      );
      if (hasAddedOrModifiedFiles) {
        setIsFilesWarningOpen(true);
        return;
      }
    }
    void handleAnalyze();
  }

  function handleManualFilesChange(rows: UmtFileOperation[], uploads: UmtPendingManualUpload[] = []) {
    setManualFiles(rows);
    // A deleted row takes its pending upload with it.
    setPendingUploads((current) => [...current.filter((pending) => rows.includes(pending.row)), ...uploads]);
  }

  async function handleAnalyze() {
    setIsFilesWarningOpen(false);
    setIsAnalyzing(true);
    // Clears a previous failed advance, so this run's spinner covers its own.
    proceed.reset();
    try {
      if (isPrAnalyzed) await transition.mutateAsync("Development");
      // Only General Update sends manual files, so only it uploads them.
      if (updateType === "generalUpdate") {
        for (const [index, pending] of pendingUploads.entries()) {
          try {
            await upload.mutateAsync({
              relativePath: pending.relativePath,
              sourceFilePath: pending.sourceFilePath,
              file: pending.file,
              // Store a real file at the path its row is analyzed under. A URL
              // source's placeholder blob isn't the file's content, so it must
              // not take that path.
              filePath: pending.file instanceof File ? (pending.row.file ?? undefined) : undefined,
            });
          } catch (error) {
            // The ones before it are already uploaded, and stay uploaded: the
            // rest are still pending, so Analyze again only sends those.
            showError(
              `Uploaded ${index} of ${pendingUploads.length} ${pendingUploads.length === 1 ? "file" : "files"} ` +
                `before "${pending.row.file}" failed. ${describeError(error)}`,
            );
            return;
          }
          setPendingUploads((current) => current.filter((item) => item !== pending));
        }
      }
      // Only General Update collects manual files/bundle info, and Instructions
      // Only collects neither — send empty arrays rather than whatever is left
      // over in state from a previously-selected update type.
      await startAnalysis.mutateAsync({
        updateId: id,
        pullRequests: updateType === "instructionsOnlyUpdate" ? [] : pullRequests,
        additionalFileOperations: updateType === "generalUpdate" ? manualFiles : [],
        bundlesInfoChanges: updateType === "generalUpdate" ? bundlesInfoChanges : [],
        isInstructionsOnly: updateType === "instructionsOnlyUpdate",
        isContainerizedUpdate: updateType === "containerizedProductUpdate",
      });
      setHasNewInputs(false);
      setHasUnanalyzedChanges(false);
      showSuccess("PR analysis started.");
    } catch (error) {
      showError(`Failed to start PR analysis. ${describeError(error)}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const statusMessage = prAnalysisStatusMessage(status.data);
  const statusColor =
    statusMessage.tone === "error" ? "error.main" : statusMessage.tone === "success" ? "success.main" : "text.primary";
  const analyzeDisabled = isPrAnalyzeDisabled({
    status: status.data,
    hasNewInputsSinceLastAnalysis: hasNewInputs,
    updateType,
    pullRequestCount: pullRequests.length,
    // Same guard as the submitted payload: manual files only count for
    // General Update, so leftover files from a prior type selection can't
    // make this look non-empty for a type that won't actually send them.
    manualFileCount: updateType === "generalUpdate" ? manualFiles.length : 0,
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">Update Type</Typography>
        <RadioGroup
          row
          value={updateType}
          onChange={(e) => {
            setUpdateType(e.target.value as UmtUpdateType);
            markDirty();
          }}
          sx={{ opacity: isBusy ? 0.5 : 1, pointerEvents: isBusy ? "none" : "auto" }}
        >
          <FormControlLabel value="generalUpdate" control={<Radio />} label="General Update" />
          <FormControlLabel value="instructionsOnlyUpdate" control={<Radio />} label="Instructions Only Update" />
          <FormControlLabel
            value="containerizedProductUpdate"
            control={<Radio />}
            label="Containerized Product Update"
          />
        </RadioGroup>
        <Divider sx={{ mt: 2 }} />

        {updateType !== "instructionsOnlyUpdate" && (
          <Box sx={{ opacity: isBusy ? 0.5 : 1, pointerEvents: isBusy ? "none" : "auto" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 2 }}>
              <Typography variant="h6">Pull Requests</Typography>
              <IconButton aria-label="Add pull request" size="small" onClick={() => setIsPrDialogOpen(true)}>
                <PlusIcon size={18} />
              </IconButton>
            </Stack>
            {pullRequests.length > 0 ? (
              <DataGridComponent
                autoHeight
                columnHeaderHeight={40}
                disableColumnMenu
                disableRowSelectionOnClick
                getRowHeight={() => "auto"}
                getRowId={(row: UmtPullRequestAnalysisItem) => row.pr ?? ""}
                hideFooter
                rows={pullRequests}
                sx={{ mt: 2 }}
                columns={[
                  {
                    field: "pr",
                    headerName: "Pull Request",
                    flex: 3,
                    sortable: false,
                    renderCell: (params: { row: UmtPullRequestAnalysisItem }) => (
                      <Stack sx={{ justifyContent: "center", minHeight: "100%", py: 0.75, width: "100%" }}>
                        {params.row.pr && (
                          <Link href={params.row.pr} target="_blank" rel="noopener noreferrer" underline="hover">
                            {params.row.pr}
                          </Link>
                        )}
                      </Stack>
                    ),
                  },
                  {
                    field: "preferredVersion",
                    headerName: "Preferred Version",
                    flex: 1,
                    sortable: false,
                    renderCell: (params: { row: UmtPullRequestAnalysisItem }) => (
                      <Stack sx={{ justifyContent: "center", minHeight: "100%", py: 0.75, width: "100%" }}>
                        {params.row.preferredVersion}
                      </Stack>
                    ),
                  },
                  {
                    field: "delete",
                    headerName: "",
                    width: 52,
                    sortable: false,
                    renderCell: (params: { row: UmtPullRequestAnalysisItem }) => (
                      <Stack sx={{ justifyContent: "center", minHeight: "100%", width: "100%" }}>
                        <IconButton
                          aria-label="Delete pull request"
                          size="small"
                          onClick={() => setDeletePr(params.row.pr ?? null)}
                        >
                          <TrashIcon size={16} />
                        </IconButton>
                      </Stack>
                    ),
                  },
                ]}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add a pull request to analyze.
              </Typography>
            )}
          </Box>
        )}

        {updateType === "generalUpdate" && (
          <>
            <Divider sx={{ my: 2 }} />
            <UmtAddManualFilesSection
              updateId={id}
              disabled={isBusy}
              files={manualFiles}
              onFilesChange={handleManualFilesChange}
              bundlesInfoChanges={bundlesInfoChanges}
              onBundlesInfoChanged={setBundlesInfoChanges}
              onDirty={markDirty}
            />
          </>
        )}

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "flex-end", mt: 3 }}>
          {isBusy && <CircularProgress size={22} />}
          {(isBusy || updateType !== "instructionsOnlyUpdate") && (
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              {runningMessage ? (
                <Typography variant="body2" color="text.primary">
                  {runningMessage}
                </Typography>
              ) : (
                statusMessage.lines.map((line, index) => (
                  <Typography key={index} variant="body2" color={statusColor} sx={{ wordBreak: "break-word" }}>
                    {line}
                  </Typography>
                ))
              )}
            </Stack>
          )}
          <Button
            variant="contained"
            disabled={analyzeDisabled || isBusy}
            loading={isAnalyzing}
            onClick={handleAnalyzeClick}
          >
            Analyze
          </Button>
        </Stack>
        <Divider sx={{ mt: 3 }} />
      </Box>

      {/* Only once the product analysis has finished too, i.e. in PRAnalyzed. */}
      {isPrAnalyzed && isCompleted && !isRunningProductAnalysis && pullRequestAnalysis.data && (
        <UmtPrAnalysisResults result={pullRequestAnalysis.data} />
      )}

      <Dialog open={isPrDialogOpen} onClose={() => setIsPrDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Pull Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Pull Request URL"
              value={prUrl}
              onChange={(e) => {
                setPrUrl(e.target.value);
                setPrError(undefined);
              }}
              error={Boolean(prError)}
              helperText={prError}
            />
            <TextField
              fullWidth
              label="Preferred Version (Optional)"
              placeholder="Auto"
              value={preferredVersion}
              onChange={(e) => setPreferredVersion(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPrDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!prUrl.trim()} onClick={addPullRequest}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletePr)} onClose={() => setDeletePr(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this pull request?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePr(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmDeletePr}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isFilesWarningOpen} onClose={() => setIsFilesWarningOpen(false)}>
        <DialogTitle>Added and Modified Files</DialogTitle>
        <DialogContent>
          <DialogContentText>
            There are modified and added files in this update.
            <br />
            UMT will copy the added files into all the applicable products in the next section.
            <br />
            If you want to exclude the added files going into applicable products, please remove the added files
            from this update and create a separate update with the added files.
            <br />
            Do you need to proceed without excluding the added files?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void handleAnalyze()}>Yes Proceed</Button>
          <Button onClick={() => setIsFilesWarningOpen(false)}>No</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={missingBundleInfoFiles.length > 0} onClose={() => setMissingBundleInfoFiles([])}>
        <DialogTitle>Missing Bundle Info Paths</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            The following /plugins/ files need a corresponding Bundle Info Changes entry before this update can
            be analyzed:
          </DialogContentText>
          <Stack spacing={0.5}>
            {missingBundleInfoFiles.map((file, index) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: "monospace" }}>
                {file.operation}: {file.file}
              </Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setMissingBundleInfoFiles([])}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
