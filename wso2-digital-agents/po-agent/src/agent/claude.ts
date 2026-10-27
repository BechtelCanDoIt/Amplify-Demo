// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { config } from "../config";
import { ChatUser } from "../types";
import { submitLeave, checkLeaveDates, getPendingLeaves, cancelLeave, getLeaveHistory } from "../tools/leave";
import { getMenu } from "../tools/menu";
import { getScheduledReleases } from "../tools/releases";
import { addVehicle, getVehicles, deleteVehicle } from "../tools/vehicle";
import {
  subscribeLunch, unsubscribeLunch, getLunchSubscription,
  subscribeCommute, unsubscribeCommute, getCommuteSubscription,
} from "../tools/subscription";
import { getMyLocation, isSriLankaLocation } from "../tools/employee";
import { getLetterRequestForm } from "../tools/letter";
import { VehicleStatus, VehicleType } from "../types";
import { getLatestCorpus } from "../db/policy";
import { getLatestTrainingCorpus } from "../db/training";
import { getFreshMenuCache, saveMenuCache } from "../db/menu";
import { readAllIssues, getIssuesByReporter, reportIssue, type Issue } from "../issues/sheets";
import { logAction, logLlmCall, getTokenUsageInWindow } from "../db/audit";
import { getToken } from "../db/tokens";
import { getMessages, saveMessages, deleteStaleConversations } from "../db/conversations";
import { getValidIdToken, generateAuthUrl, extractEmailFromJwt } from "../auth/oauth";

// baseURL is undefined unless ANTHROPIC_BASE_URL is set; the SDK then applies its own default.
const client = new Anthropic({
  apiKey: config.anthropic.apiKey,
  baseURL: config.anthropic.baseUrl,
});

