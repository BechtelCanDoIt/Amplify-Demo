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

import { Box, Chip, IconButton } from "@wso2/oxygen-ui";

// Generic 3-piece pager used by Open Requisitions, Recent Joiners, and
// Candidates. Renders next to a card's h4-style heading.
export default function Pager({
  total,
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  total: number | string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        textTransform: "none",
        letterSpacing: 0,
      }}
    >
      <Chip
        label={total}
        color="primary"
        size="small"
        sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
      />
      <IconButton
        onClick={onPrev}
        disabled={page === 0}
        size="small"
        aria-label="Previous page"
        sx={{ width: 22, height: 22, fontSize: 14, border: 1, borderColor: "divider", borderRadius: 0.75 }}
      >
        ‹
      </IconButton>
      <Box
        sx={{
          fontVariantNumeric: "tabular-nums",
          minWidth: 30,
          textAlign: "center",
          fontSize: 11,
          color: "text.secondary",
          fontWeight: 600,
        }}
      >
        {page + 1} / {pageCount}
      </Box>
      <IconButton
        onClick={onNext}
        disabled={page >= pageCount - 1}
        size="small"
        aria-label="Next page"
        sx={{ width: 22, height: 22, fontSize: 14, border: 1, borderColor: "divider", borderRadius: 0.75 }}
      >
        ›
      </IconButton>
    </Box>
  );
}
