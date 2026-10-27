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
import { isLeadMeeting, meetingCustomer, type Meeting } from "./salesTypes";

const base: Meeting = {
  meetingId: 1,
  title: "Intro",
  googleEventId: "e1",
  host: "rep@wso2.com",
  startTime: "2026-10-01 10:00:00",
  endTime: "2026-10-01 10:30:00",
  internalParticipants: "",
  meetingStatus: "ACTIVE",
  isRecurring: false,
};

describe("meetingCustomer / isLeadMeeting", () => {
  it("shows the lead's company for an Inbound call and marks it a lead", () => {
    const meeting = { ...base, leadId: "00Q000000000001AAA", leadCompany: " Acme Ltd " };
    expect(meetingCustomer(meeting)).toBe("Acme Ltd");
    expect(isLeadMeeting(meeting)).toBe(true);
  });

  it("prefers the account, then the deal's customer, and is then not a lead", () => {
    const lead = { leadId: "00Q000000000001AAA", leadCompany: "Acme Ltd" };
    const onAccount = { ...base, ...lead, accountName: "Acme Group" };
    expect(meetingCustomer(onAccount)).toBe("Acme Group");
    expect(isLeadMeeting(onAccount)).toBe(false);

    const onDeal = { ...base, ...lead, opportunityDetails: JSON.stringify({ customerName: "Acme Corp" }) };
    expect(meetingCustomer(onDeal)).toBe("Acme Corp");
    expect(isLeadMeeting(onDeal)).toBe(false);
  });

  it("is blank and not a lead with no link at all", () => {
    expect(meetingCustomer(base)).toBeNull();
    expect(isLeadMeeting(base)).toBe(false);
    expect(isLeadMeeting({ ...base, leadCompany: "Acme Ltd" })).toBe(false);
  });
});
