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

import {
  Box,
  Checkbox,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  Typography,
} from "@wso2/oxygen-ui";
import { MailPlusIcon, MailXIcon } from "@wso2/oxygen-ui-icons-react";
import { Fragment, type ReactNode } from "react";
import type { GroupCategory, GroupCategoryFilter, MyGroupRow } from "../api/emailGroupTypes";
import { splitIntoColumns } from "../util/columns";

/** Both lists' column count. */
const COLUMN_COUNT = 2;

// One row: the group's address on the left, its action chip(s) pinned to
// the right on the SAME line, and an optional leading checkbox (public,
// joinable rows only). Shared by both lists on the page so they read as one
// consistent list rather than two components with two different rhythms.
//
// Deliberately NOT MUI's `secondaryAction` (which absolutely-positions its
// content over a fixed slice of the row's width, independent of how much
// room the name actually needs): a real flex row instead, where the name is
// the one flexible item — it takes whatever space is left after the fixed-
// width chip(s), and shrinks to an ellipsis rather than the two colliding
// when there isn't enough of it.
function GroupRow({
  name,
  checkbox,
  trailing,
}: {
  name: string;
  checkbox?: { checked: boolean; onChange: () => void };
  trailing?: ReactNode;
}) {
  return (
    <ListItem
      // Clicking the row toggles the checkbox, same as the source app — the
      // hit target for "select this one" is the whole row, not just the tiny
      // box. Rows with no checkbox (My Groups) aren't clickable.
      onClick={checkbox ? checkbox.onChange : undefined}
      sx={{ cursor: checkbox ? "pointer" : "default", py: 0.75, alignItems: "center", gap: 1 }}
    >
      {checkbox && (
        <ListItemIcon sx={{ minWidth: 32 }}>
          {/* No `tabIndex={-1}` here — the row's own onClick above is a
              mouse-only convenience layer (a plain ListItem has no keyboard
              activation path of its own), so the checkbox has to stay in
              tab order itself or a keyboard user has no way to select a row
              at all. `aria-label` names which group it toggles, since the
              adjacent name text isn't wired up as this input's label. */}
          <Checkbox
            edge="start"
            checked={checkbox.checked}
            disableRipple
            onChange={checkbox.onChange}
            onClick={(e) => e.stopPropagation()}
            slotProps={{ input: { "aria-label": `Select ${name}` } }}
          />
        </ListItemIcon>
      )}
      {/* Ellipsis rather than the old break-anywhere wrap: a long address
          shrinks to fit whatever room the chip(s) leave it, rather than
          pushing them off the row — the native `title` gives the full
          address on hover. */}
      <Typography
        title={name}
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: 13.5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </Typography>
      {trailing && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
          {trailing}
        </Box>
      )}
    </ListItem>
  );
}

function EmptyRow({ text }: { text: string }) {
  // role="status" so a screen reader announces the new text when a search
  // narrows a list to nothing, or a filter switch reveals an empty
  // category — otherwise it's just text that changed silently off-screen.
  return (
    <Typography
      role="status"
      variant="body2"
      color="text.secondary"
      sx={{ py: 2, px: 1, fontStyle: "italic" }}
    >
      {text}
    </Typography>
  );
}

/**
 * Lays out `items` into up to `COLUMN_COUNT` side-by-side columns — the
 * whole list at once (one column stacked full-width on a phone, side by side
 * from tablet up), rather than paging. Separated by plain whitespace rather
 * than a rule: a vertical line looked fine centred in a wide gap, but with
 * columns this narrow it either crowded one side's text or the other
 * depending which column it was biased toward — whitespace alone reads as
 * separate groups just as clearly.
 *
 * On a phone the "columns" stack into one column, and a divider is added
 * between them there (hidden again from the breakpoint they sit side by
 * side) so the seam between one column's rows and the next still reads as a
 * boundary rather than an unrelated gap in the middle of one list.
 */
function GroupColumns<T>({
  items,
  keyOf,
  renderRow,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderRow: (item: T) => ReactNode;
}) {
  const columns = splitIntoColumns(items, COLUMN_COUNT);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: `repeat(${COLUMN_COUNT}, minmax(0, 1fr))` },
        columnGap: { md: 3 },
      }}
    >
      {columns.map((column, colIndex) => (
        <Box key={colIndex}>
          {/* Fragment, not a div: a <ul>'s only valid children are <li>
              elements, and ListItem/Divider both render as one. A div
              wrapper here would sit between List and its rows in the DOM
              (ul > div > li), which is exactly the shape that makes some
              screen readers miscount or skip list items. */}
          <List dense disablePadding>
            {column.map((item, i) => (
              <Fragment key={keyOf(item)}>
                {renderRow(item)}
                {i < column.length - 1 && <Divider component="li" />}
              </Fragment>
            ))}
          </List>
          {colIndex < columns.length - 1 && column.length > 0 && (
            <Divider sx={{ display: { xs: "block", md: "none" } }} />
          )}
        </Box>
      ))}
    </Box>
  );
}