function getSystemPrompt(isSriLanka: boolean): string {
  const today = new Date().toISOString().split("T")[0];
  if (isSriLanka) {
    return `You are Novera, an internal AI agent for WSO2 employees. Your name is Novera — ALWAYS refer to yourself as "Novera" when introducing yourself or describing what you are. Do NOT call yourself "Digital Assistant", "WSO2 Digital Assistant", "WSO2's internal HR bot", or any other prior name, even if earlier turns in this conversation used those names — they have been retired.
You are a general-purpose internal AI agent for WSO2 employees, available through a simple conversation in Google Chat. Do not describe yourself as an HR bot, leave bot, or any narrow single-purpose label — your scope spans multiple People Operations and workplace workflows (see "Available actions" below).

Today's date is ${today}.

Available actions:
- Apply for leave (casual, sick, annual, lieu, maternity, paternity)
- View leave history
- Cancel a leave request
- Check today's menu (breakfast, juice, lunch, dessert, evening snack)
- Register a vehicle (car or motorcycle)
- List your registered vehicles
- Delete a registered vehicle
- Subscribe or unsubscribe to Lunch as a Service (LaaS), and check your current lunch subscription status
- Subscribe or unsubscribe to Commute (PickMe) as a Service, and check your current commute subscription status
- Look up your work location
- Answer PO policy questions (leave entitlements, benefits, code of conduct, etc.) strictly from the provided policy documents — do NOT assume, infer, or refer to any other source. If the answer is not in the documents, say so explicitly.
- Answer WSO2 training and certification questions (programs, exams, badges, escalation contacts) strictly from the training playbook provided in your context. If the playbook is not in your context, say so and point to the escalation contacts.
- Look up scheduled releases, features, or epics from the WSO2 engineering project boards (this week, next week, or last week; optionally filtered by team / function / status; and switch between boards) via the get_scheduled_releases tool. This is the ONLY GitHub / project-board data source you have — do NOT claim you can't access GitHub project data; call the tool.
- Provide the official PO Team letter-request form (employment confirmation, visa letter, salary letters, passport renewal, internship letter, EPF/ETF name mismatch, etc.)
- Report bugs / issues with the assistant (with duplicate detection against the open-issues list) and check the status of issues the user has reported

Guidelines:
1. You can only perform actions for the currently authenticated user. If the user's message mentions another person's email address (e.g. colleague@wso2.com) in the context of any tool (leave, menu, vehicles), reject the request immediately and explain that you can only act on their own behalf — do NOT proceed with the action.
2. Always show a clear summary to the user and ask for confirmation BEFORE calling any action tool.
3. Only call action tools (submit_leave, cancel_leave, add_vehicle, delete_vehicle, report_issue, subscribe_commute, unsubscribe_commute) after the user explicitly confirms (e.g., "yes", "confirm", "submit", "ok"). subscribe_lunch and unsubscribe_lunch are the exception — see guideline 17.
4. If the user provides incomplete information, ask for the missing fields one at a time.
5. For leave types, map friendly names: "casual" → casual, "sick" → sick, "annual" → annual, "lieu" → lieu.
6. For period type: single day → one, multiple days → multiple, half day → half.
7. When collecting leave details, ask if the user has a comment to add. If they do, also ask whether it should be public (visible to the vacation group) or private. If no comment, skip the visibility question.
8. When the user provides leave dates, always call check_leave_dates first. If the check fails (success: false), stop and tell the user you are unable to verify holidays due to a system error and ask them to try again later — do NOT proceed with the leave request. If the check succeeds and holidays are found, inform the user (e.g. "Note: April 14 is a public holiday (Sinhala & Tamil New Year) and won't count as a leave day.") then continue.
9. Be concise and friendly. Use plain text only (no markdown — this is Google Chat).
10. To cancel a leave: call get_pending_leaves to fetch cancellable leaves, show the list to the user with dates and leave type (do NOT show IDs), ask which one to cancel, confirm with the user, then call cancel_leave.
11. When showing leave history, display the leave type, date range, duration, period type, and status. Do NOT show the leave ID.
12. If the user says "cancel" or "no", abandon the current action and confirm it was cancelled.
13. For read-only queries (get_menu, get_vehicles, get_my_location, get_letter_request_form, get_my_reported_issues, get_lunch_subscription, get_commute_subscription), call the tool immediately without asking for confirmation — they are not actions.
14. When adding a vehicle, collect the registration number and vehicle type (car or motorcycle). Map friendly names: "car" → CAR, "motorcycle"/"bike"/"motorbike" → MOTORCYCLE. Show a summary and ask for confirmation before calling add_vehicle. If the backend rejects the registration number, relay the error message to the user so they can correct the format (Sri Lankan plates only).
15. To delete a vehicle: call get_vehicles with vehicleStatus='ACTIVE' (deleted vehicles aren't candidates for further deletion), show the list with registration number and type (do NOT show vehicle IDs, do NOT show status — they are all ACTIVE), ask which one to delete, confirm with the user, then call delete_vehicle.
16. When showing vehicles, default to active ones ONLY — call get_vehicles with vehicleStatus='ACTIVE'. Display the registration number and type; do NOT show the vehicle ID. Only include INACTIVE/deleted vehicles when the user explicitly asks (phrases like "show all", "include deleted", "including inactive", "every vehicle I've ever registered", etc.); in that case call get_vehicles without vehicleStatus to retrieve all rows, and clearly mark each row's status (Active / Deleted) so the user can tell them apart.
17. Lunch as a Service (LaaS) subscription: get_lunch_subscription is read-only, call it immediately when the user asks whether they're subscribed to lunch. subscribe_lunch and unsubscribe_lunch are simple single-step toggles with no fields to collect, so do NOT ask for a separate confirmation — when the user gives a clear, unambiguous instruction ("subscribe me to lunch", "cancel my lunch subscription", etc.), call the tool directly. Only ask a clarifying question first if the request is genuinely ambiguous. The backend only accepts subscribe/unsubscribe requests during a specific window each month — if the tool result has success: false for that reason, the message already names the correct calendar dates for the window; relay it to the user as-is.
18. Commute (PickMe) as a Service subscription: get_commute_subscription is read-only, call it immediately when the user asks about their commute subscription status. To subscribe: (a) ask for their one-way commute distance from office in km, and their contact number if not already provided — it MUST be a Sri Lankan mobile number in the format +947XXXXXXXX (e.g. +94771234567), if the user gives a different format ask them to restate it in that format; do NOT ask the user to choose a plan/tier — the backend resolves the correct plan internally from the distance you give it; (b) show a summary (distance in km + contact number) and ask for confirmation; (c) only then call subscribe_commute with distanceKm and contactNumber. If the tool result includes a matched plan/rate, relay that to the user as confirmation of what they're now subscribed to. To unsubscribe, confirm with the user first, then call unsubscribe_commute (no other input needed). Same as lunch, subscribe/unsubscribe are only accepted during a specific window each month — if the tool result has success: false for that reason, the message already names the correct calendar dates; relay it to the user as-is.
19. When the user asks about PO policies (leave entitlements, benefits, code of conduct, work-from-home, etc.), answer ONLY from the "PO Policy Documents" section in your context. Always cite the source document title (e.g. "Per the WSO2 Leave Policy 2026, ..."). If the answer is not in those documents, say so explicitly — do NOT guess or use general knowledge about typical HR practices. If no policy documents are available in your context, tell the user policy lookup is not currently available and suggest contacting the People Operations team.
20. When the user asks for any letter (employment confirmation, visa letter, salary letter, passport renewal, service letter, internship letter, EPF/ETF name mismatch letter, PFCA account opening letter, etc.) or asks generally how to request a letter from PO / People-Ops, call get_letter_request_form. Present the form URL together with the full list of supported letter types so the user can confirm theirs is covered — do NOT pre-judge or filter which letter they need.
21. When the user reports a bug or problem with this assistant ("the bot didn't work", "it gave wrong output", "report this as a bug", etc.): (a) first check the "Open Issues" section in your context — if there's an existing open issue that substantially matches what the user is describing, tell them "This is already tracked as issue #N (status: <status>)" and do NOT file a duplicate; (b) otherwise, summarise what you'll file in 1–3 sentences, ask the user to confirm, and only then call report_issue. After report_issue succeeds, tell the user the new issue ID (e.g. "Filed as issue #5 — the dev team will see it in their queue.").
22. When the user asks about issues they've reported ("what's the status of my issue?", "is anyone working on the bug I filed?", etc.), answer from the "Your Reported Issues" section in your context — it is refreshed every turn from the live tracker and is the authoritative current status. Do NOT echo or reuse statuses stated in earlier assistant turns; the dev team updates statuses out-of-band, so anything you said about an issue's status earlier in this conversation may now be wrong. If the "Your Reported Issues" section is missing or empty and the user is asking about a specific issue ID, call get_my_reported_issues to fetch live. Format the response as a simple list showing issue ID, short description, status (Initial / In-Progress / Fixed), and any dev_comment if present. Do NOT show other users' issues.
23. For cafeteria menu questions, follow this order: (a) if a "## Today's Cafeteria Menu" section is present in your context, that block is the authoritative menu for today — answer directly from it, do NOT call get_menu, and do NOT reuse menu items from earlier turns of this conversation; (b) if the block is absent (cache empty, stale, or you are the first user of the day to ask), call get_menu once to fetch fresh data. Never reuse menu items from a previous turn's tool_result when the "## Today's Cafeteria Menu" block is missing — the menu changes daily and old tool_results are stale.
24. When the user asks what is releasing / shipping / going out / on the release plan — for this week, next week, or last week, including epics, or filtered by team / function / status, or asking to switch project boards (phrasings: "what's releasing this week?", "any Choreo releases next week?", "what shipped last week?", "what epics are on the API Manager board?", "what's in backlog next week?", "switch to the Ballerina board", etc.) — call get_scheduled_releases and pass the user's question through VERBATIM as the question parameter, in their own words, preserving the timeframe, team / function, status, epic, or board they mention. Do NOT rewrite it into a canonical form or strip it to keywords; the backend is itself a natural-language release assistant and does its own intent parsing. Do NOT ask the user to confirm — this is a read-only lookup, call the tool immediately. Do NOT tell the user "I can't access GitHub / project boards / roadmaps" — this tool IS your GitHub project-board data source. The tool returns structured fields (releases, releasesByStatus, epics, items) plus a "text" field and a "type" field — compose your own concise PLAIN-TEXT reply from these; do NOT relay the "text" field verbatim, it contains markdown formatting unsuitable for Google Chat. If type is "board_selection", the backend needs to know which board: list the board names (from availableBoards if present, otherwise savedBoards) to the user in plain text, wait for their reply, then forward their choice as a new question (e.g. "use the <board> board"). If type is "board_acknowledgment", confirm you're now looking at that board and ask what they'd like to know. If type is "unsupported_query", briefly explain that request isn't something the release-schedule tool covers. If the tool returns success:false, relay the error message and suggest trying again later.
25. When the user asks about WSO2 training or certification (programs, exams, badges, promo codes, instructor-led training, or any specific certification like API Manager Practitioner / Developer / Expert, Identity Server, Micro Integrator, Ballerina Developer, Sales Professional, Solutions Architect Associate, etc.), answer ONLY from the "WSO2 Training & Certification Playbook" section in your context, following its routing logic, hard rules, and tone conventions verbatim. If the playbook says the answer is not there, point to the escalation contacts in the next section rather than guessing details. If no training playbook is present in your context, tell the user training lookup is not currently available and suggest contacting the Training & Certification team.
26. When the user asks what you can do / what you can help with / your capabilities / what you offer (phrasings: "what can you do?", "what should I do today?", "how can you help?", "what are your features?", "show me what you can do", "your capabilities", "tell me about yourself", etc.), reply with EXACTLY the following text — verbatim, no rewording, no reordering, no extra commentary, no markdown. Use the exact section headings, exact bullet wording, blank lines between sections, and the closing line as written:

Here's what I can help you with:

Leave Management
    • Apply for leave (casual, sick, annual, lieu, maternity, paternity)
    • View your leave history
    • Cancel a leave request

Vehicles
    • Register a vehicle (car or motorcycle)
    • List your registered vehicles
    • Delete a registered vehicle

Food Menu
    • Check today's menu (breakfast, juice, lunch, dessert, evening snack)

Subscriptions
    • Subscribe or unsubscribe to Lunch as a Service (LaaS)
    • Subscribe or unsubscribe to Commute (PickMe) as a Service

PO Policies
    • Answer questions about leave entitlements, benefits, code of conduct, work-from-home, and more based on WSO2's official policy documents

Training & Certification
    • Answer questions about WSO2 training programs, certification exams, badges, and escalation contacts based on the training team's playbook

Release Schedule
  • Look up scheduled releases, features, or epics from WSO2 engineering project boards for this week, next week, or last week — optionally filtered by team, function, or status (done, in progress, testing, todo)
    • Switch between different engineering project boards

Letters & Forms
    • Provide the official PO Team letter-request form (employment confirmation, visa letter, salary letter, passport renewal, internship letter, EPF/ETF name mismatch, etc.)

Issue Reporting
    • Report bugs or issues with this assistant
    • Check the status of issues you've reported

Just let me know what you need and I'll be happy to help! 😊`;
  }
  // Non-Sri-Lanka employees: leave-only capabilities.
  return `You are Novera, an internal AI agent for WSO2 employees. Your name is Novera — ALWAYS refer to yourself as "Novera" when introducing yourself or describing what you are. Do NOT call yourself "Digital Assistant", "WSO2 Digital Assistant", "WSO2's internal HR bot", or any other prior name, even if earlier turns in this conversation used those names — they have been retired.
You are a general-purpose internal AI agent for WSO2 employees, available through a simple conversation in Google Chat. Do not describe yourself as an HR bot, leave bot, or any narrow single-purpose label — your scope spans multiple People Operations and workplace workflows (see "Available actions" below).

Today's date is ${today}.

Available actions:
- Apply for leave (casual, sick, annual, lieu, maternity, paternity)
- View leave history
- Cancel a leave request
- Look up your work location
- Answer PO policy questions (leave entitlements, benefits, code of conduct, etc.) strictly from the provided policy documents — do NOT assume, infer, or refer to any other source. If the answer is not in the documents, say so explicitly.
- Answer WSO2 training and certification questions (programs, exams, badges, escalation contacts) strictly from the training playbook provided in your context. If the playbook is not in your context, say so and point to the escalation contacts.
- Look up scheduled engineering releases from the WSO2 engineering project board (this week or next week, optionally filtered by team / function) via the get_scheduled_releases tool. This is the ONLY GitHub / project-board data source you have — do NOT claim you can't access GitHub project data; call the tool.
- Provide the official PO Team letter-request form (employment confirmation, visa letter, salary letters, passport renewal, internship letter, EPF/ETF name mismatch, etc.)
- Report bugs / issues with the assistant (with duplicate detection against the open-issues list) and check the status of issues the user has reported

Note: Menu lookup, vehicle registration, and lunch/commute subscriptions are only available to employees based in Sri Lanka. If the user asks about any of these, politely explain the feature is not available for their work location and suggest they contact the People Operations team if they believe this is an error. Do not attempt to call those tools.

Guidelines:
1. You can only perform actions for the currently authenticated user. If the user's message mentions another person's email address (e.g. colleague@wso2.com), reject the request immediately and explain that you can only act on their own behalf — do NOT proceed with the action.
2. Always show a clear summary to the user and ask for confirmation BEFORE calling any action tool.
3. Only call action tools (submit_leave, cancel_leave, report_issue) after the user explicitly confirms (e.g., "yes", "confirm", "submit", "ok").
4. If the user provides incomplete information, ask for the missing fields one at a time.
5. For leave types, map friendly names: "casual" → casual, "sick" → sick, "annual" → annual, "lieu" → lieu.
6. For period type: single day → one, multiple days → multiple, half day → half.
7. When collecting leave details, ask if the user has a comment to add. If they do, also ask whether it should be public (visible to the vacation group) or private. If no comment, skip the visibility question.
8. When the user provides leave dates, always call check_leave_dates first. If the check fails (success: false), stop and tell the user you are unable to verify holidays due to a system error and ask them to try again later — do NOT proceed with the leave request. If the check succeeds and holidays are found, inform the user then continue.
9. Be concise and friendly. Use plain text only (no markdown — this is Google Chat).
10. To cancel a leave: call get_pending_leaves to fetch cancellable leaves, show the list to the user with dates and leave type (do NOT show IDs), ask which one to cancel, confirm with the user, then call cancel_leave.
11. When showing leave history, display the leave type, date range, duration, period type, and status. Do NOT show the leave ID.
12. If the user says "cancel" or "no", abandon the current action and confirm it was cancelled.
13. get_my_location, get_letter_request_form, and get_my_reported_issues are read-only queries — call them immediately without asking for confirmation.
14. When the user asks about PO policies (leave entitlements, benefits, code of conduct, work-from-home, etc.), answer ONLY from the "PO Policy Documents" section in your context. Always cite the source document title (e.g. "Per the WSO2 Leave Policy 2026, ..."). If the answer is not in those documents, say so explicitly — do NOT guess or use general knowledge about typical HR practices. If no policy documents are available in your context, tell the user policy lookup is not currently available and suggest contacting the People Operations team.
15. When the user asks for any letter (employment confirmation, visa letter, salary letter, passport renewal, service letter, internship letter, EPF/ETF name mismatch letter, PFCA account opening letter, etc.) or asks generally how to request a letter from PO / People-Ops, call get_letter_request_form. Present the form URL together with the full list of supported letter types so the user can confirm theirs is covered — do NOT pre-judge or filter which letter they need.
16. When the user reports a bug or problem with this assistant: (a) first check the "Open Issues" section in your context — if there's an existing open issue that substantially matches what the user is describing, tell them "This is already tracked as issue #N (status: <status>)" and do NOT file a duplicate; (b) otherwise, summarise what you'll file in 1–3 sentences, ask the user to confirm, and only then call report_issue. After report_issue succeeds, tell the user the new issue ID.
17. When the user asks about issues they've reported, answer from the "Your Reported Issues" section in your context — it is refreshed every turn from the live tracker and is the authoritative current status. Do NOT echo or reuse statuses stated in earlier assistant turns; the dev team updates statuses out-of-band, so anything you said about an issue's status earlier in this conversation may now be wrong. If the "Your Reported Issues" section is missing or empty and the user is asking about a specific issue ID, call get_my_reported_issues to fetch live. Format the response as a simple list showing issue ID, short description, status, and any dev_comment if present. Do NOT show other users' issues.
18. When the user asks what is releasing / shipping / going out / on the release plan — for this week, next week, or last week, including epics, or filtered by team / function / status, or asking to switch project boards (phrasings: "what's releasing this week?", "any Choreo releases next week?", "what shipped last week?", "what epics are on the API Manager board?", "what's in backlog next week?", "switch to the Ballerina board", etc.) — call get_scheduled_releases and pass the user's question through VERBATIM as the question parameter, in their own words, preserving the timeframe, team / function, status, epic, or board they mention. Do NOT rewrite it into a canonical form or strip it to keywords; the backend is itself a natural-language release assistant and does its own intent parsing. Do NOT ask the user to confirm — this is a read-only lookup, call the tool immediately. Do NOT tell the user "I can't access GitHub / project boards / roadmaps" — this tool IS your GitHub project-board data source. The tool returns structured fields (releases, releasesByStatus, epics, items) plus a "text" field and a "type" field — compose your own concise PLAIN-TEXT reply from these; do NOT relay the "text" field verbatim, it contains markdown formatting unsuitable for Google Chat. If type is "board_selection", the backend needs to know which board: list the board names (from availableBoards if present, otherwise savedBoards) to the user in plain text, wait for their reply, then forward their choice as a new question (e.g. "use the <board> board"). If type is "board_acknowledgment", confirm you're now looking at that board and ask what they'd like to know. If type is "unsupported_query", briefly explain that request isn't something the release-schedule tool covers. If the tool returns success:false, relay the error message and suggest trying again later.
19. When the user asks about WSO2 training or certification (programs, exams, badges, promo codes, instructor-led training, or any specific certification like API Manager Practitioner / Developer / Expert, Identity Server, Micro Integrator, Ballerina Developer, Sales Professional, Solutions Architect Associate, etc.), answer ONLY from the "WSO2 Training & Certification Playbook" section in your context, following its routing logic, hard rules, and tone conventions verbatim. If the playbook says the answer is not there, point to the escalation contacts in the next section rather than guessing details. If no training playbook is present in your context, tell the user training lookup is not currently available and suggest contacting the Training & Certification team.
20. When the user asks what you can do / what you can help with / your capabilities / what you offer (phrasings: "what can you do?", "what should I do today?", "how can you help?", "what are your features?", "show me what you can do", "your capabilities", "tell me about yourself", etc.), reply with EXACTLY the following text — verbatim, no rewording, no reordering, no extra commentary, no markdown. Use the exact section headings, exact bullet wording, blank lines between sections, and the closing line as written:

Here's what I can help you with:

Leave Management
    • Apply for leave (casual, sick, annual, lieu, maternity, paternity)
    • View your leave history
    • Cancel a leave request

PO Policies
    • Answer questions about leave entitlements, benefits, code of conduct, work-from-home, and more based on WSO2's official policy documents

Training & Certification
    • Answer questions about WSO2 training programs, certification exams, badges, and escalation contacts based on the training team's playbook

Release Schedule
    • Look up scheduled releases, features, or epics from WSO2 engineering project boards for this week, next week, or last week — optionally filtered by team, function, or status (done, in progress, testing, todo)
    • Switch between different engineering project boards

Letters & Forms
    • Provide the official PO Team letter-request form (employment confirmation, visa letter, salary letter, passport renewal, internship letter, EPF/ETF name mismatch, etc.)

Issue Reporting
    • Report bugs or issues with this assistant
    • Check the status of issues you've reported

Just let me know what you need and I'll be happy to help! 😊`;
}

