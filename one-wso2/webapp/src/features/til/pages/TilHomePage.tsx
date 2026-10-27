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
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { DownloadIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { useNavigate } from "react-router";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { isTilBackendConfigured, useTilExportEntries, useTilSubmissions, useTilUserInfo } from "../api/useTilData";
import { useDeleteTilSubmission } from "../api/useTilMutations";
import { TIL_WHERE_OPTIONS, type TilSubmission, type TilWhere } from "../api/tilTypes";
import { tilEntryPath } from "../util/tilArticleView";
import { downloadTilCsv } from "../util/tilExportCsv";
import { describeError } from "../util/tilError";
import {
  TIL_FEED_PAGE_SIZES,
  pageContaining,
  readTilFeedLayout,
  readTilFeedPageSize,
  writeTilFeedLayout,
  writeTilFeedPageSize,
  type TilFeedLayout,
  type TilFeedPageSize,
} from "../util/tilFeedLayout";
import { tilFeedQuery } from "../util/tilFeedQuery";
import SubmitEntryDialog from "../components/SubmitEntryDialog";
import TilFeed from "../components/TilFeed";
import TilFeedLayoutSwitch from "../components/TilFeedLayoutSwitch";
import TilShell from "../components/TilShell";

// Whether the signed-in employee wrote this entry, for its Edit and Delete
// buttons. Case-insensitive, as the backend's own author check is. Module
// scope, not a closure in the component, so it isn't a new function on every
// render.
function isOwnEntry(submittedByEmail: string, myEmail: string | undefined): boolean {
  return Boolean(myEmail) && submittedByEmail.toLowerCase() === myEmail?.toLowerCase();
}

// Today I Learned: a company-wide feed of learnings from customers, partners,
// and internal sources, plus the form to add one. The backend searches,
// filters and pages the feed; this page asks only for the page in view.
export default function TilHomePage() {
  const navigate = useNavigate();
  const configured = isTilBackendConfigured();
  const userInfo = useTilUserInfo();
  const deleteSubmission = useDeleteTilSubmission();
  const { showError, showSuccess } = useNotifications();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TilSubmission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmContent, setConfirmContent] = useState<ConfirmationContent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const search = useDebouncedValue(searchQuery.trim(), 300);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const author = useDebouncedValue(authorQuery.trim(), 300);
  const [source, setSource] = useState<TilWhere | "">("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveAdvancedFilter = Boolean(dateFrom || dateTo || authorQuery.trim() || source);
  // Defaults to "all" -- the database already holds entries from many other
  // people (not just the signed-in employee), and that shared feed is the
  // whole point of this page, so it's the view people should land on
  // rather than "my own entries" first.
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<TilFeedLayout>(readTilFeedLayout);
  const [pageSize, setPageSize] = useState<TilFeedPageSize>(readTilFeedPageSize);

  // What the feed shows, shared by the page in view and the export.
  const filters = { search, dateFrom, dateTo, author, source, mine: tab === "mine" };
  const submissions = useTilSubmissions(tilFeedQuery(filters, page, pageSize));
  const exportEntries = useTilExportEntries();
  const [exporting, setExporting] = useState(false);
  const items = submissions.data?.items ?? [];
  const total = submissions.data?.total ?? 0;

  const canModerate = userInfo.data?.canModerate ?? false;
  const myEmail = userInfo.data?.email;

  // Whether anything beyond the tab narrows the feed.
  const narrowed = Boolean(search || dateFrom || dateTo || author || source);
  const isFiltering = narrowed || tab === "mine";
  // The controls stay while filtering, even when nothing matches, so a search
  // that finds nothing can still be changed. Hidden only for an empty feed.
  const showControls = Boolean(submissions.data) && (isFiltering || total > 0);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const shownPage = Math.min(page, pageCount);
  const rangeStart = total === 0 ? 0 : (shownPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(shownPage * pageSize, total);

  // A delete can leave this page past the last one; move to the new last page.
  // Set during render (React's pattern for adjusting state to new data), so
  // the empty page never paints.
  if (submissions.data && !submissions.isPlaceholderData && page > pageCount) setPage(pageCount);

  const changeLayout = (next: TilFeedLayout) => {
    setLayout(next);
    writeTilFeedLayout(next);
  };

  // Keeps the entry at the top of this page in view at the new size.
  const changePageSize = (next: TilFeedPageSize) => {
    setPage(pageContaining((shownPage - 1) * pageSize, next));
    setPageSize(next);
    writeTilFeedPageSize(next);
  };

  // Every entry the search, dates and tab select, not just this page.
  const runExport = async () => {
    setExporting(true);
    try {
      const entries = await exportEntries(tilFeedQuery(filters, 1, pageSize));
      downloadTilCsv(entries, window.location.origin, new Date());
      showSuccess(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`);
    } catch (err) {
      showError(`Couldn't export the entries. ${describeError(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const runDelete = (id: string) => {
    setDeletingId(id);
    deleteSubmission.mutate(id, {
      onSuccess: () => showSuccess("Entry deleted"),
      onError: (err) => showError(describeError(err)),
      onSettled: () => setDeletingId(null),
    });
  };

  const confirmDelete = (id: string) => {
    setConfirmContent({
      title: "Delete this entry?",
      text: "This can't be undone — the entry will be removed from the feed for everyone.",
      confirmLabel: "Delete",
      confirmColor: "primary",
      confirmAction: () => runDelete(id),
    });
  };

  return (
    <TilShell
      title="Today I Learned"
      subtitle="A shared feed of what we're learning from customers, partners, and each other."
      configured={configured}
      configKey="ONE_WSO2_TIL_BACKEND_URL"
      action={
        <Button variant="contained" startIcon={<PlusIcon size={16} />} onClick={() => setDialogOpen(true)}>
          New entry
        </Button>
      }
    >
      {showControls && (
        <Tabs
          value={tab}
          onChange={(_, next: "all" | "mine") => {
            setTab(next);
            setPage(1);
          }}
          sx={{ mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
        >
          <Tab value="all" label="All articles" />
          <Tab value="mine" label="My articles" />
        </Tabs>
      )}

      {showControls && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
            <TextField
              size="small"
              type="search"
              // The backend matches the title, the learning, the author and
              // the customer or partner, by the start of each word.
              placeholder="Search entries…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              // Pinned to one explicit height (not left to size="small"
              // alone) so this field, the Advanced Search button, and both
              // date fields below all line up exactly -- a plain TextField,
              // a Button and a date-type TextField each resolve "small" to
              // a slightly different native height in this theme, so
              // size="small" alone doesn't guarantee they match each other.
              sx={{ flex: 1, minWidth: 200, "& .MuiInputBase-root": { height: "37.125px" } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchQuery("");
                          setPage(1);
                        }}
                        aria-label="Clear search"
                      >
                        <XIcon size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              size="small"
              // Stays visually active even when collapsed if a filter in it
              // is still applied -- closing this panel only hides its
              // fields, so without this the feed would stay filtered with
              // no indication why.
              variant={showAdvanced || hasActiveAdvancedFilter ? "contained" : "outlined"}
              startIcon={<SlidersHorizontalIcon size={14} />}
              onClick={() => setShowAdvanced((v) => !v)}
              sx={{ flex: "none", textTransform: "none", fontWeight: 500, px: 1.5, minWidth: "auto", height: "37.125px" }}
            >
              Advanced Search{!showAdvanced && hasActiveAdvancedFilter ? " •" : ""}
            </Button>
            {canModerate && (
              <Tooltip title="Every entry matching the search, filters and tab, for Google Sheets or Excel">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon size={14} />}
                    onClick={() => void runExport()}
                    disabled={exporting || total === 0}
                    sx={{ flex: "none", textTransform: "none", fontWeight: 500, px: 1.5, minWidth: "auto", height: "37.125px" }}
                  >
                    {exporting ? "Exporting…" : "Export CSV"}
                  </Button>
                </span>
              </Tooltip>
            )}
            <TilFeedLayoutSwitch value={layout} onChange={changeLayout} />
          </Stack>

          {showAdvanced && (
            <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
              <TextField
                size="small"
                label="Author"
                // The author's name alone, by the start of each word, so
                // "ale" finds Alex without also finding entries that only
                // mention Alex, as the search box would.
                placeholder="Name"
                value={authorQuery}
                onChange={(e) => {
                  setAuthorQuery(e.target.value);
                  setPage(1);
                }}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: authorQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setAuthorQuery("");
                            setPage(1);
                          }}
                          aria-label="Clear author"
                        >
                          <XIcon size={16} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 200, "& .MuiInputBase-root": { height: "37.125px" } }}
              />
              <TextField
                select
                size="small"
                label="Source"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value as TilWhere | "");
                  setPage(1);
                }}
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                sx={{ width: 170, "& .MuiInputBase-root": { height: "37.125px" } }}
              >
                <MenuItem value="">Any source</MenuItem>
                {TIL_WHERE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="date"
                label="Submitted from"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: dateTo || undefined },
                  input: {
                    endAdornment: dateFrom && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDateFrom("");
                            setPage(1);
                          }}
                          aria-label="Clear from date"
                        >
                          <XIcon size={16} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 170, "& .MuiInputBase-root": { height: "37.125px" } }}
              />
              <TextField
                size="small"
                type="date"
                label="Submitted to"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: dateFrom || undefined },
                  input: {
                    endAdornment: dateTo && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDateTo("");
                            setPage(1);
                          }}
                          aria-label="Clear to date"
                        >
                          <XIcon size={16} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 170, "& .MuiInputBase-root": { height: "37.125px" } }}
              />
            </Stack>
          )}
        </Stack>
      )}

      {submissions.isLoading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 1.5 }} />
          ))}
        </Stack>
      ) : submissions.isError ? (
        <Alert severity="error">Couldn&apos;t load entries. {describeError(submissions.error)}</Alert>
      ) : total > 0 ? (
        <>
          {/* Dimmed while the next page loads; the previous one stays meanwhile. */}
          <Box sx={{ opacity: submissions.isPlaceholderData ? 0.6 : 1, transition: "opacity 120ms" }}>
            <TilFeed
              layout={layout}
              submissions={items}
              canChange={(s) => canModerate || isOwnEntry(s.submittedByEmail, myEmail)}
              deletingId={deletingId}
              onEdit={setEditing}
              onDelete={confirmDelete}
              onOpen={(id) => navigate(tilEntryPath(id))}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mt: 2,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Per page
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={pageSize}
                // null when the selected size is clicked again; a size is always on.
                onChange={(_, next: TilFeedPageSize | null) => next && changePageSize(next)}
                aria-label="Entries per page"
                sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.25 } }}
              >
                {TIL_FEED_PAGE_SIZES.map((size) => (
                  <ToggleButton key={size} value={size} aria-label={`${size} per page`}>
                    {size}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              {pageCount > 1 && (
                <Pagination count={pageCount} page={shownPage} onChange={(_, p) => setPage(p)} color="primary" />
              )}
              <Typography variant="caption" color="text.secondary">
                {rangeStart}–{rangeEnd} of {total}
              </Typography>
            </Stack>
          </Box>
        </>
      ) : (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {tab === "mine" && !narrowed
              ? "You haven't shared an entry yet."
              : isFiltering
                ? "No entries match your search."
                : "No entries yet. Be the first to share something you learned."}
          </Typography>
        </Box>
      )}

      <SubmitEntryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      {editing && <SubmitEntryDialog key={editing.id} open entry={editing} onClose={() => setEditing(null)} />}
      <ConfirmationDialog content={confirmContent} onClose={() => setConfirmContent(null)} />
    </TilShell>
  );
}
