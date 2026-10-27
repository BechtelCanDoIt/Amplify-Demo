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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import type { JSX } from "react";
import type { CategoryCounts } from "../../api/riskApi";
import { CountCells, CountHeaderCells, LegendRow, RegisterChip, CountLegend } from "./CategoryCounts";
import { mostRepeatedSentence, type RegisterRepeats } from "./categoryViews";

const KEYS: (keyof CategoryCounts)[] = ["open", "accept", "remediate", "closed"];

interface RepeatedCategoriesTableProps {
  groups: RegisterRepeats[];
  registerColors: Map<string, string>;
}

// "Repeated Risks Within Each Register": every register in scope, each with
// its Repeated Categories or a single "No repeated risks found" row.
export default function RepeatedCategoriesTable({ groups, registerColors }: RepeatedCategoriesTableProps): JSX.Element {
  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 200 }}>Register</TableCell>
              <TableCell>Repeated Category</TableCell>
              <CountHeaderCells keys={KEYS} />
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(({ register, rows }) => {
              const chip = (
                <RegisterChip register={register} color={registerColors.get(register.name) ?? "#6b7280"} full />
              );
              if (rows.length === 0) {
                return (
                  <TableRow key={register.id}>
                    <TableCell>{chip}</TableCell>
                    <TableCell colSpan={1 + KEYS.length}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        No repeated risks found
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              }
              return rows.map((row, i) => (
                <TableRow key={`${register.id}-${row.category_id}`}>
                  {i === 0 && (
                    <TableCell rowSpan={rows.length} sx={{ verticalAlign: "top" }}>
                      {chip}
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600 }}>{row.category_name}</TableCell>
                  <CountCells counts={row} keys={KEYS} />
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <LegendRow items={[<CountLegend key="counts" keys={KEYS} />]} note={mostRepeatedSentence(groups)} />
    </>
  );
}