// Tools available to non-Sri-Lanka employees. Menu and vehicle tools are
// excluded because those features apply only to the Sri Lanka office.
// get_my_location stays so users can confirm/check why their tool set is restricted.
const LEAVE_ONLY_TOOL_NAMES: ReadonlySet<string> = new Set([
  "submit_leave",
  "check_leave_dates",
  "get_leave_history",
  "get_pending_leaves",
  "cancel_leave",
  "get_my_location",
  "get_letter_request_form",
  "report_issue",
  "get_my_reported_issues",
  "get_scheduled_releases",
]);

const TOOLS: Anthropic.Tool[] = [
  {
    name: "submit_leave",
    description:
      "Submit a leave request for the employee. Only call this after the user has confirmed the details.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
        leaveType: {
          type: "string",
          enum: ["casual", "sick", "annual", "lieu", "maternity", "paternity"],
        },
        periodType: {
          type: "string",
          enum: ["one", "multiple", "half"],
        },
        isMorningLeave: {
          type: "boolean",
          description: "For HALF_DAY_LEAVE only: true = morning, false = afternoon",
        },
        comment: { type: "string", description: "Optional comment to include with the leave notification email" },
        isPublicComment: { type: "boolean", description: "Whether the comment is visible to the vacation group (true = public, false = private). Defaults to false if not specified." },
      },
      required: ["startDate", "endDate", "leaveType", "periodType"],
    },
  },
  {
    name: "check_leave_dates",
    description: "Check whether any public holidays fall within the requested leave date range. Call this as soon as the user provides dates, before showing a summary or submitting. If the result has success: false, stop the leave flow and inform the user of the error.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_leave_history",
    description: "Fetch the employee's leave history (all statuses: pending, approved, cancelled), most recent first. Optionally filter by date range. Returns up to 20 records.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Optional start date filter in YYYY-MM-DD format" },
        endDate: { type: "string", description: "Optional end date filter in YYYY-MM-DD format" },
      },
      required: [],
    },
  },
  {
    name: "get_pending_leaves",
    description: "Fetch the employee's current pending and approved leaves that are eligible for cancellation. Call this when the user wants to cancel a leave, before showing options or cancelling.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cancel_leave",
    description: "Cancel a leave request by its ID. Only call this after the user has confirmed which leave they want to cancel.",
    input_schema: {
      type: "object" as const,
      properties: {
        leaveId: { type: "number", description: "The numeric ID of the leave to cancel" },
      },
      required: ["leaveId"],
    },
  },
  {
    name: "get_menu",
    description: "Fetch today's cafeteria menu. ALWAYS call this tool fresh on EVERY menu question — never reuse a menu from earlier in this conversation, even if you fetched it minutes ago in the same chat. The menu changes daily, so a result from yesterday's turn is stale by today's turn. Never guess or describe the menu yourself.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_vehicle",
    description: "Register a new vehicle for the employee. Only call after the user has confirmed the registration number and vehicle type.",
    input_schema: {
      type: "object" as const,
      properties: {
        vehicleRegistrationNumber: {
          type: "string",
          description: "Sri Lankan vehicle registration plate (e.g. 'ABC 1234' or '12 3456' — 1-3 letters or 1-3 digits, then a single space, then 4 digits). The backend validates this format and rejects mismatches.",
        },
        vehicleType: {
          type: "string",
          enum: ["CAR", "MOTORCYCLE"],
          description: "Type of vehicle. Must be exactly CAR or MOTORCYCLE.",
        },
      },
      required: ["vehicleRegistrationNumber", "vehicleType"],
    },
  },
  {
    name: "get_vehicles",
    description: "Fetch the employee's registered vehicles. Read-only — call immediately without asking for confirmation when the user wants to see their vehicles. ALWAYS pass vehicleStatus='ACTIVE' for general listing queries; only omit it (to return all rows including INACTIVE/deleted) when the user explicitly asks to see deleted/inactive/all vehicles.",
    input_schema: {
      type: "object" as const,
      properties: {
        vehicleStatus: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE"],
          description: "Filter by vehicle status. Default behaviour is ACTIVE-only — pass 'ACTIVE' for any normal listing query. Omit only when the user explicitly asks to see deleted/inactive/all vehicles. Pass 'INACTIVE' only when the user specifically asks for deleted vehicles only.",
        },
        vehicleType: {
          type: "string",
          enum: ["CAR", "MOTORCYCLE"],
          description: "Optional filter by vehicle type.",
        },
      },
      required: [],
    },
  },
  {
    name: "delete_vehicle",
    description: "Delete a registered vehicle by its ID. Only call after the user has explicitly confirmed which vehicle to delete.",
    input_schema: {
      type: "object" as const,
      properties: {
        vehicleId: { type: "number", description: "The numeric ID of the vehicle to delete (must come from a prior get_vehicles result)." },
      },
      required: ["vehicleId"],
    },
  },
  {
    name: "get_lunch_subscription",
    description: "Fetch the employee's current Lunch as a Service (LaaS) subscription status. Read-only — call immediately without asking for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "subscribe_lunch",
    description: "Subscribe the employee to Lunch as a Service (LaaS). A single-step toggle with no fields to collect — call it directly once the user's instruction is clear, no separate confirmation needed. The backend only accepts this during a monthly opt-in window — if it fails for that reason, the message already names the correct calendar dates; relay it as-is.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "unsubscribe_lunch",
    description: "Unsubscribe the employee from Lunch as a Service (LaaS). A single-step toggle with no fields to collect — call it directly once the user's instruction is clear, no separate confirmation needed. The backend only accepts this during a monthly opt-out window — if it fails for that reason, the message already names the correct calendar dates; relay it as-is.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_commute_subscription",
    description: "Fetch the employee's current Commute (PickMe) as a Service subscription status, including their chosen distance range and monthly rate if subscribed. Read-only — call immediately without asking for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "subscribe_commute",
    description: "Subscribe the employee to Commute (PickMe) as a Service for a given one-way distance from office (in km) and contact number. The backend internally resolves the distance to the matching plan — do not ask the user which plan/tier they want, just their distance in km. Only call after the user has confirmed both the distance and contact number. The backend only accepts this during a monthly opt-in window — if it fails for that reason, the message already names the correct calendar dates; relay it as-is.",
    input_schema: {
      type: "object" as const,
      properties: {
        distanceKm: { type: "number", description: "The employee's one-way commute distance from office, in kilometers." },
        contactNumber: {
          type: "string",
          description: "Sri Lankan mobile number in the format +947XXXXXXXX (e.g. +94771234567). The backend validates this format and rejects mismatches.",
        },
      },
      required: ["distanceKm", "contactNumber"],
    },
  },
  {
    name: "unsubscribe_commute",
    description: "Unsubscribe the employee from Commute (PickMe) as a Service. Only call after the user has explicitly confirmed. The backend only accepts this during a monthly opt-out window — if it fails for that reason, the message already names the correct calendar dates; relay it as-is.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_my_location",
    description: "Fetch the authenticated employee's work location (e.g. office / country). Read-only — call immediately without asking for confirmation when the user asks where they work, what their location is, or similar.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_letter_request_form",
    description: "Fetch the URL and list of supported letter types for requesting official letters from the PO/People-Ops team (employment confirmation, visa letter, salary letter, passport renewal, internship letter, EPF/ETF name mismatch, etc.). Read-only — call immediately without asking for confirmation when the user asks how to request any letter or asks generally about letters from PO.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "report_issue",
    description: "Report a new bug or issue with the assistant. Only call AFTER (1) showing the user a clear description of the issue to be filed and getting their explicit confirmation, AND (2) checking the 'Open Issues' section in your context for duplicates. If a duplicate exists, do NOT call this tool — tell the user the existing issue ID and status instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "A concise (1–3 sentence) description of the issue. Should capture WHAT goes wrong, ideally also WHEN/WHERE. Strip any sensitive data from the user's original message before submitting.",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "get_my_reported_issues",
    description: "Fetch the list of issues the authenticated user has previously reported, with their current status (Initial / In-Progress / Fixed) and any dev-team comments. Read-only — call immediately when the user asks about their reported issues, the status of bugs they filed, or whether the dev team is working on a fix.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_scheduled_releases",
    description: "Query the WSO2 engineering project board(s) for scheduled release / feature items, epics, or item status — this week, next week, or last week, optionally filtered by team / function / status, listing epics, searching within a named epic, or switching between boards. The backend is itself a natural-language release assistant, so pass the user's release question straight through in their own words (see the question parameter) rather than structured filters. Use whenever the user asks about engineering releases, features, epics, or board status. Do NOT use for general product roadmap questions, GitHub issue / PR lookups, or software version numbers. Read-only — call immediately without asking for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        question: {
          type: "string",
          description: "The user's release question, passed through VERBATIM in their own words (e.g. \"what's releasing this week?\", \"any Choreo releases next week?\", \"what shipped last week?\", \"what epics are on the API Manager board?\", \"what's in backlog next week?\", \"switch to the Ballerina board\"). Preserve the timeframe (this / next / last week), team / function, status, epic, or board they mention. Do NOT rewrite it into keywords or a canonical form — the backend understands natural language.",
        },
      },
      required: ["question"],
    },
  },
];

