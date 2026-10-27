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

import type { ApprovalRole, ApprovalStep } from "@features/sales/cado2/approvals/api/approvalTypes";

/**
 * The approval graph for drawing, left to right, in
 * two lanes, with Deal Desk outside both at the start:
 *
 *                ┌ Discount approvals ─────────────────────────────┐
 *                │   FE ─► Support ─► RD ─┐                        │
 *   Deal Desk ──►├────────────────────────┤ Area GM ─► CRO ─┐      │
 *                │   Legal ───────────────┘                 └► CFO │
 *                └ Commercial approvals ───────────────────────────┘
 *
 * Every arrow is a real "waits for" link from the engine (step.dependsOn) and
 * runs along the middle of its lane. A role both lanes need is one tall node
 * across both, with an entry and an exit level with each lane's middle. Roles
 * that can run at the same time share a column in both lanes.
 */

/** The lane an arrow runs in (and so its colour). */
export type Lane = "DISCOUNT" | "COMMERCIAL";

/** Handle ids on a role that spans both lanes: one entry and one exit per lane's middle. */
export const handleId = (dir: "in" | "out", lane: Lane) => `${dir}-${lane}`;

/**
 * An edge's live state on a submitted quote:
 * - done: the role before has approved;
 * - active: the role before is deciding now (their turn);
 * - idle: not reached yet, or the workflow stopped;
 * - preview: a draft's preview (no statuses).
 */
export type EdgeState = "done" | "active" | "idle" | "preview";

export interface GraphNode {
  readonly id: ApprovalRole;
  readonly step: ApprovalStep;
  /** Top-left corner and size, from the layout. A shared role is tall. */
  readonly x: number;
  readonly y: number;
  readonly height: number;
  /** For a waiting step: the roles it still waits for (empty when none approved yet). */
  readonly waitingOn: readonly string[];
}

/**
 * One arrow, drawn along the middle of its lane. A "waits for" link between
 * two roles that are both in both lanes is drawn once per lane.
 */
/** The id of the end box, "Approved", outside both lanes. */
export const END_ID = "APPROVED";

/** The id of the start box, "Submitted", before Deal Desk. */
export const START_ID = "SUBMITTED";

export interface GraphEdge {
  readonly id: string;
  /** A role, or START_ID for the arrow out of "Submitted". */
  readonly source: ApprovalRole | typeof START_ID;
  /** A role, or END_ID for the arrows into "Approved". */
  readonly target: ApprovalRole | typeof END_ID;
  readonly lane: Lane;
  /** Set when the end is a role across both lanes: the handle level with this lane. */
  readonly sourceHandle: string | null;
  readonly targetHandle: string | null;
  readonly state: EdgeState;
  /**
   * The exact x where the arrow turns, for arrows that change height: out of
   * Deal Desk (one point in the gap before the lanes, so they share one trunk
   * and split there) and into "Approved" (one point in the gap after the
   * lanes, so they join there). Null = a straight line along its lane.
   */
  readonly bendX: number | null;
}

/** The start box: where every approval begins, level with Deal Desk. */
export interface GraphStart {
  readonly x: number;
  readonly y: number;
  /** When the quote was submitted (Deal Desk's request time); null on a preview. */
  readonly submittedAt: string | null;
}

/** The end box: outside both lanes, at the end, vertically centred. */
export interface GraphEnd {
  readonly x: number;
  readonly y: number;
  /** Every approval is in (a submitted quote); false on a preview. */
  readonly reached: boolean;
}

/** A lane band behind its roles. */
export interface GraphLane {
  readonly id: "DISCOUNT" | "COMMERCIAL";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** No role in this lane (a shared role counts for both). */
  readonly empty: boolean;
}

export interface ApprovalGraphLayout {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly lanes: readonly GraphLane[];
  readonly start: GraphStart;
  readonly end: GraphEnd;
  readonly width: number;
  readonly height: number;
}

