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
import { Box, IconButton, Tooltip, type SxProps, type Theme } from "@wso2/oxygen-ui";
import { PencilIcon, TrashIcon } from "@wso2/oxygen-ui-icons-react";

export interface SubmissionActionProps {
  canEdit: boolean;
  onEdit: () => void;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}

// Edit and delete for one entry in the feed, in every layout. Renders nothing
// when the viewer can do neither.
export default function SubmissionActions({
  canEdit,
  onEdit,
  canDelete,
  onDelete,
  deleting,
  className,
  sx,
}: SubmissionActionProps & { className?: string; sx?: SxProps<Theme> }) {
  if (!canEdit && !canDelete) return null;
  return (
    <Box className={className} sx={[{ display: "flex", flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {canEdit && (
        <Tooltip title="Edit this entry">
          <span>
            <IconButton
              size="small"
              onClick={(e) => {
                // Same as delete below: keeps the entry's own onClick
                // from also opening it.
                e.stopPropagation();
                onEdit();
              }}
              disabled={deleting}
              aria-label="Edit entry"
            >
              <PencilIcon size={16} />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Delete this entry">
          <span>
            <IconButton
              size="small"
              onClick={(e) => {
                // The entry's own onClick (onOpen) would otherwise also
                // fire, navigating to the entry this click just deleted.
                e.stopPropagation();
                onDelete();
              }}
              disabled={deleting}
              aria-label="Delete entry"
            >
              <TrashIcon size={16} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
