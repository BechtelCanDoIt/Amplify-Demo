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

import { useState } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";
import { useUserInfo } from "@api/useUserInfo";
import SignatureFieldsForm from "../components/SignatureFieldsForm";
import SignaturePreviewCard from "../components/SignaturePreviewCard";
import { EMPTY_SIGNATURE_DATA, type SignatureData } from "../util/signatureGenerator";

// Shrinks an element to a 1x1px clipped box instead of hiding it outright —
// unlike display:none/visibility:hidden, this keeps it in the accessibility
// tree, so assistive tech still sees it while sighted users don't. Same
// pattern as OrgChartShell / EmailGroupsShell.
// A WSO2 email signature, built and previewed entirely client-side — there
// is no backend here at all, unlike every other screen under Me. Ported from
// the standalone Email Group Manager app's second tab (its group-subscription
// half is @features/my/email-groups, a separate menu item — the two share no
// data or backend, so they were never one page here either).
export default function EmailSignaturePage() {
  const userInfo = useUserInfo();
  const [data, setData] = useState<SignatureData>(EMPTY_SIGNATURE_DATA);

  // Prefill once — the FIRST time the profile arrives — adjusted during
  // render rather than in an effect
  // (https://react.dev/learn/you-might-not-need-an-effect), so this can't
  // cascade into a second render the way the same update from inside a
  // useEffect would.
  //
  // Gated on a plain "have we ever done this" flag rather than the response
  // object's identity: react-query's structural sharing hands back a NEW
  // top-level object on ANY refetch where even one unrelated field changed
  // (workLocation, privileges, thumbnail — none of which this page reads),
  // e.g. after useUpdatePersonalInfo's `invalidateQueries(["user-info"])`
  // from the Me profile page. Re-running the prefill on that object-identity
  // change would silently overwrite a name the person had already edited by
  // hand — the exact thing this comment used to promise wouldn't happen.
  //
  // The same protection is needed within this ONE prefill too: the profile
  // fetch is a real network round trip, so someone can start typing before
  // it resolves. Checking `prev.name.trim()` (not `prev.name` — whitespace
  // isn't "already filled") means whatever they've already typed wins over
  // the fetched value — a field is only ever filled in from the profile
  // while it's still genuinely blank. Matches hasSignatureContent's own
  // trimmed gate: without the trim, a stray space typed while waiting could
  // block the prefill entirely, leaving hasSignatureContent seeing nothing
  // to preview despite a real name being available.
  const [hasPrefilled, setHasPrefilled] = useState(false);
  if (userInfo.data && !hasPrefilled) {
    setHasPrefilled(true);
    const { firstName, lastName } = userInfo.data;
    const designation = userInfo.data.designation ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (name || designation) {
      setData((prev) => ({
        ...prev,
        name: prev.name.trim() ? prev.name : name,
        designation: prev.designation.trim() ? prev.designation : designation,
      }));
    }
  }

  return (
    <Box>
      {/* A real, VISIBLE h1. This used to be visually hidden with a Chip above
          it carrying the same words — the duplicate was real, but hiding the
          heading fixed the wrong half of it. The rail is collapsible, and
          collapsing sets every label to `opacity: 0; width: 0`, so with it
          collapsed this title is the only text naming where you are. The chip
          was the redundant half, and it is gone.

          A parent chip earns its place only above a title that would not
          identify the screen alone — "Dashboard", "History", "Settings". */}
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Email Signature
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.25, maxWidth: "70ch" }}>
        Fill in your details to build a WSO2 email signature, then copy it straight into your mail
        client.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            p: 2.5,
          }}
        >
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Your details
          </Typography>
          <SignatureFieldsForm data={data} onChange={setData} />
        </Box>

        <SignaturePreviewCard data={data} />
      </Box>
    </Box>
  );
}