export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 72;

const LANES: readonly Lane[] = ["DISCOUNT", "COMMERCIAL"];
const isShared = (s: ApprovalStep) => s.branches.length === 2;

/**
 * The lanes the link u → v runs in: the lanes both share; from Deal Desk
 * (in no lane), the lanes of v that nothing else feeds. E.g. Deal Desk → RD
 * when Legal also feeds RD: only the discount lane.
 */
function lanesOf(u: ApprovalStep, v: ApprovalStep, byRole: Map<string, ApprovalStep>): Lane[] {
  if (u.branches.length) return LANES.filter((l) => u.branches.includes(l) && v.branches.includes(l));
  const fedElsewhere = new Set(
    v.dependsOn.filter((d) => d !== u.role).flatMap((d) => byRole.get(d)?.branches ?? []),
  );
  const free = LANES.filter((l) => v.branches.includes(l) && !fedElsewhere.has(l));
  return free.length ? free : LANES.filter((l) => v.branches.includes(l)).slice(0, 1);
}

function stateOf(u: ApprovalStep, v: ApprovalStep): EdgeState {
  if (u.status === null) return "preview";
  if (u.status === "APPROVED") return "done";
  if (u.status === "PENDING" && v.status === "WAITING") return "active";
  return "idle";
}

/** Geometry. */
const COL_GAP = 56;
/** Space between Deal Desk and the lanes. */
const ROOT_GAP = 64;
/** Room for the lane's label above its roles, and padding around them. */
const LANE_LABEL = 26;
const LANE_PAD = 16;
const LANE_GAP = 14;
/** A lane band's height. */
const LANE_HEIGHT = LANE_LABEL + NODE_HEIGHT + LANE_PAD;

/**
 * Nodes, edges, lanes and a left-to-right layout for the steps.
 *
 * Columns: each role sits in the earliest column it can start in (one after
 * everything it waits for), in both lanes alike, so roles that can run at the
 * same time line up. Each lane is one line, so a column never holds two
 * roles of one lane.
 */
export function buildApprovalGraph(steps: readonly ApprovalStep[]): ApprovalGraphLayout {
  const roles = steps.length > 0 && steps.every((s) => s.branches.length === 0) ? dealDeskOnly(steps) : layoutRoles(steps);
  return withStart(roles, steps);
}

/** Space between "Submitted" and Deal Desk. */
const START_GAP = 48;

/**
 * Puts "Submitted" in front (2026-09-28), level with Deal Desk, and moves
 * everything else right to make room:
 *
 *   ┌───────────┐     ┌───────────┐
 *   │ Submitted │ ──▶ │ Deal Desk │ ──▶ …lanes… ──▶ Approved
 *   └───────────┘     └───────────┘
 */
function withStart(g: Omit<ApprovalGraphLayout, "start">, steps: readonly ApprovalStep[]): ApprovalGraphLayout {
  const shift = NODE_WIDTH + START_GAP;
  const root = g.nodes.find((n) => n.step.branches.length === 0);
  const edges: GraphEdge[] = g.edges.map((e) => ({ ...e, bendX: e.bendX === null ? null : e.bendX + shift }));
  if (root) {
    edges.unshift({
      id: `${START_ID}->${root.id}`,
      source: START_ID,
      target: root.step.role,
      lane: "DISCOUNT",
      sourceHandle: null,
      targetHandle: null,
      state: root.step.status === null ? "preview" : "done",
      bendX: null,
    });
  }
  return {
    nodes: g.nodes.map((n) => ({ ...n, x: n.x + shift })),
    edges,
    lanes: g.lanes.map((l) => ({ ...l, x: l.x + shift })),
    start: { x: 0, y: root?.y ?? 0, submittedAt: root?.step.requestedAt ?? steps[0]?.requestedAt ?? null },
    end: { ...g.end, x: g.end.x + shift },
    width: g.width + shift,
    height: g.height,
  };
}

