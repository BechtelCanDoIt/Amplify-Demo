// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Backend errors can carry sensitive payloads (stack traces, SQL fragments, employee
// records, OAuth provider blobs). These helpers extract a clean message for logs +
// user-facing replies, and only emit the raw body when LOG_LEVEL=debug is set.

export function backendErrorMessage(err: unknown): string {
  const e = err as any;
  const data = e?.response?.data;
  return (
    data?.message ||
    data?.error_description ||
    data?.error ||
    e?.message ||
    "Unknown error"
  );
}

export function logBackendError(prefix: string, action: string, err: unknown): void {
  const e = err as any;
  console.error(
    `${prefix} ${action} failed —`,
    "status:", e?.response?.status,
    "| message:", backendErrorMessage(err)
  );
  if (process.env.LOG_LEVEL === "debug" && e?.response?.data !== undefined) {
    console.error(`${prefix} [debug] raw body:`, e.response.data);
  }
}
