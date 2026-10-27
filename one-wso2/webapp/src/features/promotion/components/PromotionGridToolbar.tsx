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

import { DataGrid } from "@wso2/oxygen-ui";

// Ports source's own CustomTable toolbar (Columns/Filter/Export, plus
// sorting and per-type filter editors it hand-rolls elsewhere) as MUI X
// DataGrid's built-in equivalents. Same pattern as PAR's
// ParGridToolbarWithExport.
// Every Functional Lead Portal grid gets Export (unlike PAR's default,
// withheld pattern): source itself offers export on all four of its own
// tabs here, unconditionally.
//
// Columns/Filters render the same icon+label button Density/Export already
// use (both render DataGrid's own `baseButton` slot, a plain Button, not an
// icon-only one) — wrapping them in a bare `ToolbarButton` instead is
// icon-only and reads as a different, less finished control sitting next
// to the other two.
export function PromotionGridToolbar() {
  return (
    <DataGrid.Toolbar>
      <DataGrid.ColumnsPanelTrigger size="small" startIcon={<DataGrid.GridColumnIcon fontSize="small" />}>
        Columns
      </DataGrid.ColumnsPanelTrigger>
      <DataGrid.FilterPanelTrigger size="small" startIcon={<DataGrid.GridFilterListIcon fontSize="small" />}>
        Filters
      </DataGrid.FilterPanelTrigger>
      <DataGrid.GridToolbarDensitySelector />
      <DataGrid.GridToolbarExport />
    </DataGrid.Toolbar>
  );
}