/** Roles, lanes and "Approved"; "Submitted" is added by withStart. */
function layoutRoles(steps: readonly ApprovalStep[]): Omit<ApprovalGraphLayout, "start"> {
  const byRole = new Map(steps.map((s) => [s.role, s]));

  const edges: GraphEdge[] = [];
  for (const v of steps) {
    for (const d of v.dependsOn) {
      const u = byRole.get(d);
      if (!u) continue;
      for (const lane of lanesOf(u, v, byRole)) {
        edges.push({
          id: `${u.role}->${v.role}:${lane}`,
          source: u.role,
          target: v.role,
          lane,
          sourceHandle: isShared(u) ? handleId("out", lane) : null,
          targetHandle: isShared(v) ? handleId("in", lane) : null,
          state: stateOf(u, v),
          bendX: null,
        });
      }
    }
  }

  // Steps arrive in role order, which is also dependency order. Deal Desk is column 0.
  const column = new Map<string, number>();
  for (const s of steps) {
    column.set(s.role, s.dependsOn.reduce((c, d) => Math.max(c, (column.get(d) ?? -1) + 1), 0));
  }
  const columns = Math.max(1, ...[...column.values()]); // lane columns are 1…columns

  const laneX = NODE_WIDTH + ROOT_GAP;
  const colX = (c: number) => laneX + LANE_PAD + (c - 1) * (NODE_WIDTH + COL_GAP);
  const laneWidth = 2 * LANE_PAD + columns * NODE_WIDTH + (columns - 1) * COL_GAP;
  const discountY = 0;
  const commercialY = LANE_HEIGHT + LANE_GAP;
  const height = 2 * LANE_HEIGHT + LANE_GAP;
  const inLane = (s: ApprovalStep, lane: "DISCOUNT" | "COMMERCIAL") => s.branches.includes(lane);

  const nodes: GraphNode[] = steps.map((s) => {
    const waitingOn =
      s.status === "WAITING"
        ? s.dependsOn.filter((d) => byRole.get(d)?.status !== "APPROVED").map((d) => byRole.get(d)?.roleLabel ?? d)
        : [];
    // Only worth saying when some predecessors are done: then it is the others holding it up.
    const someDone = s.dependsOn.some((d) => byRole.get(d)?.status === "APPROVED");
    const base = { id: s.role, step: s, waitingOn: someDone ? waitingOn : [] };
    if (s.branches.length === 0) {
      // Deal Desk: outside both lanes, at the start, vertically centred.
      return { ...base, x: 0, y: (height - NODE_HEIGHT) / 2, height: NODE_HEIGHT };
    }
    const x = colX(column.get(s.role) ?? 1);
    const top = discountY + LANE_LABEL;
    const bottom = commercialY + LANE_LABEL;
    if (inLane(s, "DISCOUNT") && inLane(s, "COMMERCIAL")) {
      // Asked once, for both lanes: one node across both.
      return { ...base, x, y: top, height: bottom + NODE_HEIGHT - top };
    }
    return { ...base, x, y: inLane(s, "DISCOUNT") ? top : bottom, height: NODE_HEIGHT };
  });

  // Deal Desk's arrows all turn at one point in the gap before the lanes.
  const splitX = NODE_WIDTH + ROOT_GAP / 2;
  // (Only role → role edges exist here; "Submitted" is added later by withStart.)
  const withBends: GraphEdge[] = edges.map((e) => (byRole.get(e.source as ApprovalRole)?.branches.length ? e : { ...e, bendX: splitX }));

  // "Approved": after the lanes, fed by the last role of each lane, joining at one point.
  const endX = laneX + laneWidth + ROOT_GAP;
  const joinX = laneX + laneWidth + ROOT_GAP / 2;
  const reached = steps.length > 0 && steps.every((s) => s.status === "APPROVED");
  const lastIn = (lane: Lane) =>
    steps.filter((s) => s.branches.includes(lane)).sort((a, b) => (column.get(b.role) ?? 0) - (column.get(a.role) ?? 0))[0];
  const endEdges: GraphEdge[] = [];
  for (const lane of LANES) {
    const last = lastIn(lane);
    if (!last) continue;
    endEdges.push({
      id: `${last.role}->${END_ID}:${lane}`,
      source: last.role,
      target: END_ID,
      lane,
      sourceHandle: isShared(last) ? handleId("out", lane) : null,
      targetHandle: null,
      state: last.status === null ? "preview" : last.status === "APPROVED" ? "done" : last.status === "PENDING" ? "active" : "idle",
      bendX: joinX,
    });
  }
  const root = steps.find((s) => s.branches.length === 0);
  if (!endEdges.length && root) {
    // Deal Desk alone: straight on to "Approved".
    endEdges.push({
      id: `${root.role}->${END_ID}`, source: root.role, target: END_ID, lane: "DISCOUNT", sourceHandle: null, targetHandle: null,
      state: root.status === null ? "preview" : root.status === "APPROVED" ? "done" : root.status === "PENDING" ? "active" : "idle",
      bendX: null,
    });
  }

  const lanes: GraphLane[] = (["DISCOUNT", "COMMERCIAL"] as const).map((id) => ({
    id,
    x: laneX,
    y: id === "DISCOUNT" ? discountY : commercialY,
    width: laneWidth,
    height: LANE_HEIGHT,
    empty: !steps.some((s) => inLane(s, id)),
  }));
  return {
    nodes,
    edges: [...withBends, ...endEdges],
    lanes,
    end: { x: endX, y: (height - NODE_HEIGHT) / 2, reached },
    width: endX + NODE_WIDTH,
    height,
  };
}