const LEAVE_ONLY_TOOLS: Anthropic.Tool[] = TOOLS.filter(t => LEAVE_ONLY_TOOL_NAMES.has(t.name));

// Mark the last content block of the last message with cache_control so
// Anthropic caches the growing conversation prefix. Next turn's request hits
// the cache for everything up to and including that marker at ~10% of the
// normal input-token rate. cache_control is a request-time hint only — this
// helper produces a non-mutating copy so saveMessages still writes clean
// conversation content to MySQL. Combined with the ephemeral marker on the
// system prompt (line ~502), the request uses 2 of Anthropic's 4 cache
// breakpoints, leaving headroom for future additions.
function withCacheOnLast(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  const cache = { type: "ephemeral" as const };
  let newContent: Anthropic.MessageParam["content"];
  if (typeof last.content === "string") {
    newContent = [{ type: "text", text: last.content, cache_control: cache }];
  } else if (Array.isArray(last.content) && last.content.length > 0) {
    const arr = last.content;
    newContent = arr.map((b, i) =>
      i === arr.length - 1 ? { ...b, cache_control: cache } : b
    ) as Anthropic.MessageParam["content"];
  } else {
    return messages;
  }
  return [
    ...messages.slice(0, -1),
    { ...last, content: newContent } as Anthropic.MessageParam,
  ];
}

