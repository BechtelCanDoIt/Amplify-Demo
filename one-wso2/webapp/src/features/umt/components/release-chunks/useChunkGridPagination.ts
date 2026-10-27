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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useState } from "react";
import type { DataGrid } from "@wso2/oxygen-ui";
import type { UmtPageRequest } from "../../api/umtReleaseChunks";
import { UMT_CHUNK_PAGE_SIZE_OPTIONS } from "../../lib/umtReleaseChunks";
import { useRetainedRowCount } from "./useRetainedRowCount";

// The paging the pending and released grids share: the page being shown, the
// list's query for that page, and the grid props that make the grid page on
// the server against the query's total.
//
// The query is passed in, rather than the total, because each needs the
// other: the query takes the page as its input, and the grid's row count comes
// out of the query.
export function useChunkGridPagination<TQuery extends { data?: { totalCount: number } }>(
  useChunksPage: (page: UmtPageRequest) => TQuery,
) {
  const [paginationModel, setPaginationModel] = useState<DataGrid.GridPaginationModel>({
    page: 0,
    pageSize: UMT_CHUNK_PAGE_SIZE_OPTIONS[0],
  });
  const chunks = useChunksPage(paginationModel);
  const rowCount = useRetainedRowCount(chunks.data?.totalCount);

  return {
    chunks,
    gridProps: {
      onPaginationModelChange: setPaginationModel,
      pageSizeOptions: UMT_CHUNK_PAGE_SIZE_OPTIONS,
      paginationMode: "server",
      paginationModel,
      rowCount,
    } as const,
  };
}
