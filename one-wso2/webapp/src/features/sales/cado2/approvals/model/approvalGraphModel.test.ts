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

import { describe, expect, it } from "vitest";
import type { ApprovalBranch, ApprovalRole, ApprovalStep, StepStatus } from "@features/sales/cado2/approvals/api/approvalTypes";
import { buildApprovalGraph, elbowPath } from "./approvalGraphModel";

const step = (role: ApprovalRole, branches: ApprovalBranch[], dependsOn: ApprovalRole[], status: StepStatus | null = null): ApprovalStep => ({
  stepId: null, role, roleLabel: role, branches, dependsOn, triggers: [], status, requestedAt: null, actedAt: null,
  actedByEmail: null, comment: null, canAct: false, cantActReason: null,
});

// Special terms + Extended Support 3% + API Platform 25% + 9-month term.
const example = (status: Partial<Record<ApprovalRole, StepStatus>> | null = null) => {
  const s = (r: ApprovalRole) => (status ? (status[r] ?? "WAITING") : null);
  return [
    step("DEAL_DESK", [], [], s("DEAL_DESK")),
    step("LEGAL", ["COMMERCIAL"], ["DEAL_DESK"], s("LEGAL")),
    step("FIELD_ENGINEERING", ["DISCOUNT"], ["DEAL_DESK"], s("FIELD_ENGINEERING")),
    step("SUPPORT", ["DISCOUNT"], ["FIELD_ENGINEERING"], s("SUPPORT")),
    step("REGIONAL_DIRECTOR", ["DISCOUNT"], ["SUPPORT"], s("REGIONAL_DIRECTOR")),
    step("AREA_GM", ["DISCOUNT", "COMMERCIAL"], ["LEGAL", "REGIONAL_DIRECTOR"], s("AREA_GM")),
    step("CRO", ["DISCOUNT", "COMMERCIAL"], ["AREA_GM"], s("CRO")),
    step("CFO", ["COMMERCIAL"], ["CRO"], s("CFO")),
  ];
};

const edge = (g: ReturnType<typeof buildApprovalGraph>, id: string) => g.edges.find((e) => e.id === id);

