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

import { ToggleButton, ToggleButtonGroup } from "@wso2/oxygen-ui";
import type { GroupCategoryFilter } from "../api/emailGroupTypes";

const OPTIONS: readonly { value: GroupCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "default", label: "Default" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

/**
 * Which origin of "My Groups" (already-subscribed groups) to show. Not a
 * subscribed/unsubscribed toggle — every row here is, by construction,
 * something the caller is already in; this only picks which of the three
 * origins (default / private / public) to include.
 */
export default function MyGroupsFilterBar({
  value,
  onChange,
}: {
  value: GroupCategoryFilter;
  onChange: (value: GroupCategoryFilter) => void;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_e, next: GroupCategoryFilter | null) => {
        if (next) onChange(next);
      }}
      aria-label="My Groups shown"
    >
      {OPTIONS.map((opt) => (
        <ToggleButton
          key={opt.value}
          value={opt.value}
          // Matches GroupsSearchField's explicit 36px height, so the two sit
          // level in the row rather than the field's own vertical padding
          // reading as taller than the button group next to it.
          sx={{ textTransform: "none", px: 1.5, fontSize: 12.5, height: 36 }}
        >
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
