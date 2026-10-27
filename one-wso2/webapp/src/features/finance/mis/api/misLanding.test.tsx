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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { WalletIcon } from "@wso2/oxygen-ui-icons-react";
import { PERSPECTIVES } from "@constants/perspectives";
import { misPaths } from "@constants/misApps";
import { FINANCE_OVERVIEW_PATH } from "@features/finance/overview/financeOverviewPaths";

// Finance's landing must not advertise MIS to someone who cannot open it.
//
// Finance no longer HAS overview cards. Its landing forwards to the first item
// the reader can open (`forwardsToFirstItem`, PerspectiveLanding), so the one
// thing MIS can still put on the Finance landing is itself, as the place the
// landing sends you. What an overview card used to leak — "there is company ARR
// behind this" — the landing now leaks by opening ARR Build. So this renders the
// REAL landing over the REAL visibility hook and the REAL MIS gate, and mocks
// only the HTTP answers underneath, as misRail.test.tsx does for the rail.
//
// PerspectiveLanding.test.tsx cannot cover this: it stubs the visibility hook
// whole, so no MIS gate is ever asked there.

/** What the MIS ARR backend's own /user-info says this reader holds. */
const misPrivileges = { value: [] as number[] };
/**
 * Overview is the first Finance row. While it is open, it is where the
 * landing goes once the ARR read has settled.
 */
const overviewOpen = { value: false };
type ArrRead = "settled" | "pending" | "failed";
const arrRead = { value: "settled" as ArrRead };

vi.mock("@config/apiConfig", async () => {
  const actual = await vi.importActual<typeof import("@config/apiConfig")>("@config/apiConfig");
  return { ...actual, isMisArrConfigured: () => true };
});

// Mocked at the QUERY hooks, not at useMisGate: the gate is part of what is
// under test, along with the visibility hook's dispatch to it.
vi.mock("@features/finance/mis/api/useMisAppConfigs", () => ({
  useMisAppConfigs: () => ({ analysisEnabled: true }),
}));
vi.mock("@features/finance/mis/api/useMisUserInfo", () => ({
  useMisUserInfo: () => {
    if (arrRead.value === "pending") {
      return { data: undefined, isPending: true, isError: false, error: null, refetch: () => {} };
    }
    if (arrRead.value === "failed") {
      return {
        data: undefined,
        isPending: false,
        isError: true,
        error: new Error("Unable to retrieve employee information"),
        refetch: () => {},
      };
    }
    return {
      data: { privileges: misPrivileges.value },
      isPending: false,
      isError: false,
      error: null,
      refetch: () => {},
    };
  },
}));

const financePerspective = PERSPECTIVES.find((p) => p.key === "finance")!;
vi.mock("@context/perspective/PerspectiveContext", () => ({
  useActivePerspective: () => ({
    key: "finance",
    label: "Finance",
    icon: WalletIcon,
    path: "/finance",
    access: true,
    sections: financePerspective.sections,
  }),
}));

// One WSO2's own /user-info says 987 for EVERY reader below, because it says so
// for every signed-in employee (PRIVILEGE.EMPLOYEE). That is the collision:
// the number that means "may see company ARR" to MIS means
// "is signed in" here. So a landing that read MIS access off this answer instead
// of MIS's own would open ARR Build to the whole company, and this is the
// answer that would make it do so.
vi.mock("@api/useUserInfo", () => ({
  useUserInfo: () => ({ data: { privileges: [987] }, isLoading: false, isError: false }),
}));

// Every other gate answers settled and closed, so the only destination the
// landing could possibly forward to is MIS. That is what keeps the negative
// case from passing for the wrong reason — forwarding to a claim screen would
// also leave MIS unopened — and the positive case below proves the setup is one
// in which MIS WOULD be opened.
const other = { canSee: () => false, isResolving: false, itemAnswered: () => true };
const noFailure = { isError: false, retry: () => {} };
vi.mock("@features/finance/api/useFinanceGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/finance/api/useFinanceGate")>()),
  useFinanceGate: () => ({
    canSee: (id: string) => overviewOpen.value && id === "finance-overview",
    isResolving: false,
    itemAnswered: () => true,
  }),
}));
vi.mock("@features/leave/api/useLeaveGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/leave/api/useLeaveGate")>()),
  useLeaveGate: () => other,
}));
vi.mock("@features/marketing-ops/api/useMarketingOpsGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/marketing-ops/api/useMarketingOpsGate")>()),
  useMarketingOpsGate: () => ({ ...other, ...noFailure, isAuthorized: false, isAdmin: false }),
}));
vi.mock("@features/due-diligence/api/useDueDiligenceGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/due-diligence/api/useDueDiligenceGate")>()),
  useDueDiligenceGate: () => ({ ...other, ...noFailure }),
}));
vi.mock("@features/security/api/useSecurityGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/security/api/useSecurityGate")>()),
  useSecurityGate: () => other,
}));
vi.mock("@features/sales/api/useSalesGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/sales/api/useSalesGate")>()),
  useSalesRailGate: () => ({ ...other, ...noFailure, errorMessage: undefined }),
}));
vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@features/subscriptions/api/useSubscriptionGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/subscriptions/api/useSubscriptionGate")>()),
  useSubscriptionGate: () => ({ ...other, ...noFailure, isAdmin: false }),
}));
vi.mock("@features/par/api/useParData", () => ({
  useParCanSeeLeadPortal: () => ({ canSee: false, isLoading: false }),
  useParEmployeeItemVisible: () => ({ canSee: false, isLoading: false }),
}));
vi.mock("@features/par/api/useParIsAdmin", () => ({
  useParIsAdmin: () => ({ isAdmin: false, isLoading: false }),
}));
vi.mock("@features/promotion/api/usePromotionRoles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/promotion/api/usePromotionRoles")>()),
  usePromotionPrivileges: () => ({
    isLead: false,
    isFunctionalLead: false,
    isHrAdmin: false,
    isPromotionBoardMember: false,
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@features/infra/api/useInfraGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/infra/api/useInfraGate")>()),
  useInfraGate: () => ({ ...other, ...noFailure, isAuthorized: false, isAdmin: false }),
}));
vi.mock("@features/umt/api/useUmtGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/umt/api/useUmtGate")>()),
  useUmtGate: () => ({ ...other, ...noFailure, isAuthorized: false, isAdmin: false }),
}));

