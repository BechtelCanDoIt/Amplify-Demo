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
import { useNavigate } from "react-router";
import { Alert, Box } from "@wso2/oxygen-ui";
import { useNotifications } from "@context/notifications/NotificationsContext";
import SalesShell from "../components/SalesShell";
import MeetingFilters from "../components/MeetingFilters";
import MeetingsTable from "../components/MeetingsTable";
import AttachmentsDialog from "../components/AttachmentsDialog";
import type { Meeting, MeetingScope } from "../api/salesTypes";
import { isSalesBackendConfigured, useSalesRegions, useMeetings } from "../api/useSalesData";
import { useSalesGate } from "../api/useSalesGate";
import { describeError, isForbidden } from "../util/salesError";
import { meetingPath } from "../util/salesPaths";
import { isEchoBackendConfigured, useMeetingCoverage } from "../meddpicc/api/useMeddpiccData";
import { useReanalyseMeeting } from "../meddpicc/api/useMeddpiccMutations";

const DEFAULT_PAGE_SIZE = 10;

/**
 * Echo — meeting history.
 *
 * Ported from meet-app's Meeting History tab. Create Meeting and the Dashboard
 * are deliberately not here: scheduling still happens in the calendar add-on,
 * and the analytics screen is not part of this one.
 */
export default function SalesMeetingsPage() {
  const configured = isSalesBackendConfigured();

  const [scope, setScope] = useState<MeetingScope>("echo");
  const [region, setRegion] = useState<string | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [attachmentsFor, setAttachmentsFor] = useState<Meeting | null>(null);

  const navigate = useNavigate();

  const { showSuccess, showError } = useNotifications();
  const gate = useSalesGate();
  const regionsQuery = useSalesRegions();

  // Both scopes list past meetings only; the "already ended" cutoff is computed per fetch
  // inside useMeetings, so any refetch picks up meetings that have ended since.
  const meetingsQuery = useMeetings({
    search,
    region,
    echoOnly: scope === "echo",
    page,
    pageSize,
  });

  // Any filter change invalidates the current page number — page 4 of the old
  // result set is meaningless in the new one, and asking the server for it
  // yields an empty table that looks like "no meetings" rather than "you are
  // past the end".
  //
  // Done in the handlers rather than in an effect on [scope, region, search].
  // An effect would render once with the new filter still paired with the old
  // page, firing a request for a page that may not exist, and only then correct
  // itself. React batches these two setters into a single render, so the
  // out-of-range pairing never reaches a query.
  const changeScope = (next: MeetingScope) => {
    setScope(next);
    // Echo meetings carry no region (the add-on never records the host's sub-team), so
    // any region would empty the list. The filter is disabled for Echo and reset here; it
    // stays on "All regions" when switching back rather than restoring an old pick.
    if (next === "echo") setRegion(null);
    setPage(0);
  };
  const changeRegion = (next: string | null) => {
    setRegion(next);
    setPage(0);
  };
  const changeSearch = (next: string | null) => {
    setSearch(next);
    setPage(0);
  };
  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(0);
  };

  const meetings = meetingsQuery.data?.meetings ?? [];
  const totalCount = meetingsQuery.data?.count ?? 0;

  // MEDDPICC for the visible page, in one request. A failure here leaves the
  // column blank rather than taking the meeting list down with it.
  const coverageQuery = useMeetingCoverage(meetings.map((meeting) => meeting.meetingId));
  const reanalyse = useReanalyseMeeting();
  // Without the MEDDPICC backend the column and its actions are left out.
  const echoConfigured = isEchoBackendConfigured();
  // Edit rights, as far as this app can tell: an admin or the call's host. The
  // backend also lets the Opportunity owner in, and is the one that decides.
  const canReanalyse = (meeting: Meeting): boolean =>
    gate.isAdmin || (Boolean(gate.workEmail) && meeting.host === gate.workEmail);
  const requestReanalysis = async (meeting: Meeting) => {
    try {
      await reanalyse.mutateAsync(meeting.meetingId);
      showSuccess(`"${meeting.title}" will be analysed again.`);
    } catch (error: unknown) {
      showError(describeError(error));
    }
  };

  // One 403 anywhere means the caller is in no authorised group — the backend
  // refuses every endpoint in that case — so the page says so once instead of
  // repeating it per panel.
  const forbidden = isForbidden(meetingsQuery.error) || isForbidden(regionsQuery.error);

  return (
    <SalesShell
      title="Meetings"
      subtitle="Recorded sales meetings, with their transcripts, notes and MEDDPICC evidence."
      configured={configured}
      configKey="ONE_WSO2_REVOPS_BACKEND_URL"
      forbidden={forbidden}
    >
      <Box>
        <MeetingFilters
          scope={scope}
          onScopeChange={changeScope}
          region={region}
          onRegionChange={changeRegion}
          regions={regionsQuery.data?.regions ?? []}
          regionsLoading={regionsQuery.isLoading}
          regionDisabled={scope === "echo"}
          search={search}
          onSearchChange={changeSearch}
        />

        {/* A failed list is shown here rather than swapping out the filters:
            the user's next move is almost always to change a filter, so taking
            them away would remove the fix along with the problem. */}
        {meetingsQuery.error && !forbidden && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {describeError(meetingsQuery.error)}
          </Alert>
        )}

        <MeetingsTable
          meetings={meetings}
          totalCount={totalCount}
          loading={meetingsQuery.isLoading || meetingsQuery.isFetching}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
          onOpenAttachments={setAttachmentsFor}
          coverage={echoConfigured ? coverageQuery.byId : undefined}
          coverageLoading={coverageQuery.isLoading}
          onOpenAnalysis={(meeting, letter) =>
            void navigate(meetingPath(meeting.meetingId, { tab: "meddpicc", letter }))
          }
          canReanalyse={canReanalyse}
          onReanalyse={echoConfigured ? (meeting) => void requestReanalysis(meeting) : undefined}
          reanalysingId={reanalyse.isPending ? (reanalyse.variables ?? null) : null}
        />
      </Box>


      <AttachmentsDialog meeting={attachmentsFor} onClose={() => setAttachmentsFor(null)} />
    </SalesShell>
  );
}
