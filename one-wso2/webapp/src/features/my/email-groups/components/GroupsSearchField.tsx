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

import { Box, InputAdornment, OutlinedInput } from "@wso2/oxygen-ui";
import { SearchIcon, XIcon } from "@wso2/oxygen-ui-icons-react";

// One search field, reused for both sections — each section keeps its own
// independent search text rather than one shared box, since "My Groups" and
// "Public groups" are two different lists a reader searches separately.
export default function GroupsSearchField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <OutlinedInput
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search groups"
      slotProps={{ input: { "aria-label": ariaLabel } }}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon size={15} />
        </InputAdornment>
      }
      endAdornment={
        value ? (
          <InputAdornment position="end">
            <Box
              component="button"
              type="button"
              aria-label="Clear search"
              onClick={() => onChange("")}
              sx={{
                border: 0,
                bgcolor: "transparent",
                cursor: "pointer",
                display: "inline-flex",
                color: "text.secondary",
                p: 0,
              }}
            >
              <XIcon size={13} />
            </Box>
          </InputAdornment>
        ) : undefined
      }
      sx={{ height: 36, fontSize: 13, width: { xs: "100%", sm: 280 } }}
    />
  );
}
