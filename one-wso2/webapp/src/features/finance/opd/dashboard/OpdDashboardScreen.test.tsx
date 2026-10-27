/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// A bare React Query result, with every flag this component actually reads
// set explicitly — so a test states the exact state it means, rather than
// `isLoading: false` quietly standing in for three different shapes.
function queryState(over: {
  isLoading?: boolean;
  isPending?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  data?: unknown;
  error?: unknown;
}) {
  return {
    isLoading: false,
    isPending: false,
    isFetching: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    refetch: vi.fn(),
    ...over,
  };
}

const configured = { value: true };
const userInfoState = { current: queryState({ isSuccess: true, data: { userRoles: [] } }) };
const summaryState = { current: queryState({ isSuccess: true, data: undefined }) };

vi.mock("@config/apiConfig", () => ({
  isOpdBackendConfigured: () => configured.value,
}));
vi.mock("../useOpd", () => ({
  useOpdUserInfo: () => userInfoState.current,
}));
vi.mock("./useOpdDashboard", () => ({
  useOpdDashboardSummary: () => summaryState.current,
}));

const { default: OpdDashboardScreen } = await import("./OpdDashboardScreen");

const FINANCE_ROLE = { userRoles: [555] };

beforeEach(() => {
  configured.value = true;
  userInfoState.current = queryState({ isSuccess: true, data: FINANCE_ROLE });
  summaryState.current = queryState({
    isSuccess: true,
    data: {
      claimsProcessed: 0,
      claimsPending: 0,
      valueProcessed: 0,
      valuePending: 0,
      employeesSubmittedThisYear: 0,
      employeesSubmittedLastYear: 0,
      employeesFullyUtilizedThisYear: 0,
      employeesFullyUtilizedLastYear: 0,
      utilization: [],
    },
  });
});

const refusal = () => screen.queryByText(/limited to the finance team/);
const notConnected = () => screen.queryByText(/isn't connected yet/);

// THE regression. A query that is disabled rather than loading — the shape
// `enabled: false` leaves a query in forever, whatever put it there — sits at
// `isPending: true, isFetching: false, isLoading: false, isSuccess: false,
// isError: false` for good. Gating the refusal on `isSuccess` (and, in an
// earlier attempt, on `isPending`) both read this shape as "might still
// answer" and fell through silently to a blank page. `!isLoading && !isError`
// reads it correctly: settled, no error, no role → say so.
describe("a user-info query that is disabled rather than loading", () => {
  it("shows the refusal, not a blank screen", () => {
    userInfoState.current = queryState({
      isPending: true,
      isFetching: false,
      isLoading: false,
      data: undefined,
    });

    render(<OpdDashboardScreen />);

    expect(refusal()).toBeInTheDocument();
    expect(screen.queryByText(/claims processed/i)).not.toBeInTheDocument();
  });
});

describe("while actually loading", () => {
  it("shows the skeleton, never the refusal or the dashboard", () => {
    userInfoState.current = queryState({ isPending: true, isFetching: true, isLoading: true });

    render(<OpdDashboardScreen />);

    expect(refusal()).not.toBeInTheDocument();
    expect(screen.queryByText(/claims processed/i)).not.toBeInTheDocument();
  });
});

describe("a failed lookup", () => {
  it("offers a retry rather than refusing outright", () => {
    userInfoState.current = queryState({ isError: true, error: new Error("network") });

    render(<OpdDashboardScreen />);

    expect(refusal()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

// The literal scenario the review named: an environment with no OPD backend
// at all. `FinanceShell` gates on the SAME `isOpdBackendConfigured()` this
// screen passes it, so `DashboardBody` — and the blind spot above — never
// mounts; the reader sees the ordinary "not connected" notice instead. Pinned
// with the REAL component tree, not a stand-in, since the whole point is
// that nothing inside DashboardBody runs at all.
describe("no OPD backend configured in this environment", () => {
  it("shows FinanceShell's notice, never the refusal and never a blank screen", () => {
    configured.value = false;

    render(<OpdDashboardScreen />);

    expect(notConnected()).toBeInTheDocument();
    expect(refusal()).not.toBeInTheDocument();
    expect(screen.queryByText(/claims processed/i)).not.toBeInTheDocument();
  });
});

describe("a finance approver with everything loaded", () => {
  it("sees the dashboard, not the refusal", () => {
    render(<OpdDashboardScreen />);

    expect(refusal()).not.toBeInTheDocument();
    expect(screen.getByText(/claims processed/i)).toBeInTheDocument();
  });
});