export async function processMessage(
  user: ChatUser,
  messageText: string
): Promise<string> {
  const sessionId = randomUUID();
  // Check token validity upfront — if expired and unrefreshable, prompt reconnect
  // immediately rather than mid-conversation when the user tries to submit.
  const tokenRecord = await getToken(user.googleUserId);
  // Fast-fail UX: check token validity upfront before loading history.
  // executeTool re-fetches independently on every tool call — this is not passed down.
  const wso2Email = tokenRecord?.wso2Email;
  let validIdToken: string | null = null;

  if (tokenRecord) {
    validIdToken = await getValidIdToken(user.googleUserId);
    if (!validIdToken) {
      const authUrl = await generateAuthUrl(user.googleUserId, {
        originalMessage: messageText,
        spaceName: user.spaceName,
        threadName: user.threadName,
        displayName: user.displayName,
        userEmail: user.email,
      });
      return `Your WSO2 session has expired. Please reconnect your account to continue:
${authUrl}

Once reconnected, I'll automatically continue with your request.`;
    }
  }

  // Per-user token quota gate. Authenticated users only — unauthenticated
  // turns return the auth URL above without ever calling Anthropic, so they
  // can't burn tokens. Once-per-turn check; rounds inside the agentic loop
  // share the same quota window, so a 10-round burst counts as one event
  // for purposes of this gate. Audit-logged so per-user blocks are visible
  // in standard audit queries.
  if (wso2Email) {
    const used = await getTokenUsageInWindow(user.googleUserId, 24);
    if (used >= config.userTokenQuotaPerDay) {
      console.warn(
        `[quota] user ${wso2Email} (${user.googleUserId}) exceeded quota: used ${used} of ${config.userTokenQuotaPerDay} tokens in last 24h`,
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "llm_quota",
        responseStatus: "BLOCKED",
        responseMessage: `Exceeded ${config.userTokenQuotaPerDay} token quota in last 24h (used: ${used})`,
      }).catch((err) => console.error("[quota] failed to write audit log:", err));
      return "You've reached your daily token quota with Novera. Please try again in a few hours, or contact the dev team if you need a higher limit.";
    }
  }

  // Resolve work-location-based feature gating. Sri Lanka employees get the full
  // tool set + prompt; everyone else gets the leave-only subset. Conservative
  // default — if the lookup fails for any reason, the user gets leave-only access.
  let isSriLanka = false;
  if (tokenRecord && validIdToken) {
    const locResult = await getMyLocation(user.googleUserId, validIdToken);
    if (locResult.success && isSriLankaLocation(locResult.location)) {
      isSriLanka = true;
    }
  }
  const activeTools = isSriLanka ? TOOLS : LEAVE_ONLY_TOOLS;
  const systemPrompt = getSystemPrompt(isSriLanka);

  // Pull the latest PO policy corpus. Fetched per-turn from the DB (single SELECT, cheap),
  // but the tokens are cached at the Anthropic side via cache_control below so we pay
  // the policy-corpus token cost only once per ~5min cache window.
  const corpus = await getLatestCorpus();
  const policyBlock = corpus
    ? `## PO Policy Documents\n\nThe following are the current PO policy documents. When the user asks about PO policies, answer ONLY from these documents and cite the document title.\n\n${corpus.content}`
    : `## PO Policy Documents\n\n(No PO policy documents are currently available. If the user asks about PO policies, tell them policy lookup is not currently available and suggest contacting the People Operations team. Do NOT make up answers.)`;

  // Pull the issue tracker once per turn and partition into two corpora:
  //   - openIssues  → used for duplicate detection on new reports
  //   - userIssues  → this user's own filings WITH CURRENT STATUS, so the model
  //                   has fresh data in front of it for "what's the status of my
  //                   issue?" queries instead of echoing a stale answer from
  //                   conversation history (dev team updates statuses in the
  //                   sheet out-of-band; old assistant turns rot fast).
  // One Sheets API call covers both. Fail open if the sheet is unreachable —
  // log it and proceed with empty lists rather than breaking the turn over a
  // tracker outage.
  let openIssues: Issue[] = [];
  let userIssues: Issue[] = [];
  try {
    const all = await readAllIssues();
    openIssues = all.filter((i) => i.status !== "Fixed");
    if (wso2Email) {
      const lc = wso2Email.trim().toLowerCase();
      userIssues = all
        .filter((i) => i.reporterEmail.trim().toLowerCase() === lc)
        .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
    }
  } catch (err: any) {
    console.error("[issues] readAllIssues failed:", err?.response?.data ?? err?.message ?? err);
  }
  const issuesBlock = openIssues.length === 0
    ? `## Open Issues\n\n(No open issues are currently tracked.)`
    : `## Open Issues\n\nThe following bugs / issues have been reported by other users and are not yet resolved. When a user reports a new issue, check this list FIRST and if their report substantially matches one of these, refer them to the existing issue ID instead of filing a duplicate.\n\n${openIssues.map((i) => `- Issue #${i.issueId} (${i.status}) — reported ${i.reportedAt} by ${i.reporterEmail}: ${i.description}${i.devComment ? `\n  Dev note: ${i.devComment}` : ""}`).join("\n")}`;
  const userIssuesBlock = userIssues.length === 0
    ? `## Your Reported Issues\n\n(The authenticated user has not reported any issues yet.)`
    : `## Your Reported Issues\n\nThe authenticated user's own issue filings, with CURRENT status as of this turn. This is the authoritative status — it overrides anything stated about these issues in earlier assistant turns, because the dev team updates statuses in the tracker out-of-band. When the user asks about the status of an issue they filed, answer from this list.\n\n${userIssues.map((i) => `- Issue #${i.issueId} (${i.status}) — reported ${i.reportedAt}: ${i.description}${i.devComment ? `\n  Dev note: ${i.devComment}` : ""}`).join("\n")}`;

  // Pull the WSO2 Training & Certification playbook (v1.1.0). Owned by the
  // Training & Certification team; synced from a Drive folder they edit.
  // Same DB fetch pattern as the PO policy corpus. If the sync is disabled
  // or the row is missing, fall through to a short "not available" note
  // and route users to the escalation contacts.
  const training = await getLatestTrainingCorpus();
  const trainingBlock = training
    ? `## WSO2 Training & Certification Playbook\n\nThe section below is the authoritative playbook for handling WSO2 training and certification questions from WSO2 employees. When the user asks about WSO2 training, WSO2 certification, promo codes, instructor-led training, or any specific WSO2 certification (e.g., API Manager Practitioner / Developer / Expert, Identity Server, Micro Integrator, Ballerina Developer, Sales Professional, Solutions Architect Associate, etc.), follow the routing logic, hard rules, and tone conventions in this playbook verbatim — they supersede any general reply style for those questions. This chat is only ever used by internal WSO2 employees; treat every training/certification query as an employee asking (possibly on behalf of a partner, customer, or third party), never as an external requester themselves.\n\n${training.content}`
    : `## WSO2 Training & Certification Playbook\n\n(The training playbook is not currently available in Novera's context. If the user asks about WSO2 training or certification, point them to the escalation contacts in the next section rather than guessing details.)`;

  // Escalation contacts — env-var-driven so ops can rotate the owners
  // without waiting for the training team to edit the Drive doc. The model
  // is instructed to prefer these over any older addresses in the playbook.
  const escalationBlock =
    `## Training & Certification Escalation Contacts (current)\n\n`
    + `When the training playbook tells you to point the user to a training or certification email address, use these current addresses. They are the source of truth and take precedence over any older addresses that may appear in the playbook body:\n\n`
    + `- Training team (LMS, course access, general training issues): ${config.training.contacts.trainingTeam}\n`
    + `- Certification team (exam issues, promo codes, certification questions): ${config.training.contacts.certificationTeam}\n`
    + `- More specific escalation / when the above two don't cover it: ${config.training.contacts.teamLeads}\n\n`
    + `Always show the full email address as visible text (e.g., "email ${config.training.contacts.trainingTeam}"), never hidden inside a markdown link. Do not invent additional contacts.`;

  // Cafeteria menu cache — opportunistic. When fresh (populated within TTL by
  // an earlier get_menu call and dated today in Colombo), inject as a system
  // prompt block so the model answers menu Qs without a tool round-trip.
  // When stale or absent (or the user isn't in SL), leave the block empty
  // and the model falls back to get_menu on the FIRST menu question of the
  // turn — that tool call's success path writes the cache for the next asker.
  let menuBlock = "";
  if (isSriLanka) {
    const cachedMenu = await getFreshMenuCache();
    if (cachedMenu) {
      const line = (label: string, item?: { title?: string; description?: string }) =>
        item?.title
          ? `- ${label}: ${item.title}${item.description ? ` — ${item.description}` : ""}`
          : `- ${label}: not listed`;
      menuBlock =
        `## Today's Cafeteria Menu\n\n`
        + `Date: ${cachedMenu.date}\n`
        + `${line("Breakfast", cachedMenu.breakfast)}\n`
        + `${line("Juice", cachedMenu.juice)}\n`
        + `${line("Lunch", cachedMenu.lunch)}\n`
        + `${line("Dessert", cachedMenu.dessert)}\n`
        + `${line("Evening snack", cachedMenu.snack)}\n\n`
        + `This block is the authoritative menu for today. When the user asks about today's menu, answer directly from this block — do NOT call get_menu, and do NOT reuse menu items from earlier turns of this conversation. Only call get_menu if this block is missing or the user is asking about a different day.`;
    }
  }

  const messages = await getMessages(user.googleUserId);

  // Add the user's message to history
  messages.push({ role: "user", content: messageText });

  const MAX_TOOL_ROUNDS = 10;
  let toolRounds = 0;

  // Agentic loop — keep going until Claude returns a final text response
  try {
    while (true) {
      if (toolRounds >= MAX_TOOL_ROUNDS) {
        await saveMessages(user.googleUserId, messages);
        return "Sorry, I wasn't able to complete your request. Please try again.";
      }
      const callStart = Date.now();
      const response = await client.messages.create({
        model: config.anthropic.model,
        max_tokens: 1024,
        // Multi-block system enables prompt caching. The policy corpus + rules are large
        // and stable across requests in a window; mark with cache_control so Anthropic
        // caches them (ephemeral ~5min) and we only pay corpus tokens once per cache hit.
        // withCacheOnLast() below marks the last message with cache_control too, so
        // the conversation history is cached alongside the system prompt on each turn.
        system: [
          { type: "text", text: policyBlock },
          { type: "text", text: issuesBlock },
          { type: "text", text: userIssuesBlock },
          { type: "text", text: trainingBlock },
          { type: "text", text: escalationBlock },
          // menuBlock is only present when the cache is fresh and the user is
          // in Sri Lanka. Anthropic rejects empty text blocks in the system
          // array ("system: text content blocks must be non-empty"), so omit
          // the slot entirely when the block is empty.
          ...(menuBlock ? [{ type: "text" as const, text: menuBlock }] : []),
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        tools: activeTools,
        messages: withCacheOnLast(messages),
      });
      logLlmCall({
        sessionId,
        googleUserId: user.googleUserId,
        wso2Email,
        round: toolRounds + 1, // toolRounds is 0-based before increment; DB is 1-indexed
        stopReason: response.stop_reason ?? undefined,
        toolsCalled: response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => b.name),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        durationMs: Date.now() - callStart,
      }).catch((err) => console.error("[logLlmCall] failed to write audit log:", err));

      // Add assistant response to history
      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") {
        await saveMessages(user.googleUserId, messages);
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock && textBlock.type === "text" ? textBlock.text : "Done.";
      }

      if (response.stop_reason === "tool_use") {
        toolRounds++;
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          const result = await executeTool(user, block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        // Feed tool results back into the conversation
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Unexpected stop reason
      await saveMessages(user.googleUserId, messages);
      return "Sorry, something went wrong. Please try again.";
    }
  } catch (err) {
    await saveMessages(user.googleUserId, messages).catch(() => { });

    // Anthropic API errors — recognise a couple of specific classes and turn
    // them into user-facing messages that (a) are honest about what happened,
    // (b) tell the user whether it's worth retrying, and (c) don't leak
    // internal billing details or misleading technical terms like "token
    // limit" (which has an unrelated meaning).
    if (err instanceof Anthropic.APIError) {
      const apiErrMsg = (err as { error?: { message?: string } }).error?.message ?? err.message ?? "";
      const apiErrType = (err as { error?: { type?: string } }).error?.type;
      console.error("[anthropic] API error —",
        "status:", err.status,
        "| type:", apiErrType,
        "| message:", apiErrMsg);

      // Credit balance too low — the account has run out of paid credit.
      // Detected by HTTP 400 + a "credit balance" phrase in Anthropic's
      // message. This is not a rate-limit and not user-fixable.
      if (err.status === 400 && /credit balance/i.test(apiErrMsg)) {
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email: wso2Email ?? "unknown",
          action: "llm_credit_exhausted",
          responseStatus: "FAILED",
          responseMessage: "Anthropic credit balance too low",
        }).catch((e) => console.error("[anthropic] audit log failed:", e));
        return "Novera is temporarily unable to process new requests — the AI service has hit its usage limit.";
      }

      // Rate limit (429) or server overload (529) — transient, retry likely
      // to succeed within a short window.
      if (err.status === 429 || err.status === 529) {
        return "Novera's AI service is busy right now. Please try again in a moment.";
      }
    }

    throw err;
  }
}

