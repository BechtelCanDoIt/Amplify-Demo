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

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Box, Card, Skeleton, Stack } from "@wso2/oxygen-ui";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { useNotifications } from "@context/notifications/NotificationsContext";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import EmailGroupsShell from "../components/EmailGroupsShell";
import GroupSectionHeading from "../components/GroupSectionHeading";
import GroupsSearchField from "../components/GroupsSearchField";
import MyGroupsFilterBar from "../components/MyGroupsFilterBar";
import PublicGroupsActionBar from "../components/PublicGroupsActionBar";
import ConfirmGroupActionDialog from "../components/ConfirmGroupActionDialog";
import { MyGroupsList, PublicGroupList } from "../components/GroupList";
import { isEmailGroupsBackendConfigured, useEmailGroupCatalog } from "../api/useEmailGroupsData";
import {
  useSubscribeToGroup,
  useUnsubscribeFromGroup,
  useUserGroupsKey,
} from "../api/useEmailGroupMutations";
import {
  filterMyGroupRows,
  filterPublicGroupsBySearch,
  joinablePublicGroups,
  myGroupRows,
} from "../util/groupCatalog";
import type { GroupAction, GroupCategoryFilter } from "../api/emailGroupTypes";

// The Google Groups mailing-list subscription manager, ported from the
// standalone Email Group Manager app (digiops-infra/apps/email-group-manager
// — the signature-generator half of that app is its own separate menu item,
// @features/my/email-signature).
//
// Two sections, both backed by the same three plain string[] endpoints:
//   - My Groups: everything the caller is ALREADY subscribed to, filtered by
//     origin (All / Default / Private / Public). Default and private rows
//     are read-only; a public row carries the only Unsubscribe action this
//     page offers.
//   - Public groups: the directory, narrowed to groups the caller has NOT
//     joined — check any number, then Subscribe as one confirmed batch, or
//     act on a single row from its own chip. Both routes go through the same
//     confirmation dialog.
export default function EmailGroupsPage() {
  const configured = isEmailGroupsBackendConfigured();
  const { catalog, isLoading, defaultGroups, allGroups, userGroups } = useEmailGroupCatalog();

  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  // Prefer people-app's canonical work email; fall back to the id_token claim
  // when that backend isn't configured. Either is the same address the
  // signed-in token authenticates as, which is what the service compares
  // `userEmail` in the payload against.
  const ownerEmail = userInfo.data?.workEmail ?? asgardeoUser.email;

  // Each section keeps its own search text — they're two different lists,
  // and there's no reason typing in one should ever affect the other.
  const [myGroupsSearch, setMyGroupsSearch] = useState("");
  const [publicGroupsSearch, setPublicGroupsSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<GroupCategoryFilter>("all");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    action: GroupAction;
    groups: string[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subscribe = useSubscribeToGroup();
  const unsubscribe = useUnsubscribeFromGroup();
  const qc = useQueryClient();
  const userGroupsKey = useUserGroupsKey();
  const { showSuccess, showError } = useNotifications();

  const myRows = useMemo(
    () =>
      catalog ? filterMyGroupRows(myGroupRows(catalog, categoryFilter), myGroupsSearch) : [],
    [catalog, categoryFilter, myGroupsSearch],
  );
  const joinableGroups = useMemo(
    () =>
      filterPublicGroupsBySearch(joinablePublicGroups(catalog?.publicGroups ?? []), publicGroupsSearch),
    [catalog, publicGroupsSearch],
  );

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // What's actually joinable right now, intersected with the raw selection —
  // `selected` is never pruned when a search hides a checked row, or when a
  // refetch drops a group out of the joinable list entirely (e.g. someone
  // else subscribed to it from another tab). The bulk action and the count
  // the toolbar shows both read from this SAME value, on purpose: computing
  // them separately is how "2 selected" and an enabled button end up next
  // to an action that silently does nothing (or acts on only one of them).
  const visibleSelected = useMemo(
    () => joinableGroups.filter((g) => selected.has(g.name)).map((g) => g.name),
    [joinableGroups, selected],
  );

  const openBulkSubscribe = () => {
    if (visibleSelected.length === 0) return;
    setConfirmState({ action: "subscribe", groups: visibleSelected });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    if (!ownerEmail) {
      // Rare and brief: ownerEmail resolves from the same profile call this
      // page already waits on elsewhere, so this is a "not yet" rather than
      // a real failure — surfaced rather than silently doing nothing, which
      // otherwise reads as a Confirm button that's simply broken.
      showError("Still loading your profile — try again in a moment.");
      return;
    }
    const { action, groups } = confirmState;
    const mutateAsync = action === "subscribe" ? subscribe.mutateAsync : unsubscribe.mutateAsync;

    setIsSubmitting(true);
    const failed: string[] = [];
    // One at a time, same as the source app — the backend has no batch
    // endpoint. Each failure is collected rather than aborting the rest, so
    // one bad group name in a big batch doesn't silently drop every group
    // after it.
    for (const groupName of groups) {
      try {
        await mutateAsync({ groupName, userEmail: ownerEmail });
      } catch {
        failed.push(groupName);
      }
    }
    // Once, after the whole batch — not per group. The mutations themselves
    // don't invalidate on their own success; this is the one place that
    // does, so a 10-group batch refetches the shared list once instead of
    // ten times. Skipped only when every single group in the batch failed,
    // since nothing then actually changed for the list to reflect.
    //
    // Not awaited: invalidateQueries' returned promise resolves once the
    // refetch itself completes, not just once it's kicked off. Awaiting it
    // would hold the dialog in its spinner state for the full duration of
    // the follow-up GET on top of the writes that already finished.
    if (failed.length < groups.length) {
      void qc.invalidateQueries({ queryKey: userGroupsKey });
    }
    setIsSubmitting(false);
    setConfirmState(null);
    // Only the groups THIS confirmation covered, and only the ones that
    // actually SUCCEEDED — never the whole selection, and never a group that
    // failed. A single-row action (its own chip, not the bulk toolbar) can
    // fire while an unrelated bulk selection is still pending elsewhere in
    // the list, so wiping the entire Set would silently discard it; and a
    // failed group left unchecked would force the user to go find and
    // re-check it by hand just to retry, instead of hitting Subscribe again.
    setSelected((prev) => {
      const next = new Set(prev);
      for (const groupName of groups) {
        if (!failed.includes(groupName)) next.delete(groupName);
      }
      return next;
    });

    const verb = action === "subscribe" ? "Subscribed to" : "Unsubscribed from";
    if (failed.length === 0) {
      showSuccess(`${verb} ${groups.length > 1 ? `${groups.length} groups` : groups[0]}.`);
    } else if (failed.length === groups.length) {
      showError(`Couldn't ${action === "subscribe" ? "subscribe to" : "unsubscribe from"} ${failed.length > 1 ? "any of the selected groups" : failed[0]}.`);
    } else {
      showError(
        `${verb} ${groups.length - failed.length} group${groups.length - failed.length > 1 ? "s" : ""}, but couldn't reach ${failed.length}: ${failed.join(", ")}.`,
      );
    }
  };

  return (
    <EmailGroupsShell
      title="Email Groups"
      configured={configured}
      configKey="ONE_WSO2_EMAIL_GROUPS_BACKEND_URL"
    >
      {isLoading ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      ) : (
        <>
          {defaultGroups.isError && (
            <ErrorNotice error={defaultGroups.error} onRetry={() => defaultGroups.refetch()} sx={{ mb: 2 }}>
              Couldn&apos;t load the default groups.
            </ErrorNotice>
          )}
          {allGroups.isError && (
            <ErrorNotice error={allGroups.error} onRetry={() => allGroups.refetch()} sx={{ mb: 2 }}>
              Couldn&apos;t load the group directory.
            </ErrorNotice>
          )}
          {userGroups.isError && (
            <ErrorNotice error={userGroups.error} onRetry={() => userGroups.refetch()} sx={{ mb: 2 }}>
              Couldn&apos;t load your current subscriptions.
            </ErrorNotice>
          )}

          {catalog && (
            <>
              <GroupSectionHeading
                title="My Groups"
                description="The groups you've subscribed to."
              />
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <GroupsSearchField
                  value={myGroupsSearch}
                  onChange={setMyGroupsSearch}
                  ariaLabel="Search My Groups"
                />
                <MyGroupsFilterBar value={categoryFilter} onChange={setCategoryFilter} />
              </Box>
              <Card variant="outlined">
                <MyGroupsList
                  rows={myRows}
                  onUnsubscribe={(name) => setConfirmState({ action: "unsubscribe", groups: [name] })}
                  showCategoryTag={categoryFilter === "all"}
                  search={myGroupsSearch}
                  categoryFilter={categoryFilter}
                />
              </Card>

              <GroupSectionHeading
                title="Subscribe to Public Groups"
                description="Public groups you haven't joined yet."
              />
              <Box sx={{ mb: 1.5 }}>
                <GroupsSearchField
                  value={publicGroupsSearch}
                  onChange={setPublicGroupsSearch}
                  ariaLabel="Search Public groups"
                />
              </Box>
              <PublicGroupsActionBar
                selectedCount={visibleSelected.length}
                onSubscribeSelected={openBulkSubscribe}
                onClearSelection={() => setSelected(new Set())}
              />
              <Card variant="outlined">
                <PublicGroupList
                  groups={joinableGroups}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onSubscribe={(name) => setConfirmState({ action: "subscribe", groups: [name] })}
                  search={publicGroupsSearch}
                />
              </Card>
            </>
          )}
        </>
      )}

      <ConfirmGroupActionDialog
        open={confirmState !== null}
        action={confirmState?.action ?? "subscribe"}
        groups={confirmState?.groups ?? []}
        busy={isSubmitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </EmailGroupsShell>
  );
}