// Every gate the hook asks that this file does not stand in for runs for real,
// signed out, inside a real QueryClient: its query is disabled, so it asks
// nothing and offers nothing. Without this, each gate main added to
// usePerspectiveVisibility reached a real useQuery with no client and failed
// the whole file.
vi.mock("@asgardeo/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@asgardeo/react")>()),
  useAsgardeo: () => ({ isSignedIn: false }),
}));

function withQueries() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const { default: PerspectiveLanding } = await import(
  "@components/perspective-landing/PerspectiveLanding"
);
const { usePerspectiveVisibility } = await import("@components/side-rail/usePerspectiveVisibility");

function Address() {
  return <div data-testid="address">{useLocation().pathname}</div>;
}

/** The rail's question for Overview, asked beside the landing. */
function OverviewRow() {
  const { resolveVisible } = usePerspectiveVisibility();
  const shown = resolveVisible({
    id: "finance-overview",
    label: "Overview",
    path: FINANCE_OVERVIEW_PATH,
  });
  return <div data-testid="overview-row">{shown ? "shown" : "hidden"}</div>;
}

/** The Finance landing, reached the way switching to Finance reaches it. */
function openFinance() {
  return render(
    <MemoryRouter initialEntries={["/finance"]}>
      <Address />
      <OverviewRow />
      <Routes>
        <Route path="/finance" element={<PerspectiveLanding />} />
        <Route path="*" element={<div>somewhere else</div>} />
      </Routes>
    </MemoryRouter>,
    { wrapper: withQueries() },
  );
}

const address = () => screen.getByTestId("address").textContent;

beforeEach(() => {
  misPrivileges.value = [];
  overviewOpen.value = false;
  arrRead.value = "settled";
});

describe("the Finance landing", () => {
  // The positive half, without which the case below proves nothing: in this
  // same setup, an ARR reader IS sent into MIS, so a landing that stays put for
  // someone else stays put because of what they hold.
  it("opens ARR Build for someone holding the ARR privilege", () => {
    misPrivileges.value = [987];
    openFinance();
    expect(address()).toBe(misPaths.arrBuild);
  });

  it("offers nothing of MIS to someone holding neither privilege", () => {
    misPrivileges.value = [];
    openFinance();
    expect(address()).toBe("/finance");
    // The empty state, not a failure: nobody has been refused anything, and
    // "couldn't work out what you can open" would send them chasing a grant.
    expect(screen.getByRole("heading", { name: "Nothing here for you yet" })).toBeInTheDocument();
    expect(screen.queryByText(/\bMIS\b|\bARR\b/)).not.toBeInTheDocument();
  });

  // Overview is the first Finance row, so a landing that trusts the first
  // answered leaf would open it while the ARR read is still in flight, and a
  // later failure would never reach this screen's Retry notice. The row stays
  // in the rail the whole time.
  it("waits, with Overview still shown, while the ARR read is in flight", () => {
    overviewOpen.value = true;
    arrRead.value = "pending";
    openFinance();
    expect(address()).toBe("/finance");
    expect(screen.getByText(/Opening Finance/)).toBeInTheDocument();
    expect(screen.getByTestId("overview-row")).toHaveTextContent("shown");
  });

  it("offers Retry, with Overview still shown, when the ARR read fails", () => {
    overviewOpen.value = true;
    arrRead.value = "failed";
    openFinance();
    expect(address()).toBe("/finance");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText(/Couldn't work out what you can open in Finance/)).toBeInTheDocument();
    expect(screen.getByTestId("overview-row")).toHaveTextContent("shown");
  });

  it("opens Overview once the ARR read has settled", () => {
    overviewOpen.value = true;
    openFinance();
    expect(address()).toBe(FINANCE_OVERVIEW_PATH);
    expect(screen.getByTestId("overview-row")).toHaveTextContent("shown");
  });
});