describe("buildApprovalGraph", () => {
  it("draws every waits-for link along the middle of its lane", () => {
    const g = buildApprovalGraph(example());
    const ids = g.edges.map((e) => e.id);
    // Into Area GM (across both lanes): Legal in the commercial lane, RD in the discount lane,
    // each landing level with its own lane.
    expect(edge(g, "LEGAL->AREA_GM:COMMERCIAL")?.targetHandle).toBe("in-COMMERCIAL");
    expect(edge(g, "REGIONAL_DIRECTOR->AREA_GM:DISCOUNT")?.targetHandle).toBe("in-DISCOUNT");
    // Area GM → CRO (both across both lanes): one arrow in each lane.
    expect(ids).toContain("AREA_GM->CRO:DISCOUNT");
    expect(ids).toContain("AREA_GM->CRO:COMMERCIAL");
    expect(edge(g, "AREA_GM->CRO:DISCOUNT")?.sourceHandle).toBe("out-DISCOUNT");
    // CRO → CFO leaves CRO level with the commercial lane.
    expect(edge(g, "CRO->CFO:COMMERCIAL")?.sourceHandle).toBe("out-COMMERCIAL");
    expect(edge(g, "CRO->CFO:COMMERCIAL")?.targetHandle).toBeNull();
    // Ordinary roles have one handle.
    expect(edge(g, "DEAL_DESK->LEGAL:COMMERCIAL")?.sourceHandle).toBeNull();
    expect(g.edges.every((e) => e.state === "preview")).toBe(true);
  });

  it("puts Deal Desk's arrow into a shared role in the lane nothing else feeds (quote Q-26-00004)", () => {
    // 8% discount + renewal downsell need RD; special terms put Legal first in the commercial lane.
    const g = buildApprovalGraph([
      step("DEAL_DESK", [], []),
      step("LEGAL", ["COMMERCIAL"], ["DEAL_DESK"]),
      step("REGIONAL_DIRECTOR", ["DISCOUNT", "COMMERCIAL"], ["DEAL_DESK", "LEGAL"]),
      step("AREA_GM", ["COMMERCIAL"], ["REGIONAL_DIRECTOR"]),
    ]);
    const into = g.edges.filter((e) => e.target === "REGIONAL_DIRECTOR").map((e) => `${e.source}:${e.targetHandle}`);
    expect(into).toEqual(["DEAL_DESK:in-DISCOUNT", "LEGAL:in-COMMERCIAL"]);
    // A shared role fed only by Deal Desk starts both lanes: an arrow in each.
    const both = buildApprovalGraph([step("DEAL_DESK", [], []), step("REGIONAL_DIRECTOR", ["DISCOUNT", "COMMERCIAL"], ["DEAL_DESK"])]);
    expect(both.edges.filter((e) => e.target === "REGIONAL_DIRECTOR").map((e) => e.targetHandle)).toEqual(["in-DISCOUNT", "in-COMMERCIAL"]);
  });

  it("puts Deal Desk outside both lanes, centred, and lines up what runs at the same time", () => {
    const g = buildApprovalGraph(example());
    const at = (r: string) => g.nodes.find((n) => n.id === r)!;
    const [discount, commercial] = g.lanes;
    expect(discount.id).toBe("DISCOUNT");
    expect(commercial.id).toBe("COMMERCIAL");
    // Deal Desk: left of both lanes, halfway down.
    const dd = at("DEAL_DESK");
    expect(dd.x + 176).toBeLessThan(discount.x);
    expect(dd.y + dd.height / 2).toBeCloseTo(g.height / 2);
    // Legal and Field Engineering both start straight after Deal Desk: same column.
    expect(at("LEGAL").x).toBe(at("FIELD_ENGINEERING").x);
    // Each lane's roles sit in its band.
    const inside = (n: { y: number; height: number }, l: { y: number; height: number }) => n.y >= l.y && n.y + n.height <= l.y + l.height;
    expect(inside(at("FIELD_ENGINEERING"), discount)).toBe(true);
    expect(inside(at("LEGAL"), commercial)).toBe(true);
    expect(inside(at("CFO"), commercial)).toBe(true);
    // A role in both lanes is one tall node across them.
    const agm = at("AREA_GM");
    expect(agm.y).toBeLessThan(discount.y + discount.height);
    expect(agm.y + agm.height).toBeGreaterThan(commercial.y);
    // Every role right of what it waits for; no two roles overlap.
    const x = new Map(g.nodes.map((n) => [n.id, n.x]));
    for (const e of g.edges) if (e.target !== "APPROVED" && e.source !== "SUBMITTED") expect(x.get(e.target)!).toBeGreaterThan(x.get(e.source)!);
    expect(new Set(g.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(g.nodes.length);
  });

  it("aligns special terms and a small discount: Legal and RD at the same time", () => {
    const g = buildApprovalGraph([
      step("DEAL_DESK", [], []),
      step("LEGAL", ["COMMERCIAL"], ["DEAL_DESK"]),
      step("REGIONAL_DIRECTOR", ["DISCOUNT"], ["DEAL_DESK"]),
    ]);
    const at = (r: string) => g.nodes.find((n) => n.id === r)!;
    expect(at("LEGAL").x).toBe(at("REGIONAL_DIRECTOR").x);
  });

  it("splits Deal Desk's arrows at one point and joins the lanes into Approved at one point", () => {
    const g = buildApprovalGraph(example());
    const fromDD = g.edges.filter((e) => e.source === "DEAL_DESK");
    expect(fromDD.length).toBe(2);
    expect(new Set(fromDD.map((e) => e.bendX)).size).toBe(1);
    // The split is in the gap between Deal Desk and the lanes.
    const lane = g.lanes[0];
    expect(fromDD[0].bendX!).toBeGreaterThan(176);
    expect(fromDD[0].bendX!).toBeLessThan(lane.x);

    // The last role of each lane feeds "Approved": CRO (discount; it spans both) and CFO (commercial).
    const toEnd = g.edges.filter((e) => e.target === "APPROVED");
    expect(toEnd.map((e) => `${e.source}:${e.lane}`)).toEqual(["CRO:DISCOUNT", "CFO:COMMERCIAL"]);
    expect(toEnd[0].sourceHandle).toBe("out-DISCOUNT"); // CRO spans both lanes
    expect(new Set(toEnd.map((e) => e.bendX)).size).toBe(1);
    expect(toEnd[0].bendX!).toBeGreaterThan(lane.x + lane.width);
    expect(toEnd[0].bendX!).toBeLessThan(g.end.x);
    // "Approved" sits outside both lanes, vertically centred, like Deal Desk.
    expect(g.end.x).toBeGreaterThan(lane.x + lane.width);
    expect(g.end.y + 72 / 2).toBeCloseTo(g.height / 2);
    expect(g.end.reached).toBe(false);
  });

  it("marks Approved reached once every approval is in", () => {
    const all = Object.fromEntries(example().map((s) => [s.role, "APPROVED" as const]));
    expect(buildApprovalGraph(example(all)).end.reached).toBe(true);
    // Deal Desk alone goes straight to Approved.
    const g = buildApprovalGraph([step("DEAL_DESK", [], [])]);
    expect(g.edges.map((e) => e.id)).toEqual(["SUBMITTED->DEAL_DESK", "DEAL_DESK->APPROVED"]);
  });

  it("keeps an empty lane, marked empty", () => {
    const g = buildApprovalGraph([step("DEAL_DESK", [], []), step("REGIONAL_DIRECTOR", ["DISCOUNT"], ["DEAL_DESK"])]);
    expect(g.lanes.map((l) => l.empty)).toEqual([false, true]);
  });

  it("shows which branch holds up a merged role (senior waiting on a junior)", () => {
    const g = buildApprovalGraph(example({ DEAL_DESK: "APPROVED", LEGAL: "APPROVED", FIELD_ENGINEERING: "APPROVED", SUPPORT: "PENDING" }));
    const agm = g.nodes.find((n) => n.id === "AREA_GM")!;
    expect(agm.waitingOn).toEqual(["REGIONAL_DIRECTOR"]);
    expect(edge(g, "LEGAL->AREA_GM:COMMERCIAL")?.state).toBe("done");
    expect(edge(g, "REGIONAL_DIRECTOR->AREA_GM:DISCOUNT")?.state).toBe("idle");
    expect(edge(g, "SUPPORT->REGIONAL_DIRECTOR:DISCOUNT")?.state).toBe("active");
    // Nothing before CRO is done yet, so no "waiting on" note there.
    expect(g.nodes.find((n) => n.id === "CRO")!.waitingOn).toEqual([]);
  });

  it("draws Deal Desk alone without lanes: Submitted → Deal Desk → Approved", () => {
    const g = buildApprovalGraph([{ ...step("DEAL_DESK", [], [], "PENDING"), requestedAt: "2026-09-28T09:00:00Z" }]);
    expect(g.lanes).toEqual([]);
    expect(g.start).toEqual({ x: 0, y: 0, submittedAt: "2026-09-28T09:00:00Z" });
    expect(g.nodes.map((n) => [n.id, n.x, n.y])).toEqual([["DEAL_DESK", 176 + 48, 0]]);
    expect(g.edges.map((e) => [e.id, e.state])).toEqual([
      ["SUBMITTED->DEAL_DESK", "done"],
      ["DEAL_DESK->APPROVED", "active"],
    ]);
    expect(g.end.y).toBe(0);
    expect(g.end.reached).toBe(false);
  });

  it("starts every graph at Submitted, level with Deal Desk, and shifts the rest right", () => {
    const g = buildApprovalGraph(example());
    const dd = g.nodes.find((n) => n.id === "DEAL_DESK")!;
    expect(g.start).toMatchObject({ x: 0, y: dd.y, submittedAt: null });
    expect(dd.x).toBe(176 + 48);
    expect(Math.min(...g.lanes.map((l) => l.x))).toBeGreaterThan(dd.x);
    expect(edge(g, "SUBMITTED->DEAL_DESK")?.state).toBe("preview");
  });

  it("draws a split/join arrow: out, turn at the exact x, vertical to the lane's middle, turn into the lane", () => {
    // From (0,100) turning at x=40, up to y=20, on to x=100.
    expect(elbowPath(0, 100, 40, 100, 20)).toBe("M 0,100 H 32 Q 40,100 40,92 V 28 Q 40,20 48,20 H 100");
    // Down works the same way; a level arrow is a straight line.
    expect(elbowPath(0, 20, 40, 100, 100)).toContain("V 92");
    expect(elbowPath(0, 50, 40, 100, 50)).toBe("M 0,50 H 100");
  });
});
