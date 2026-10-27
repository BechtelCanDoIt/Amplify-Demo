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

/** A starting point on the Library's first screen: a subject and a question that works. */
export interface LibraryTopic {
  id: "security" | "pricing" | "competitors" | "demos" | "onboarding";
  name: string;
  question: string;
}

export const LIBRARY_TOPICS: readonly LibraryTopic[] = [
  { id: "security", name: "Security", question: "How do we answer a security questionnaire?" },
  { id: "pricing", name: "Pricing", question: "What is the latest pricing one-pager?" },
  { id: "competitors", name: "Competitors", question: "Do we have a battlecard for Kong?" },
  { id: "demos", name: "Demos", question: "Which demo video shows API Manager?" },
  { id: "onboarding", name: "Onboarding", question: "Where is the partner onboarding deck?" },
];
