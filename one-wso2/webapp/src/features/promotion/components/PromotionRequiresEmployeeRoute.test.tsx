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
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

const profile: {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
  data?: { employee: { employmentType: string } };
} = { isPending: false, isError: false, isFetching: false, error: null, refetch: () => undefined };

vi.mock("@features/my/api/useMeProfile", () => ({ useMeProfile: () => profile }));

const { default: PromotionRequiresEmployeeRoute } = await import("./PromotionRequiresEmployeeRoute");

function UrlProbe() {
  const { pathname } = useLocation();
  return <div data-testid="url">{pathname}</div>;
}

beforeEach(() => {
  profile.isPending = false;
  profile.isError = false;
  profile.error = null;
  profile.data = undefined;
});

function show() {
  return render(
    <MemoryRouter initialEntries={["/me/promotion"]}>
      <UrlProbe />
      <Routes>
        <Route path="/me" element={<div data-testid="me" />} />
        <Route
          path="/me/promotion"
          element={
            <PromotionRequiresEmployeeRoute>
              <div data-testid="page" />
            </PromotionRequiresEmployeeRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PromotionRequiresEmployeeRoute", () => {
  it("renders the page for an eligible employee", () => {
    profile.data = { employee: { employmentType: "PERMANENT" } };
    show();
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("redirects an ineligible employee to /me", async () => {
    profile.data = { employee: { employmentType: "INTERNSHIP" } };
    show();
    expect(await screen.findByTestId("me")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("renders nothing while the profile is loading", () => {
    profile.isPending = true;
    show();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me/promotion");
  });

  it("blocks the page and stays put when the profile fails", () => {
    profile.isError = true;
    profile.error = new Error("boom");
    show();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/me/promotion");
  });
});