async function executeTool(
  user: ChatUser,
  toolName: string,
  input: Record<string, unknown>
): Promise<object> {
  // Ensure the user has authenticated via Asgardeo so we know their WSO2 email
  const tokenRecord = await getToken(user.googleUserId);
  if (!tokenRecord) {
    return { success: false, message: "Not authenticated. Please connect your account first." };
  }

  const { wso2Email } = tokenRecord;
  // Use id_token as Bearer — it's a JWT with email + groups claims.
  // Choreo injects these as x-jwt-assertion to the Ballerina backend.
  const idToken = await getValidIdToken(user.googleUserId);
  if (!idToken) {
    const authUrl = await generateAuthUrl(user.googleUserId, {
      spaceName: user.spaceName,
      threadName: user.threadName,
      displayName: user.displayName,
      userEmail: user.email,
    });
    return { success: false, message: `Your session has expired. Please reconnect your WSO2 account: ${authUrl}` };
  }

  // Guard against token/identity mismatch — the JWT email must match the stored WSO2 email.
  // Rejects if tokens were swapped, refreshed into a different identity, or if someone
  // attempts to act on behalf of another user.
  const jwtEmail = extractEmailFromJwt(idToken);
  if (!jwtEmail || jwtEmail.toLowerCase() !== wso2Email.toLowerCase()) {
    console.error(
      "[security] JWT email mismatch for", user.googleUserId,
      "— token email:", jwtEmail, "| stored email:", wso2Email
    );
    return { success: false, message: "Identity validation failed. Please reconnect your WSO2 account." };
  }

  switch (toolName) {
    case "submit_leave": {
      const result = await submitLeave(user.googleUserId, idToken, input as any);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "submit_leave",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "check_leave_dates": {
      const result = await checkLeaveDates(user.googleUserId, idToken, input.startDate as string, input.endDate as string);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "check_leave_dates",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_leave_history": {
      const result = await getLeaveHistory(
        user.googleUserId, idToken, wso2Email,
        input.startDate as string | undefined, input.endDate as string | undefined
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_leave_history",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_pending_leaves": {
      const result = await getPendingLeaves(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_pending_leaves",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "cancel_leave": {
      // Verify the leave belongs to the authenticated user before issuing the DELETE.
      // getPendingLeaves is already scoped to wso2Email, so any ID not in the list
      // either belongs to another user or is not cancellable.
      const owned = await getPendingLeaves(user.googleUserId, idToken, wso2Email);
      if (!owned.success) {
        await logAction({ googleUserId: user.googleUserId, wso2Email, action: "cancel_leave", responseStatus: "FAILED", responseMessage: "Unable to verify leave ownership. Please try again." });
        return { success: false, message: "Unable to verify leave ownership. Please try again." };
      }
      const isOwned = (owned.leaves ?? []).some((l: any) => l.id === input.leaveId);
      if (!isOwned) {
        console.warn(
          "[security] cancel_leave blocked — leaveId", input.leaveId,
          "not in cancellable leaves for", wso2Email
        );
        await logAction({ googleUserId: user.googleUserId, wso2Email, action: "cancel_leave", responseStatus: "BLOCKED", responseMessage: "You can only cancel your own leave requests." });
        return { success: false, message: "You can only cancel your own leave requests." };
      }
      const result = await cancelLeave(user.googleUserId, idToken, input.leaveId as number);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "cancel_leave",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_menu": {
      const result = await getMenu(user.googleUserId, idToken);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_menu",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      // Populate the opportunistic menu cache on success so subsequent turns
      // for any user can answer menu Qs from the injected system prompt block
      // without a tool round-trip. Fire-and-forget — cache-write failures
      // shouldn't cascade into the tool result the model sees.
      if (result.success && result.data) {
        saveMenuCache(result.data).catch((err) =>
          console.error("[menu-cache] saveMenuCache failed:", err)
        );
      }
      return result;
    }

    case "add_vehicle": {
      const result = await addVehicle(
        user.googleUserId, idToken, wso2Email,
        input.vehicleRegistrationNumber as string,
        input.vehicleType as VehicleType
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "add_vehicle",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_vehicles": {
      const result = await getVehicles(
        user.googleUserId, idToken, wso2Email,
        input.vehicleStatus as VehicleStatus | undefined,
        input.vehicleType as VehicleType | undefined
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_vehicles",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_lunch_subscription": {
      const result = await getLunchSubscription(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_lunch_subscription",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "subscribe_lunch": {
      const result = await subscribeLunch(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "subscribe_lunch",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "unsubscribe_lunch": {
      const result = await unsubscribeLunch(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "unsubscribe_lunch",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_commute_subscription": {
      const result = await getCommuteSubscription(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_commute_subscription",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "subscribe_commute": {
      const result = await subscribeCommute(
        user.googleUserId, idToken, wso2Email,
        input.distanceKm as number,
        input.contactNumber as string
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "subscribe_commute",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "unsubscribe_commute": {
      const result = await unsubscribeCommute(user.googleUserId, idToken, wso2Email);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "unsubscribe_commute",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_my_location": {
      const result = await getMyLocation(user.googleUserId, idToken);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_my_location",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_letter_request_form": {
      const result = await getLetterRequestForm();
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_letter_request_form",
        responseStatus: "SUCCESS",
      });
      return result;
    }

    case "report_issue": {
      const description = String((input.description ?? "") as string).trim();
      if (!description) {
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email,
          action: "report_issue",
          responseStatus: "FAILED",
          responseMessage: "Empty description",
        });
        return { success: false, message: "Issue description cannot be empty." };
      }
      try {
        const { issueId } = await reportIssue({ email: wso2Email, description });
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email,
          action: "report_issue",
          responseStatus: "SUCCESS",
          responseMessage: `issue_id=${issueId}`,
        });
        return { success: true, issueId, message: `Reported as issue #${issueId}.` };
      } catch (err: any) {
        console.error("[issues] reportIssue failed:", err?.response?.data ?? err?.message ?? err);
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email,
          action: "report_issue",
          responseStatus: "FAILED",
          responseMessage: err?.message?.slice(0, 480),
        });
        return { success: false, message: "Sorry, I couldn't save the issue right now. Please try again in a few minutes." };
      }
    }

    case "get_my_reported_issues": {
      try {
        const issues = await getIssuesByReporter(wso2Email);
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email,
          action: "get_my_reported_issues",
          responseStatus: "SUCCESS",
          responseMessage: `count=${issues.length}`,
        });
        return {
          success: true,
          issues: issues.map((i) => ({
            issueId: i.issueId,
            reportedAt: i.reportedAt,
            description: i.description,
            status: i.status,
            devComment: i.devComment,
            updatedAt: i.updatedAt,
          })),
        };
      } catch (err: any) {
        console.error("[issues] getIssuesByReporter failed:", err?.response?.data ?? err?.message ?? err);
        await logAction({
          googleUserId: user.googleUserId,
          wso2Email,
          action: "get_my_reported_issues",
          responseStatus: "FAILED",
          responseMessage: err?.message?.slice(0, 480),
        });
        return { success: false, message: "Sorry, I couldn't fetch your reported issues right now. Please try again in a few minutes." };
      }
    }

    case "delete_vehicle": {
      // Verify the vehicle belongs to the authenticated user before issuing the DELETE.
      // getVehicles is scoped to wso2Email by the backend; any ID not in the returned
      // list either belongs to another user or doesn't exist. Mirrors the cancel_leave guard.
      const owned = await getVehicles(user.googleUserId, idToken, wso2Email);
      if (!owned.success) {
        await logAction({ googleUserId: user.googleUserId, wso2Email, action: "delete_vehicle", responseStatus: "FAILED", responseMessage: "Unable to verify vehicle ownership. Please try again." });
        return { success: false, message: "Unable to verify vehicle ownership. Please try again." };
      }
      const isOwned = (owned.vehicles ?? []).some((v: any) => v.vehicleId === input.vehicleId);
      if (!isOwned) {
        console.warn(
          "[security] delete_vehicle blocked — vehicleId", input.vehicleId,
          "not in vehicles for", wso2Email
        );
        await logAction({ googleUserId: user.googleUserId, wso2Email, action: "delete_vehicle", responseStatus: "BLOCKED", responseMessage: "You can only delete your own vehicles." });
        return { success: false, message: "You can only delete your own vehicles." };
      }
      const result = await deleteVehicle(user.googleUserId, idToken, wso2Email, input.vehicleId as number);
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "delete_vehicle",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    case "get_scheduled_releases": {
      const question = typeof input.question === "string" ? input.question : "";
      const result = await getScheduledReleases(
        user.googleUserId, idToken, question,
      );
      await logAction({
        googleUserId: user.googleUserId,
        wso2Email,
        action: "get_scheduled_releases",
        responseStatus: result.success ? "SUCCESS" : "FAILED",
        responseMessage: result.success ? undefined : result.message,
      });
      return result;
    }

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// Periodically clean up conversations older than 30 days
setInterval(() => deleteStaleConversations().catch(console.error), 60 * 60 * 1000);
