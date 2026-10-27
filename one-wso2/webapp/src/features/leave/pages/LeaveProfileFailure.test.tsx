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

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";

// The real LeavePage, gate and /user-info query, over a Leave backend that
// refuses every request. Only what sits outside Leave is stubbed.
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@hooks/useAsgardeoSub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hooks/useAsgardeoSub")>()),
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "someone" }, retry: () => {} }),
}));
vi.mock("@config/apiConfig", () => ({
  isLeaveBackendConfigured: () => true,
  leaveServiceUrls: { userInfo: "https://leave.example.test/user-info" },
}));
vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  authedGet: vi.fn(),
}));

const { HttpError, authedGet } = await import("@api/http");
const { useLeaveUserInfo } = await import("../api/useLeaveData");
const { default: LeavePage, LeaveKindRoute } = await import("./LeavePage");

/** Stands in for a routed Leave screen: it reads /user-info, as they all do. */
function ReadsProfile() {
  const profile = useLeaveUserInfo();
  return <div>{profile.isError ? "profile failed" : "profile loading"}</div>;
}

function showLeave() {
  // The app's own client defaults — `refetchOnMount: false` included, which is
  // not enough on its own: a query that failed with no data still refetches
  // when a component using it mounts.
  const client = new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/me/leave/apply/general"]}>
        <Routes>
          <Route path="/me/leave" element={<LeavePage />}>
            <Route
              path="apply/general"
              element={
                <LeaveKindRoute gateId="leave-apply">
                  <ReadsProfile />
                </LeaveKindRoute>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.mocked(authedGet).mockReset();
});

describe("Leave when /user-info keeps failing", () => {
  it("settles on the failure instead of refetching in a loop", async () => {
    vi.mocked(authedGet).mockImplementation(async (url: string) => {
      throw new HttpError(url, 403, '{"message":"no"}');
    });

    showLeave();

    await screen.findByText("profile failed");
    await new Promise((resolve) => setTimeout(resolve, 250)); // a loop would keep going here

    // The first fetch, and at most one more when the screen first mounts.
    expect(vi.mocked(authedGet).mock.calls.length).toBeLessThanOrEqual(2);
  });
});
