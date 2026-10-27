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

// Exercises the Company filter dropdown end to end: it renders, isolates the
// tree to the selected company plus the ancestor path to the Chairman,
// combines with the Teams legend filter by AND rather than replacing it, and
// gets cleared by Reset view. "Expand all" already has its own coverage via
// manual/live testing during the port. Also covers the filtered "N reports"
// pill and department stats (both scoped by company/hideInterns rather than
// the raw directory), and the search dropdown's focus/blur/click-away state
// machine.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { EmployeeDirectoryRecord } from "../api/orgChartTypes";

const EMPLOYEES: EmployeeDirectoryRecord[] = [
  {
    employeeId: "1",
    firstName: "Chandra",
    lastName: "One",
    workEmail: "chairman@wso2.com",
    employeeThumbnail: null,
    designation: "Chairman",
    jobBand: null,
    startDate: "2000-01-01",
    managerEmail: "chairman@wso2.com",
    businessUnit: "Executive",
    team: "Executive",
    subTeam: null,
    unit: null,
    employmentType: "Full-Time",
    company: "WSO2 (Pvt) Ltd",
    workLocation: "Colombo",
    employeeStatus: "Active",
  },
  {
    employeeId: "2",
    firstName: "Vasu",
    lastName: "IndiaVP",
    workEmail: "vp-india@wso2.com",
    employeeThumbnail: null,
    designation: "VP",
    jobBand: null,
    startDate: "2005-01-01",
    managerEmail: "chairman@wso2.com",
    businessUnit: "Engineering",
    team: "Engineering",
    subTeam: null,
    unit: null,
    employmentType: "Full-Time",
    company: "WSO2- INDIA",
    workLocation: "Bengaluru",
    employeeStatus: "Active",
  },
  {
    employeeId: "3",
    firstName: "Esha",
    lastName: "IndiaEngineer",
    workEmail: "eng-india@wso2.com",
    employeeThumbnail: null,
    designation: "Engineer",
    jobBand: null,
    startDate: "2020-01-01",
    managerEmail: "vp-india@wso2.com",
    businessUnit: "Engineering",
    team: "Engineering",
    subTeam: null,
    unit: null,
    employmentType: "Full-Time",
    company: "WSO2- INDIA",
    workLocation: "Bengaluru",
    employeeStatus: "Active",
  },
  {
    employeeId: "4",
    firstName: "Hari",
    lastName: "IndiaHR",
    workEmail: "hr-india@wso2.com",
    employeeThumbnail: null,
    designation: "HR Partner",
    jobBand: null,
    startDate: "2021-01-01",
    managerEmail: "vp-india@wso2.com",
    businessUnit: "People Operations",
    team: "People Operations",
    subTeam: null,
    unit: null,
    employmentType: "Full-Time",
    company: "WSO2- INDIA",
    workLocation: "Bengaluru",
    employeeStatus: "Active",
  },
  {
    employeeId: "5",
    firstName: "Priya",
    lastName: "LankaVP",
    workEmail: "vp-lanka@wso2.com",
    employeeThumbnail: null,
    designation: "VP",
    jobBand: null,
    startDate: "2005-01-01",
    managerEmail: "chairman@wso2.com",
    businessUnit: "Sales",
    team: "Sales",
    subTeam: null,
    unit: null,
    employmentType: "Full-Time",
    company: "WSO2 (Pvt) Ltd",
    workLocation: "Colombo",
    employeeStatus: "Active",
  },
  {
    employeeId: "6",
    firstName: "Kavi",
    lastName: "IndiaIntern",
    workEmail: "intern-india@wso2.com",
    employeeThumbnail: null,
    designation: "Intern",
    jobBand: null,
    startDate: "2026-01-01",
    managerEmail: "vp-india@wso2.com",
    businessUnit: "Engineering",
    team: "Engineering",
    subTeam: null,
    unit: null,
    employmentType: "Intern",
    company: "WSO2- INDIA",
    workLocation: "Bengaluru",
    employeeStatus: "Active",
  },
  {
    employeeId: "7",
    firstName: "Deepa",
    lastName: "PeopleOpsIntern",
    workEmail: "peopleops-intern-india@wso2.com",
    employeeThumbnail: null,
    designation: "Intern",
    jobBand: null,
    startDate: "2026-01-01",
    managerEmail: "hr-india@wso2.com",
    businessUnit: "People Operations",
    team: "People Operations",
    subTeam: null,
    unit: null,
    employmentType: "Intern",
    company: "WSO2- INDIA",
    workLocation: "Bengaluru",
    employeeStatus: "Active",
  },
];

