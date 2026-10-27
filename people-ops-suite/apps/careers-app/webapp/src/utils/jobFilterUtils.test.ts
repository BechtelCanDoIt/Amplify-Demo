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

import { Job } from "@/types/types";
import {
  jobPath,
  jobShareLinks,
  jobSlug,
  matchesJobType,
  matchesLocation,
  matchesSearch,
  matchesTeam,
  opensDirectly,
  withoutArrivalMark,
} from "@utils/jobFilterUtils";

const job = (overrides: Partial<Job> = {}): Job => ({
  id: "1",
  title: "Site Reliability Engineer",
  team: "Customer Success",
  country: ["Brazil"],
  jobType: "Full-time",
  publishStatus: "PUBLISHED",
  postedDate: "2026-07-01",
  ...overrides,
});

describe("matchesSearch", () => {
  it("matches everything when the search is empty", () => {
    expect(matchesSearch(job(), "")).toBe(true);
  });

  it("matches the title or the team, ignoring case", () => {
    expect(matchesSearch(job(), "reliability")).toBe(true);
    expect(matchesSearch(job(), "CUSTOMER")).toBe(true);
  });

  it("does not match other text", () => {
    expect(matchesSearch(job(), "marketing")).toBe(false);
  });
});

describe("matchesJobType", () => {
  it("matches everything when no type is chosen", () => {
    expect(matchesJobType(job(), "")).toBe(true);
  });

  it("matches only the chosen type", () => {
    expect(matchesJobType(job({ jobType: "Internship" }), "Internship")).toBe(true);
    expect(matchesJobType(job({ jobType: "Full-time" }), "Internship")).toBe(false);
  });
});

describe("matchesTeam", () => {
  it("matches everything when no team is chosen", () => {
    expect(matchesTeam(job(), [])).toBe(true);
  });

  it("combines several teams with OR", () => {
    expect(matchesTeam(job({ team: "Finance" }), ["Finance", "Sales"])).toBe(true);
    expect(matchesTeam(job({ team: "Marketing" }), ["Finance", "Sales"])).toBe(false);
  });
});

describe("matchesLocation", () => {
  it("matches everything when no location is chosen", () => {
    expect(matchesLocation(job(), [])).toBe(true);
  });

  it("matches a job's country ignoring case", () => {
    expect(matchesLocation(job({ country: ["Sri Lanka"] }), ["sri lanka"])).toBe(true);
  });

  it("matches by substring in either direction", () => {
    expect(matchesLocation(job({ country: ["United States"] }), ["States"])).toBe(true);
    expect(matchesLocation(job({ country: ["US"] }), ["US Remote"])).toBe(true);
  });

  it("matches a job with several countries when any one matches", () => {
    expect(matchesLocation(job({ country: ["Brazil", "Sri Lanka"] }), ["Sri Lanka"])).toBe(true);
  });

  it("does not match other locations", () => {
    expect(matchesLocation(job({ country: ["Brazil"] }), ["Sri Lanka"])).toBe(false);
  });
});

describe("filters together", () => {
  const jobs = [
    job({ id: "1", team: "Engineering", country: ["Sri Lanka"], title: "Backend Engineer" }),
    job({ id: "2", team: "Engineering", country: ["Brazil"], title: "Frontend Engineer" }),
    job({ id: "3", team: "Finance", country: ["Sri Lanka"], title: "Accountant" }),
  ];

  it("gives the count shown next to an option: the jobs that option would produce", () => {
    const inSriLanka = jobs.filter((j) => matchesLocation(j, ["Sri Lanka"]));
    const engineeringInSriLanka = inSriLanka.filter((j) => matchesTeam(j, ["Engineering"]));
    expect(inSriLanka.map((j) => j.id)).toEqual(["1", "3"]);
    expect(engineeringInSriLanka.map((j) => j.id)).toEqual(["1"]);
  });
});

describe("jobSlug and jobPath", () => {
  const accountManager = job({ id: "283", title: "Account Manager", country: ["Sri Lanka"] });

  it("is the title and the country", () => {
    expect(jobSlug(accountManager)).toBe("account-manager-sri-lanka");
    expect(jobPath(accountManager)).toBe("/jobs/283/account-manager-sri-lanka");
  });

  it("turns punctuation and accents into single dashes", () => {
    const intern = job({ id: "5", title: "Intern - Customer Success (Colombo)", country: ["Côte d'Ivoire"] });
    expect(jobSlug(intern)).toBe("intern-customer-success-colombo-cote-d-ivoire");
  });

  it("names every country of the job", () => {
    expect(jobSlug(job({ title: "Engineer", country: ["Sri Lanka", "Brazil"] }))).toBe("engineer-sri-lanka-brazil");
  });

  it("falls back to the plain address when there is nothing to name", () => {
    expect(jobPath(job({ id: "9", title: "", country: [] }))).toBe("/jobs/9");
  });

  it("adds the mark that lets a new tab or a share open the job directly", () => {
    expect(jobPath(accountManager, "list")).toBe("/jobs/283/account-manager-sri-lanka?from=list");
    expect(jobPath(accountManager, "share")).toBe("/jobs/283/account-manager-sri-lanka?from=share");
  });
});

describe("opensDirectly", () => {
  it("is true for an address made for a new tab or a share", () => {
    expect(opensDirectly("?from=list")).toBe(true);
    expect(opensDirectly("?from=share")).toBe(true);
  });

  it("is false for an address typed into the browser", () => {
    expect(opensDirectly("")).toBe(false);
    expect(opensDirectly("?page=2")).toBe(false);
  });
});

describe("withoutArrivalMark", () => {
  it("removes the mark and keeps every other parameter", () => {
    expect(withoutArrivalMark("?from=share&utm_source=linkedin&utm_campaign=jobs")).toBe(
      "?utm_source=linkedin&utm_campaign=jobs",
    );
  });

  it("leaves nothing when the mark is the only parameter", () => {
    expect(withoutArrivalMark("?from=list")).toBe("");
    expect(withoutArrivalMark("")).toBe("");
  });
});

describe("jobShareLinks", () => {
  const accountManager = job({ id: "283", title: "Account Manager", country: ["Sri Lanka"] });
  const address = encodeURIComponent("https://careers.example.com/jobs/283/account-manager-sri-lanka?from=share");
  const links = jobShareLinks(accountManager, "https://careers.example.com");
  const hrefOf = (network: string) => links.find((l) => l.network === network)?.href;

  it("points every link at the readable address of the job on the given site", () => {
    expect(hrefOf("facebook")).toBe(`https://www.facebook.com/share.php?u=${address}`);
    expect(hrefOf("linkedin")).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${address}`);
    expect(hrefOf("x")).toBe(`https://twitter.com/intent/tweet?url=${address}`);
  });

  it("labels each link for the network it shares to", () => {
    expect(links.map((l) => l.label)).toEqual([
      "Share with your friends on Facebook",
      "Share with your friends on X",
      "Share with your friends on LinkedIn",
    ]);
  });
});
