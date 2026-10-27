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

import { Box, Typography } from "@mui/material";
import { ReactNode } from "react";

import FieldHistory from "@view/me/fieldHistory/FieldHistory";

/**
 * One read-only field on the profile: its label, its value, and — where the field is
 * audited and has actually changed — the control that opens its history.
 *
 * The control is revealed by hovering anywhere on the field rather than on the icon
 * itself, which would demand the reader find a target they cannot see.
 */
/**
 * The label half of a field, carrying its history control.
 *
 * Exists for fields whose value is not plain text — a status chip, a formatted date —
 * where the existing markup is worth keeping as it is. Wrap that field's Grid item in
 * `FieldHistoryHover` so the control reveals on hover the way FieldValue's does.
 */
export const FieldLabel = ({
  label,
  historyField,
  onViewAll,
  mb,
}: {
  label: string;
  /** Audit column name, or several for a value composed from more than one column. */
  historyField?: string | string[];
  onViewAll?: () => void;
  /** Gap below the label, for values that need more room than plain text. */
  mb?: number;
}) => (
  <Typography
    color="text.secondary"
    sx={{ fontWeight: 500, display: "flex", alignItems: "center", mb }}
  >
    {label}
    {historyField && (
      <FieldHistory field={historyField} label={label} onViewAll={onViewAll} />
    )}
  </Typography>
);

const FieldValue = ({
  label,
  value,
  children,
  historyField,
  onViewAll,
}: {
  label: string;
  /** Plain value; omit and pass `children` for a chip or any richer rendering. */
  value?: ReactNode;
  children?: ReactNode;
  /** Audit column name, or several for a value composed from more than one column. */
  historyField?: string | string[];
  onViewAll?: () => void;
}) => (
  <Box>
    <Typography
      color="text.secondary"
      sx={{ fontWeight: 500, display: "flex", alignItems: "center" }}
    >
      {label}
      {historyField && (
        <FieldHistory
          field={historyField}
          label={label}
          onViewAll={onViewAll}
        />
      )}
    </Typography>
    {children ?? (
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    )}
  </Box>
);

export default FieldValue;
