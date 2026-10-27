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

import { Typography } from "@wso2/oxygen-ui";

// A bolder, coloured section heading plus a one-line description — used for
// "My Groups" and "Public groups", the page's two real sections. Deliberately
// NOT the shared muted small-caps SectionHeader (@features/people-ops):
// that's a subtle divider between many minor subsections on a long profile
// page, and reads as too quiet for the two main sections on a page this
// short, which want to stand out rather than fade into a divider.
export default function GroupSectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary", mt: 1.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {description}
      </Typography>
    </>
  );
}
