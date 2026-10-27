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
import { StarIcon } from "@wso2/oxygen-ui-icons-react";

/** The one colour for "primary quote", in light and dark themes (2026-10-14). */
export const PRIMARY_STAR_GOLD = "#F2B600";

/**
 * The primary quote's mark: a filled gold star, the same in the Quotes list,
 * "This Opportunity's Quotes" and the quote page's "Primary" chip. Colour
 * is set on the icon itself so a Chip's icon styling can't turn it grey.
 */
export default function PrimaryStar({ size = 14, label = "Primary" }: { size?: number; label?: string }): JSX.Element {
  return <StarIcon size={size} color={PRIMARY_STAR_GOLD} fill={PRIMARY_STAR_GOLD} aria-label={label} />;
}