vi.mock("../api/useOrgChart", () => ({
  isOrgChartConfigured: () => true,
  useEmployeeDirectory: () => ({
    data: EMPLOYEES,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("../util/exportOrgChartHtml", () => ({
  downloadOrgChartHtml: vi.fn(),
}));

const { default: OrgChartPage } = await import("./OrgChartPage");

// aria-label lands on the Select's outer MuiInputBase wrapper, not on the
// role="combobox" element itself, so it isn't part of that element's
// accessible name — it's the only combobox on this page, so querying by
// role alone is unambiguous.
function openCompanySelect() {
  const combo = screen.getByRole("combobox");
  fireEvent.mouseDown(combo);
  return combo;
}

function pickCompany(name: string) {
  openCompanySelect();
  const listbox = screen.getByRole("listbox");
  fireEvent.click(within(listbox).getByText(name));
}

describe("OrgChartPage company filter", () => {
  it("lists every distinct company, alphabetically, plus Global", () => {
    render(<OrgChartPage />);
    openCompanySelect();
    const listbox = screen.getByRole("listbox");
    const optionTexts = within(listbox)
      .getAllByRole("option")
      .map((el) => el.textContent);
    expect(optionTexts).toEqual(["Global", "WSO2 (Pvt) Ltd", "WSO2- INDIA"]);
  });

  it("isolates the tree to the selected company plus the ancestor path to the Chairman", () => {
    render(<OrgChartPage />);
    pickCompany("WSO2- INDIA");

    expect(screen.getByText(/Chandra/)).toBeInTheDocument();
    expect(screen.getByText(/Vasu/)).toBeInTheDocument();
    // Engineering is collapsed by default (only root starts open) — expand it.
    fireEvent.click(screen.getByText(/Vasu/));
    expect(screen.getByText(/Esha/)).toBeInTheDocument();
    expect(screen.getByText(/Hari/)).toBeInTheDocument();
    expect(screen.queryByText(/Priya/)).not.toBeInTheDocument();
  });

  it("combines with the Teams legend filter by AND, not by replacing it", () => {
    render(<OrgChartPage />);
    pickCompany("WSO2- INDIA");
    fireEvent.click(screen.getByText(/Vasu/)); // expand to see both India reports

    fireEvent.click(screen.getByText("Engineering"));

    expect(screen.getByText(/Esha/)).toBeInTheDocument();
    expect(screen.queryByText(/Hari/)).not.toBeInTheDocument();
  });

  it("Reset view clears the company filter back to Global", () => {
    render(<OrgChartPage />);
    pickCompany("WSO2- INDIA");
    expect(screen.queryByText(/Priya/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset view/i }));

    expect(screen.getByRole("combobox")).toHaveTextContent("Global");
    expect(screen.getByText(/Priya/)).toBeInTheDocument();
  });
});

// Scopes a query to one row by its data-work-email, rather than matching
// Chip/Typography text globally — several rows can legitimately show the
// same "N reports" text (e.g. two different managers both with 1 report),
// so an unscoped getByText would be ambiguous.
function rowFor(workEmail: string): HTMLElement {
  const row = document.querySelector(`[data-work-email="${workEmail}"]`);
  if (!row) throw new Error(`No row rendered for ${workEmail}`);
  return row as HTMLElement;
}

function reportsPillText(workEmail: string): string {
  return within(rowFor(workEmail)).getByText(/reports?$/).textContent ?? "";
}

// Same idea for the top stat tiles and the Teams legend — scopes to the
// tile/row identified by its own caption rather than matching a bare number
// that could coincidentally match something else on the page.
function statTileValue(caption: string): string {
  const tile = screen.getByText(caption).closest("div") as HTMLElement;
  return within(tile).getByText(/^\d+$/).textContent ?? "";
}

function departmentLegendCount(departmentName: string): string {
  const row = screen.getByText(departmentName).closest("div") as HTMLElement;
  return within(row).getByText(/^\d+$/).textContent ?? "";
}

describe("OrgChartPage filtered report counts and stats", () => {
  it("the \"N reports\" pill reflects the company filter, not the manager's raw total", () => {
    render(<OrgChartPage />);
    // Unfiltered: the Chairman has 2 direct reports, Vasu (India) and Priya
    // (WSO2 (Pvt) Ltd).
    expect(reportsPillText("chairman@wso2.com")).toBe("2 reports");

    pickCompany("WSO2- INDIA");

    // Priya drops out (wrong company, and no one under her matches either),
    // so the pill shrinks to match the row actually rendered underneath.
    expect(reportsPillText("chairman@wso2.com")).toBe("1 report");
    expect(screen.queryByText(/Priya/)).not.toBeInTheDocument();
  });

  it("the \"N reports\" pill reflects \"Hide interns\", excluding the intern from the count", () => {
    render(<OrgChartPage />);
    // Unfiltered: Vasu has 3 direct reports (Esha, Hari, and Kavi the intern).
    expect(reportsPillText("vp-india@wso2.com")).toBe("3 reports");

    fireEvent.click(screen.getByRole("switch"));

    expect(reportsPillText("vp-india@wso2.com")).toBe("2 reports");
  });

  it("a manager whose entire visible team is filtered out still shows an expandable 0-report row", () => {
    render(<OrgChartPage />);
    // Hari's only direct report, Deepa, is an intern — expand down to Hari
    // first so the row's chip is actually mounted to assert against.
    fireEvent.click(screen.getByText(/Vasu/));
    expect(reportsPillText("hr-india@wso2.com")).toBe("1 report");
    fireEvent.click(screen.getByText(/Hari/));
    expect(screen.getByText(/Deepa/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));

    // hasReports still keys off the raw (unfiltered) children, so Hari stays
    // expandable with "0 reports" instead of losing the chevron/chip entirely.
    expect(reportsPillText("hr-india@wso2.com")).toBe("0 reports");
    expect(screen.getByText("All direct reports are hidden by filters.")).toBeInTheDocument();
  });

  it("department stats (teams count and per-team headcount) are scoped by the company filter", () => {
    render(<OrgChartPage />);
    // Unfiltered: Executive, Engineering, Sales, People Operations.
    expect(statTileValue("teams")).toBe("4");

    pickCompany("WSO2- INDIA");

    // Only Engineering and People Operations exist within this company.
    expect(statTileValue("teams")).toBe("2");
  });

  it("department stats are scoped by \"Hide interns\" but total headcount is not", () => {
    render(<OrgChartPage />);
    expect(statTileValue("in directory")).toBe("7"); // always the full roster
    expect(departmentLegendCount("Engineering")).toBe("3"); // Vasu + Esha + Kavi

    fireEvent.click(screen.getByRole("switch"));

    // Total headcount is unaffected by "Hide interns" — only the legend is.
    expect(statTileValue("in directory")).toBe("7");
    expect(departmentLegendCount("Engineering")).toBe("2");
  });
});

describe("OrgChartPage search dropdown", () => {
  function search(text: string) {
    const input = screen.getByPlaceholderText(/Find a person by name or email/i);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.focus(input);
    return input;
  }

  it("shows matches while the input is focused and closes when focus leaves the widget entirely", () => {
    render(<OrgChartPage />);
    const input = search("Esha");

    expect(screen.getByText(/IndiaEngineer/)).toBeInTheDocument();

    fireEvent.blur(input, { relatedTarget: document.body });

    expect(screen.queryByText(/IndiaEngineer/)).not.toBeInTheDocument();
  });

  it("keeps the dropdown open when focus moves to a result inside the widget (e.g. via Tab)", () => {
    render(<OrgChartPage />);
    const input = search("Esha");
    const result = screen.getByText(/IndiaEngineer/);

    fireEvent.blur(input, { relatedTarget: result });

    expect(screen.getByText(/IndiaEngineer/)).toBeInTheDocument();
  });

  it("picking a result expands the tree to reveal them and clears the search box", () => {
    render(<OrgChartPage />);
    const input = search("Esha");

    fireEvent.click(screen.getByText(/IndiaEngineer/));

    expect((input as HTMLInputElement).value).toBe("");
    // The dropdown is gone (query cleared) and Esha is now visible in the
    // tree itself instead, with her ancestor (Vasu) auto-expanded to reveal her.
    expect(screen.getByText(/IndiaEngineer/)).toBeInTheDocument();
  });

  it("shows a no-match message instead of a dropdown of results", () => {
    render(<OrgChartPage />);
    search("nobody-matches-this-query");

    expect(screen.getByText(/No one matches/)).toBeInTheDocument();
  });
});
