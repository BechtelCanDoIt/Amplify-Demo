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

// The one place in this feature that reads a clock.
//
// Every window rule in subscriptionWindows.ts is a pure function of a `now`
// that flows down as a prop, so this hook exists only to decide *when* to
// hand down a new one. Unlike the cafeteria's clock-time windows (see
// menu/util/useCafeteriaClock), every subscription window is a DAY of the
// month, so the only boundary that can ever flip a window's open/closed
// state — or move which calendar month a wrapping window's label names — is
// local midnight. A `new Date()` read once at render and never refreshed
// stays wrong for the rest of the day: a tab left open across midnight keeps
// showing a window that just opened as closed (or one that just closed as
// still open), and clicking the stale-but-enabled action reaches a backend
// that has already moved on and rejects it.

import { useEffect, useState } from "react";

/** Milliseconds until the next local midnight after `from`, at least 1s away
 *  (matching useCafeteriaClock's own floor) so a wake-up landing a hair
 *  early can't re-arm a near-zero timer repeatedly. */
export function msUntilNextMidnight(from: Date): number {
  const nextMidnight = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1000, nextMidnight.getTime() - from.getTime());
}

export function useMidnightClock(): Date {
  const [now, setNow] = useState(() => new Date());

  // Derived during render rather than held in a ref: advancing `now` at
  // midnight recomputes this to the FOLLOWING midnight, which is what
  // re-arms the effect below for the next day without a self-scheduling loop.
  const delayMs = msUntilNextMidnight(now);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(new Date()), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    // A backgrounded tab has its timers throttled or suspended by the
    // browser, so a midnight boundary can pass unnoticed while the tab is
    // hidden. Resync as soon as it's visible again rather than waiting for
    // whatever's left of the original (possibly very stale) timer.
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return now;
}