const CATEGORY_LABEL: Record<GroupCategory, string> = {
  default: "Default",
  private: "Private",
  public: "Public",
};

/**
 * What to say when a list is empty — distinguishing "your search matched
 * nothing" (there's something to clear or widen) from "there's genuinely
 * nothing here" (no search box would help). Blaming a search that doesn't
 * exist — e.g. telling someone with zero private memberships to try a
 * different search when the Private filter's search box is blank — reads as
 * a bug, not a translation of the actual state.
 */
const MY_GROUPS_EMPTY_MESSAGE: Record<GroupCategoryFilter, string> = {
  all: "You're not in any groups yet.",
  default: "You're not in any default groups.",
  public: "You haven't subscribed to any public groups yet.",
  private: "You're not in any private groups.",
};

function myGroupsEmptyText(search: string, filter: GroupCategoryFilter): string {
  return search.trim() ? "No groups match your search." : MY_GROUPS_EMPTY_MESSAGE[filter];
}

function publicGroupsEmptyText(search: string): string {
  return search.trim() ? "No groups match your search." : "You've joined every public group.";
}

/**
 * "My Groups" — every group the caller is already subscribed to, tagged with
 * where it came from. Default and private rows are read-only; a public row
 * carries the one Unsubscribe action this page offers (the joinable
 * directory below only ever shows groups the caller hasn't joined).
 */
export function MyGroupsList({
  rows,
  onUnsubscribe,
  showCategoryTag,
  search,
  categoryFilter,
}: {
  rows: readonly MyGroupRow[];
  onUnsubscribe: (name: string) => void;
  /**
   * The category chip only earns its place under the "All" filter, where a
   * row's origin isn't otherwise obvious. Under "Default"/"Public"/"Private"
   * every row is already that one thing — repeating it on every row would
   * just be the section's own filter choice, echoed back at the reader once
   * per row.
   */
  showCategoryTag: boolean;
  /** Only used to pick the right empty-state wording — see myGroupsEmptyText. */
  search: string;
  categoryFilter: GroupCategoryFilter;
}) {
  if (rows.length === 0) return <EmptyRow text={myGroupsEmptyText(search, categoryFilter)} />;
  return (
    <GroupColumns
      items={rows}
      keyOf={(row) => `${row.category}:${row.name}`}
      renderRow={(row) => (
        <GroupRow
          name={row.name}
          trailing={
            <>
              {showCategoryTag && (
                <Chip label={CATEGORY_LABEL[row.category]} size="small" variant="outlined" />
              )}
              {row.category === "public" && (
                <Chip
                  label="Unsubscribe"
                  size="small"
                  variant="outlined"
                  color="error"
                  icon={<MailXIcon size={13} />}
                  onClick={() => onUnsubscribe(row.name)}
                  sx={{ cursor: "pointer" }}
                />
              )}
            </>
          }
        />
      )}
    />
  );
}

/**
 * The public directory, narrowed to groups the caller hasn't joined — a
 * checkbox for bulk selection, plus an immediate per-row Subscribe action.
 */
export function PublicGroupList({
  groups,
  selected,
  onToggleSelect,
  onSubscribe,
  search,
}: {
  groups: readonly { name: string }[];
  selected: ReadonlySet<string>;
  onToggleSelect: (name: string) => void;
  onSubscribe: (name: string) => void;
  /** Only used to pick the right empty-state wording — see publicGroupsEmptyText. */
  search: string;
}) {
  if (groups.length === 0) return <EmptyRow text={publicGroupsEmptyText(search)} />;
  return (
    <GroupColumns
      items={groups}
      keyOf={(g) => g.name}
      renderRow={(g) => (
        <GroupRow
          name={g.name}
          checkbox={{ checked: selected.has(g.name), onChange: () => onToggleSelect(g.name) }}
          trailing={
            <Chip
              label="Subscribe"
              size="small"
              variant="outlined"
              color="success"
              icon={<MailPlusIcon size={13} />}
              onClick={(e) => {
                e.stopPropagation();
                onSubscribe(g.name);
              }}
              sx={{ cursor: "pointer" }}
            />
          }
        />
      )}
    />
  );
}
