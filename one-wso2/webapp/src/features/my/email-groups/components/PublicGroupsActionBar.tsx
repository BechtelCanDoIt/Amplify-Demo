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

import { Badge, Box, Button, Typography } from "@wso2/oxygen-ui";
import { MailPlusIcon } from "@wso2/oxygen-ui-icons-react";

// The bulk-action bar for the public directory — which only ever lists
// groups the caller hasn't joined, so there's exactly one action (Subscribe)
// rather than a Subscribe/Unsubscribe pair. Appears only once something is
// checked, rather than sitting there permanently disabled.
export default function PublicGroupsActionBar({
  selectedCount,
  onSubscribeSelected,
  onClearSelection,
}: {
  selectedCount: number;
  onSubscribeSelected: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      {/* role="status" so a screen reader announces the new count as rows
          get checked or unchecked, rather than needing to be re-read manually. */}
      <Typography role="status" variant="caption" color="text.secondary">
        {selectedCount} selected
      </Typography>
      <Badge badgeContent={selectedCount} color="primary">
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<MailPlusIcon size={15} />}
          onClick={onSubscribeSelected}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Subscribe
        </Button>
      </Badge>
      <Button size="small" onClick={onClearSelection} sx={{ textTransform: "none", fontSize: 12 }}>
        Clear
      </Button>
    </Box>
  );
}
