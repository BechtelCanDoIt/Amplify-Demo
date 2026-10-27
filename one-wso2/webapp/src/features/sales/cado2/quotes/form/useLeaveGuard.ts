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

// Warns before the wizard's unsaved changes are lost:
//
//   the wizard's own Close     → "Leave without saving?" (confirmLeave)
//   a reload or a closed tab   → the browser's own warning
//
// Nothing is kept aside: moving between steps saves the draft (D45), and
// "Save draft" saves at any time. (Keeping unsaved changes to offer them back
// was removed on 2026-10-12: it confused more than it helped.)

import { useCallback, useEffect, useRef } from "react";

/** The message shown before unsaved work is thrown away. */
export const UNSAVED_MESSAGE = "You have unsaved changes. Leave without saving?";

export interface LeaveGuard {
  /** Asks before the wizard's own Close throws away unsaved work; true means go ahead. */
  confirmLeave: () => boolean;
  /** Leave without keeping anything: the work was saved, deleted or deliberately discarded. */
  allowLeave: () => void;
}

export function useLeaveGuard(dirty: boolean): LeaveGuard {
  // A ref, so confirmLeave reads the latest answer.
  const dirtyRef = useRef(dirty);
  const leaving = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const allowLeave = useCallback(() => {
    leaving.current = true;
  }, []);

  const confirmLeave = useCallback(() => {
    if (!dirtyRef.current) return true;
    const ok = window.confirm(UNSAVED_MESSAGE);
    if (ok) leaving.current = true;
    return ok;
  }, []);

  return { confirmLeave, allowLeave };
}
