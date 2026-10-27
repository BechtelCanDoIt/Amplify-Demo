// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import axios from "axios";
import { config } from "../config";
import { getChoreoUserToken } from "../auth/choreo";
import { backendErrorMessage, logBackendError } from "../utils/log";

// The gh-project-board-stats /query response. `text` is human-readable
// Markdown (what we relay to the user); `type` discriminates the kind of
// answer (release_list, board_selection, unsupported_query, …). The other
// fields are conditional on `type` and passed through untouched.
export interface ReleasesResult {
  type?: string;
  text?: string;
  boardName?: string;
  iteration?: string;
  releases?: string[];
  releasesByStatus?: Record<string, string[]>;
  [key: string]: unknown;
}

// gh-project-board-stats is itself a natural-language release assistant:
// POST /query with { question } and it parses the intent with its own Claude.
// So we forward the user's release question VERBATIM rather than
// re-synthesising a canonical sentence from structured inputs — no reason to
// strip the phrasing only for the backend to re-derive it.
export async function getScheduledReleases(
  googleUserId: string,
  idToken: string,
  question: string,
): Promise<{ success: boolean; data?: ReleasesResult; message?: string }> {
  const trimmed = question?.trim();
  if (!trimmed) {
    return {
      success: false,
      message: "Please tell me what you'd like to know about this week's or next week's releases.",
    };
  }
  try {
    const choreoToken = await getChoreoUserToken(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.releasesBackendUrl}/query`,
      { question: trimmed },
      {
        headers: {
          Authorization: `Bearer ${choreoToken}`,
          "Content-Type": "application/json",
          "User-Agent": "wso2-digital-agent/1.0",
        },
      },
    );
    return { success: true, data: response.data };
  } catch (err: any) {
    logBackendError("[releases]", "getScheduledReleases", err);
    return {
      success: false,
      message: `Failed to fetch scheduled releases: ${backendErrorMessage(err)}`,
    };
  }
}
