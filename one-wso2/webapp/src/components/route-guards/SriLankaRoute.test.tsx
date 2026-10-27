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

import { beforeEach, describe, expect, it, vi } from "vitest";

// Stubbed with a factory: the real hook pulls @asgardeo/browser into this
// file's module graph, and that package's `buffer` directory import does not
// resolve under vitest's ESM loader — the same failure
// features/tour/tourTargets.test.tsx hits.
const userInfo = vi.hoisted(() => ({
  value: {} as {
    data?: { workLocation?: string };
    isPending: boolean;
    isError: boolean;
    error?: unknown;
    isFetching: boolean;
    refetch: () => void;
  },
}));
vi.mock("@api/useUserInfo", () => ({ useUserInfo: () => userInfo.value }));
vi.mock("@config/apiConfig", () => ({ peopleBackendUrl: "https://people.example.com" }));

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import SriLankaRoute from "./SriLankaRoute";

function UrlProbe() {
  return <div data-testid="url">{useLocation().pathname}</div>;
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={["/me/menu"]}>
      <UrlProbe />
      <Routes>
        <Route
          path="/me/menu"
          element={
            <SriLankaRoute>
              <div>the cafeteria</div>
            </SriLankaRoute>
          }
        />
        <Route path="/me" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  userInfo.value = {
    data: { workLocation: "Sri Lanka" },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: () => {},
  };
});

describe("SriLankaRoute", () => {
  it("renders the screen for a Sri Lanka employee", () => {
    renderGuarded();
    expect(screen.getByText("the cafeteria")).toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me/menu");
  });

  // THE hole this closes: the rail row and the tab were hidden, but the route
  // was mounted unconditionally, so the URL still worked.
  it("sends everyone else home", () => {
    userInfo.value = { ...userInfo.value, data: { workLocation: "India" } };
    renderGuarded();
    expect(screen.queryByText("the cafeteria")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me");
  });

  // Unresolved reads as "not Sri Lanka". Redirecting on that would throw a
  // Colombo employee off their own screen on every cold load, and a redirect
  // cannot be taken back — the component that would correct it has unmounted.
  it("waits rather than redirecting while the location is unknown", () => {
    userInfo.value = { ...userInfo.value, data: undefined, isPending: true };
    renderGuarded();
    expect(screen.queryByText("the cafeteria")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me/menu");
  });

  // A failed lookup is not a refusal. Redirecting silently would send someone
  // away with nothing to act on.
  it("reports a failed check instead of redirecting", () => {
    userInfo.value = {
      ...userInfo.value,
      data: undefined,
      isError: true,
      error: new Error("gateway timed out"),
    };
    renderGuarded();
    expect(screen.getByText(/Couldn't check where you work/)).toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me/menu");
  });
});
