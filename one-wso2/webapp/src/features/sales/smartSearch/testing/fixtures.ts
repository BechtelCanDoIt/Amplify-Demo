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

import type { SmartSearchContent, SmartSearchResponse, SmartSearchSource } from "../api/smartSearchTypes";

// Shaped like a real staging response for the question "wso2con" (text shortened): one deck, one
// test PDF, a two-passage email, a web page and a prospectus, with the Pitstop item behind each.

export const DECK_SOURCE: SmartSearchSource = {
  content:
    "WSO2Con Theme\nThe theme for WSO2Con 2025 is application modernization, continuing with 'platformless' as our anchor.\nTicket includes:\nAccess to all the keynotes and sessions across the 3 days",
  title: "WSO2Con 2025 - Regional Presentation",
  page: 5,
  similarityScore: 0.7729,
  documentId: "389",
  unitLabel: "Slide",
  fileExtension: "pptx",
  source: "drive",
  driveLink: "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/edit?usp=sharing",
  nativeLink: "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/present?slide=id.g2f820b48fab_0_28",
};

export const TEST_PDF_SOURCE: SmartSearchSource = {
  content: "Enhancing WSO2Con with AI\nWe've integrated AI-driven features into the WSO2Con mobile app.",
  title: "TEST",
  page: 9,
  similarityScore: 0.7736,
  documentId: "1128",
  unitLabel: "Page",
  fileExtension: "pdf",
  source: "drive",
  driveLink: "https://drive.google.com/file/d/1yXy8JmH2z7TNmfs1_I30XQTr14cIkU_4/view?usp=drive_link",
  nativeLink: "",
};

export const EMAIL_SOURCE: SmartSearchSource = {
  content: "WSO2Con APAC - Email from AMs inviting to WSO2Con\nSubject: You're Invited! WSO2Con Asia 2025 in Colombo: July 29-31",
  title: "WSO2Con Asia - Customer Email",
  page: 1,
  similarityScore: 0.7619,
  documentId: "781",
  unitLabel: "Section",
  fileExtension: "docx",
  source: "drive",
  driveLink: "https://docs.google.com/document/d/147x1se01uH1-KGMpWkyqeaPrffADshqCSqfbu-hF0bg/edit?usp=sharing",
  nativeLink: "",
};

export const EMAIL_SECOND_SOURCE: SmartSearchSource = {
  ...EMAIL_SOURCE,
  content: "Real-world customer success stories\nExclusive networking opportunities\nLocation: Cinnamon Life Hotel, Colombo",
  similarityScore: 0.7532,
};

export const WEB_SOURCE: SmartSearchSource = {
  content: "WSO2Con North America 2026\n\nBuilding the Agentic Enterprise\n\nGet ready",
  title: "Convince Your Boss - Landing Page",
  page: 1,
  similarityScore: 0.7533,
  documentId: "950",
  unitLabel: "Section",
  fileExtension: "webpage",
  source: "web",
  driveLink: "https://wso2.com/wso2con/2026/north-america/convince-your-boss/",
  nativeLink: "",
};

export const PROSPECTUS_SOURCE: SmartSearchSource = {
  content: "About WSO2Con NA\nWSO2Con is back in San Francisco, USA on February 17 - 19, 2026.",
  title: "WSO2Con NA 2026 - Sponsorship Prospectus",
  page: 2,
  similarityScore: 0.7499,
  documentId: "1003",
  unitLabel: "Page",
  fileExtension: "pdf",
  source: "drive",
  driveLink: "https://drive.google.com/file/d/1yrx_Y8knNLQ-jlhlfXd2RFoMeRH64jYz/view?usp=drive_link",
  nativeLink: "",
};

export const VIDEO_SOURCE: SmartSearchSource = {
  content: "The presenter walks through the questions customers ask most.",
  title: "Webinar: Security Questions",
  page: null,
  similarityScore: 0.74,
  documentId: "2001",
  unitLabel: "Moment",
  fileExtension: "reference",
  source: "drive",
  driveLink: "https://www.youtube.com/watch?v=abc",
  nativeLink: "https://drive.google.com/file/d/vid/view?t=870",
};

const content = (
  contentId: number,
  description: string,
  createdOn: string,
  extra: Partial<SmartSearchContent> = {},
): SmartSearchContent => ({
  contentId,
  description,
  createdOn,
  contentType: "external",
  contentSubtype: null,
  tags: [""],
  ...extra,
});

export const CONTENTS: SmartSearchContent[] = [
  content(1128, "TEST", "2026-10-09 04:05:11.801775", { contentSubtype: "pdf" }),
  content(781, "WSO2Con Asia - Customer Email", "2025-05-07 16:11:27.227667"),
  content(389, "WSO2Con 2025 - Regional Presentation", "2024-10-18 04:17:44.848773", {
    contentType: "slides",
    tags: ["wso2con2025"],
  }),
  content(1003, "WSO2Con NA 2026 - Sponsorship Prospectus", "2025-10-28 06:02:17.325872", {
    contentSubtype: "pdf",
    tags: ["wso2con2026"],
  }),
  content(950, "Convince Your Boss - Landing Page", "2025-09-25 08:12:40.785744", {
    contentSubtype: "generic",
    tags: ["wso2con2026"],
  }),
];

/** What the first call (no answer) returns, in the order the service ranked the passages. */
export const SOURCES_RESPONSE: SmartSearchResponse = {
  answer: null,
  sources: [TEST_PDF_SOURCE, DECK_SOURCE, EMAIL_SOURCE, WEB_SOURCE, EMAIL_SECOND_SOURCE, PROSPECTUS_SOURCE],
  contents: CONTENTS,
};

export const ANSWER_TEXT =
  "WSO2Con is WSO2's conference. The 2025 theme was application modernization, and the North America 2026 event is planned for San Francisco.";

/** The second call: the same sources, with the written answer. */
export const ANSWER_RESPONSE: SmartSearchResponse = { ...SOURCES_RESPONSE, answer: ANSWER_TEXT };

/** The fixed "now" the tests run at, so the "Added ..." labels are repeatable. */
export const TEST_NOW = new Date("2026-10-14T09:00:00Z");
