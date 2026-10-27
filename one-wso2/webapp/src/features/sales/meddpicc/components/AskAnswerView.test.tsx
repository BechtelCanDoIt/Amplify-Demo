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

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { AskAnswer } from "../types";
import AskAnswerView from "./AskAnswerView";

const answer: AskAnswer = {
  answer: "Budget is with the CFO [1, 3]. It runs on Kubernetes [2].",
  covered: true,
  nextQuestion: null,
  libraryUnavailable: false,
  sources: [
    { n: 1, group: "OPPORTUNITY", type: "EMAIL", title: "Re: budget", detail: "Email · Fiona (customer)", quote: "The CFO holds the budget.",
      occurredAt: "2026-10-02T09:00:00Z", url: "https://sf/02s1", meetingId: null, offsetSeconds: null },
    { n: 2, group: "LIBRARY", type: "LIBRARY", title: "Deployment guide", detail: "Sales Library · Page 3", quote: "Runs on Kubernetes.",
      occurredAt: null, url: "https://drive/doc", meetingId: null, offsetSeconds: null },
    { n: 3, group: "OPPORTUNITY", type: "FIELD", title: "Economic buyer", detail: "MEDDPICC field", quote: null,
      occurredAt: null, url: null, meetingId: null, offsetSeconds: null },
  ],
};

const renderView = (a: AskAnswer) => render(<MemoryRouter><AskAnswerView answer={a} answerId="a1" /></MemoryRouter>);

describe("AskAnswerView", () => {
  it("turns citations into links to its sources, the opportunity's first", () => {
    renderView(answer);
    expect(screen.getAllByRole("link", { name: /^Source \d$/ }).map((l) => l.getAttribute("href"))).toEqual([
      "#ask-a1-source-1", "#ask-a1-source-3", "#ask-a1-source-2",
    ]);
    const groups = screen.getAllByRole("region");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["From this opportunity", "From the Sales Library"]);
    expect(within(groups[0]).getByRole("link", { name: /Re: budget/ })).toHaveAttribute("href", "https://sf/02s1");
    expect(within(groups[0]).getByText("Economic buyer")).toBeInTheDocument();
    expect(within(groups[1]).getByText("“Runs on Kubernetes.”")).toBeInTheDocument();
    expect(document.getElementById("ask-a1-source-2")).not.toBeNull();
  });

  it("says what to ask next when nothing covered it, and when the Library was skipped", () => {
    renderView({ ...answer, answer: "Not covered.", covered: false, nextQuestion: "Who signs?", sources: [], libraryUnavailable: true });
    expect(screen.getByText("Who signs?")).toBeInTheDocument();
    expect(screen.getByText(/Library unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
