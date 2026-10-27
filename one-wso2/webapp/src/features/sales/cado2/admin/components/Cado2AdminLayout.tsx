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

import type { JSX } from "react";
import { Link as RouterLink, Outlet, useMatch, useNavigate } from "react-router";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@wso2/oxygen-ui";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import { cado2Paths, type Cado2AdminSection } from "@features/sales/cado2/cado2Paths";
import { ADMIN_SECTION_GROUPS, ADMIN_SECTIONS } from "../adminSections";

/**
 * CadO2 Admin: a grouped section list beside the selected section. Each
 * section is its own route and renders its own heading. On a narrow screen the
 * list becomes a select above the content, so the content keeps the width.
 */
export default function Cado2AdminLayout(): JSX.Element {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const match = useMatch(`${cado2Paths.admin}/:section/*`);
  const current = ADMIN_SECTIONS.find((s) => s.id === match?.params.section);
  useDocumentTitle(current ? `${current.label} · CADO2 Admin` : "CADO2 Admin");

  const list = (
    <Paper variant="outlined" sx={{ width: 240, flexShrink: 0, alignSelf: "flex-start", py: 0.5 }}>
      <List component="nav" aria-label="CADO2 Admin sections" dense disablePadding>
        {ADMIN_SECTION_GROUPS.map((group) => (
          <Box component="li" key={group.label} sx={{ listStyle: "none" }}>
            <Box component="ul" sx={{ p: 0 }}>
              <ListSubheader sx={{ lineHeight: 2.5, bgcolor: "transparent" }}>{group.label}</ListSubheader>
              {group.sections.map((section) => (
                <ListItemButton
                  key={section.id}
                  component={RouterLink}
                  to={cado2Paths.adminSection(section.id)}
                  selected={section.id === current?.id}
                  aria-current={section.id === current?.id ? "page" : undefined}
                >
                  <ListItemText primary={section.label} />
                </ListItemButton>
              ))}
            </Box>
          </Box>
        ))}
      </List>
    </Paper>
  );

  const select = (
    <TextField
      select
      size="small"
      label="Admin section"
      value={current?.id ?? ""}
      onChange={(e) => navigate(cado2Paths.adminSection(e.target.value as Cado2AdminSection))}
      sx={{ mb: 2, minWidth: 260 }}
    >
      {ADMIN_SECTION_GROUPS.flatMap((group) => [
        <ListSubheader key={`group-${group.label}`}>{group.label}</ListSubheader>,
        ...group.sections.map((section) => (
          <MenuItem key={section.id} value={section.id}>
            {section.label}
          </MenuItem>
        )),
      ])}
    </TextField>
  );

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="p" sx={{ mb: 1 }}>
        CADO2 Admin
      </Typography>
      {wide ? (
        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
          {list}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      ) : (
        <Box>
          {select}
          <Outlet />
        </Box>
      )}
    </Box>
  );
}
