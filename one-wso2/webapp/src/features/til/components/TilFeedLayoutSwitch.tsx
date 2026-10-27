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
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@wso2/oxygen-ui";
import {
  LayoutGridIcon,
  LayoutListIcon,
  ListIcon,
  StretchHorizontalIcon,
  type LucideIcon,
} from "@wso2/oxygen-ui-icons-react";
import { TIL_FEED_LAYOUTS, TIL_FEED_LAYOUT_LABELS, type TilFeedLayout } from "../util/tilFeedLayout";

const LAYOUT_ICONS: Record<TilFeedLayout, LucideIcon> = {
  cards: StretchHorizontalIcon,
  list: ListIcon,
  small: LayoutListIcon,
  large: LayoutGridIcon,
};

// Icon buttons for picking the feed's layout, beside Advanced Search.
export default function TilFeedLayoutSwitch({
  value,
  onChange,
}: {
  value: TilFeedLayout;
  onChange: (layout: TilFeedLayout) => void;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      // null when the selected button is clicked again; a layout is always on.
      onChange={(_, next: TilFeedLayout | null) => next && onChange(next)}
      aria-label="Feed layout"
      // The same pinned height as the search field and Advanced Search
      // button beside it (see TilHomePage).
      sx={{ flex: "none", "& .MuiToggleButton-root": { height: "37.125px", px: 1.25 } }}
    >
      {TIL_FEED_LAYOUTS.map((layout) => {
        const Icon = LAYOUT_ICONS[layout];
        return (
          <Tooltip key={layout} title={TIL_FEED_LAYOUT_LABELS[layout]}>
            <ToggleButton value={layout} aria-label={TIL_FEED_LAYOUT_LABELS[layout]}>
              <Icon size={16} />
            </ToggleButton>
          </Tooltip>
        );
      })}
    </ToggleButtonGroup>
  );
}
