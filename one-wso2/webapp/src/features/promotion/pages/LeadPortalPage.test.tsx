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

const cycle: { isPending: boolean; isError: boolean; cycle: { id: number } | null } = {
  isPending: false,
  isError: false,
  cycle: null,
};

vi.mock("../api/usePromotionCycle", () => ({ useActivePromotionCycle: () => cycle }));

const { default: LeadPortalPage, LeadPortalIndex } = await import("./LeadPortalPage");

function UrlProbe() {
  const { pathname } = useLocation();
  return <div data-testid="url">{pathname}</div>;
}

function Tab({ name }: { name: string }) {
  return <div data-testid="tab-body">{name}</div>;
}

beforeEach(() => {
  cycle.isPending = false;
  cycle.isError = false;
  cycle.cycle = null;
});

function show(initial = "/people-ops/promotion/lead") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <UrlProbe />
      <Routes>
        <Route path="/people-ops/promotion/lead" element={<LeadPortalPage />}>
          <Route index element={<LeadPortalIndex />} />
          <Route path="pending" element={<Tab name="Pending Requests" />} />
          <Route path="history" element={<Tab name="History" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("with an open cycle", () => {
  beforeEach(() => {
    cycle.cycle = { id: 1 };
  });

  it("shows both tabs", () => {
    show();
    expect(screen.getByRole("tab", { name: "Pending Requests" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
  });

  it("lands on Pending Requests", async () => {
    show();
    expect(await screen.findByTestId("url")).toHaveTextContent("/people-ops/promotion/lead/pending");
  });
});

describe("with no open cycle", () => {
  it("shows only the History tab", () => {
    show();
    expect(screen.queryByRole("tab", { name: "Pending Requests" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("lands on History", async () => {
    show();
    expect(await screen.findByTestId("url")).toHaveTextContent("/people-ops/promotion/lead/history");
    expect(await screen.findByTestId("tab-body")).toHaveTextContent("History");
  });

  it("redirects a direct link to Pending Requests to History", async () => {
    show("/people-ops/promotion/lead/pending");
    expect(await screen.findByTestId("url")).toHaveTextContent("/people-ops/promotion/lead/history");
  });
});

describe("when the cycle lookup fails", () => {
  it("keeps both tabs", () => {
    cycle.isError = true;
    show();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});

describe("before the cycle lookup has answered", () => {
  it("renders no tab bar rather than a flash of Pending Requests", () => {
    cycle.isPending = true;
    show();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