/**
 * Deal Desk is the only approval: no lanes, just Deal Desk → Approved.
 *
 *   ┌───────────┐      ┌──────────┐
 *   │ Deal Desk │ ───▶ │ Approved │
 *   └───────────┘      └──────────┘
 */
function dealDeskOnly(steps: readonly ApprovalStep[]): Omit<ApprovalGraphLayout, "start"> {
  const root = steps[0];
  const endX = NODE_WIDTH + ROOT_GAP;
  const state: EdgeState =
    root.status === null ? "preview" : root.status === "APPROVED" ? "done" : root.status === "PENDING" ? "active" : "idle";
  return {
    nodes: [{ id: root.role, step: root, waitingOn: [], x: 0, y: 0, height: NODE_HEIGHT }],
    edges: [
      { id: `${root.role}->${END_ID}`, source: root.role, target: END_ID, lane: "DISCOUNT", sourceHandle: null, targetHandle: null, state, bendX: null },
    ],
    lanes: [],
    end: { x: endX, y: 0, reached: root.status === "APPROVED" },
    width: endX + NODE_WIDTH,
    height: NODE_HEIGHT,
  };
}

/**
 * The path out → across to bendX → up/down → on to the target, with rounded
 * corners. Drawn by hand: React Flow's step path ignores a given turning x
 * when the arrow travels further vertically than horizontally.
 */
export function elbowPath(sx: number, sy: number, bx: number, tx: number, ty: number, radius = 8): string {
  if (Math.abs(ty - sy) < 0.5) return `M ${sx},${sy} H ${tx}`;
  const dy = Math.sign(ty - sy);
  const r = Math.max(0, Math.min(radius, Math.abs(ty - sy) / 2, bx - sx, tx - bx));
  return [
    `M ${sx},${sy}`,
    `H ${bx - r}`,
    `Q ${bx},${sy} ${bx},${sy + dy * r}`,
    `V ${ty - dy * r}`,
    `Q ${bx},${ty} ${bx + r},${ty}`,
    `H ${tx}`,
  ].join(" ");
}
