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

import { useContext, type HTMLAttributes, type JSX } from "react";
import { Box, Paper, Typography, type PaperProps } from "@wso2/oxygen-ui";
import { descriptionAfterName } from "@features/sales/cado2/utils/productDescription";
import { ProductListContext, productLabel } from "./productList";

/**
 * The product list's popup, with a status line below the options so a list
 * still loading isn't taken for all there is. A click on it doesn't take
 * the focus from the search box, which would close the popup.
 */
export function ProductListPaper({ children, ...props }: PaperProps): JSX.Element {
  const list = useContext(ProductListContext);
  return (
    <Paper {...props}>
      {children}
      {list?.status ? (
        <Typography
          component="div"
          variant="caption"
          color="text.secondary"
          onMouseDown={(e) => e.preventDefault()}
          sx={{ px: 2, py: 0.75, borderTop: 1, borderColor: "divider" }}
        >
          {list.status}
        </Typography>
      ) : null}
    </Paper>
  );
}

/** One option: "Name (CODE)", then the description on one quiet line; in full on hover. */
export function ProductOption({
  liProps,
  name,
  code,
  description,
}: {
  liProps: HTMLAttributes<HTMLLIElement>;
  name: string;
  code: string | null | undefined;
  description: string | null | undefined;
}): JSX.Element {
  const label = productLabel(name, code);
  const about = descriptionAfterName(name, description);
  return (
    <li {...liProps}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap title={label}>
          {label}
        </Typography>
        {about ? (
          <Typography variant="caption" color="text.secondary" component="div" noWrap title={about}>
            {about}
          </Typography>
        ) : null}
      </Box>
    </li>
  );
}
