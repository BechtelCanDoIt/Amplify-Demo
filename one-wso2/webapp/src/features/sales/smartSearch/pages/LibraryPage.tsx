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

import { useEffect, useState, type JSX, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Alert, Box } from "@wso2/oxygen-ui";
import PerspectiveHeader from "@components/perspective-header/PerspectiveHeader";
import { isSmartSearchBackendConfigured } from "@config/apiConfig";
import LibraryResults from "../components/LibraryResults";
import LibraryStart from "../components/LibraryStart";
import { isRefreshOfThisAddress, markRefreshHandled } from "../util/libraryReload";
import { useRecentSearches } from "../util/useLibraryStorage";
import {
  LIBRARY_MAX_QUERY_LENGTH,
  LIBRARY_QUERY_PARAM,
  SMART_SEARCH_LIBRARY_PATH,
  libraryPath,
} from "../smartSearchPaths";

// The page is centred and capped, so it looks the same with the side menu open or collapsed, and on wide screens.
const PAGE_MAX_WIDTH = 1200;

function PageFrame({ children }: { readonly children: ReactNode }): JSX.Element {
  return <Box sx={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, mx: "auto" }}>{children}</Box>;
}

/** The question in the address; what the page shows follows from it alone. */
function LibraryContent(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const recent = useRecentSearches();
  const location = useLocation();
  const [refreshedOn] = useState(() => (isRefreshOfThisAddress() ? location.key : null));
  const ignoreQuestion = refreshedOn !== null && location.key === refreshedOn;
  const query = ignoreQuestion ? "" : (params.get(LIBRARY_QUERY_PARAM) ?? "").trim().slice(0, LIBRARY_MAX_QUERY_LENGTH);

  // A refresh lands on the start screen, so the address drops the question too.
  useEffect(() => {
    if (refreshedOn === null) return;
    markRefreshHandled();
    navigate(SMART_SEARCH_LIBRARY_PATH, { replace: true });
  }, [refreshedOn, navigate]);

  const search = (question: string) => {
    recent.add(question);
    navigate(libraryPath(question));
  };

  // Keyed by the question, so a new one starts with a clean filter and selection.
  return query ? (
    <LibraryResults key={query} query={query} onSearch={search} onBack={() => navigate(SMART_SEARCH_LIBRARY_PATH)} />
  ) : (
    <LibraryStart onSearch={search} />
  );
}

/**
 * Sales — Library: plain-language search over Pitstop's content, behind the `smartSearch` preview flag.
 * Without a backend URL it says which key to set and makes no request.
 */
export default function LibraryPage(): JSX.Element {
  if (!isSmartSearchBackendConfigured()) {
    return (
      <PageFrame>
        <PerspectiveHeader
          title="Ask Sales"
          subtitle="Ask a question in plain language. Ask Sales finds the exact page, slide, sheet or video moment in Pitstop content that answers it."
        />
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Ask Sales isn&apos;t connected yet. Set <code>ONE_WSO2_SMART_SEARCH_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> and reload.
        </Alert>
      </PageFrame>
    );
  }
  return (
    <PageFrame>
      <LibraryContent />
    </PageFrame>
  );
}
