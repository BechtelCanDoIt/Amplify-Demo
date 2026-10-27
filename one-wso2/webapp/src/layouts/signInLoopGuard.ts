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

// Stops AuthGuard sending the user to the IdP again and again.
//
// If the sign-in comes back still signed out — the code exchange failing after a
// change to the client or redirect URI at the IdP, say — AuthGuard would redirect
// again, the live SSO session would bounce straight back, and the tab would load
// the app every second or two for as long as it stayed open. So each redirect is
// recorded, the record is cleared by a successful sign-in, and coming back signed
// out soon after one means the loop, not a person.
//
// Guarded like postLoginRedirect: sessionStorage can throw, and a failure here
// must fail open — at worst the loop is not caught, never a sign-in refused.

/** sessionStorage key holding when this tab last sent the user to sign in. */
export const SIGN_IN_REDIRECT_KEY = "one_wso2_sign_in_redirect_at";

/**
 * How soon a signed-out return counts as a loop.
 *
 * With a live SSO session the round trip takes a few seconds. Someone typing
 * their credentials takes longer, and a loop that waits on them each time is not
 * a runaway, so missing it costs nothing.
 */
export const SIGN_IN_LOOP_WINDOW_MS = 30_000;

/** Record that this tab is about to be sent to sign in. */
export function rememberSignInRedirect(now: number = Date.now()): void {
  try {
    sessionStorage.setItem(SIGN_IN_REDIRECT_KEY, String(now));
  } catch {
    // Nothing recorded, so nothing can be caught — the sign-in still happens.
  }
}

/** Forget it once a sign-in has succeeded. */
export function forgetSignInRedirect(): void {
  try {
    sessionStorage.removeItem(SIGN_IN_REDIRECT_KEY);
  } catch {
    // Nothing was stored if the write failed too.
  }
}

/** Whether this tab was sent to sign in within the loop window. */
export function signInRedirectIsRecent(now: number = Date.now()): boolean {
  try {
    const at = Number(sessionStorage.getItem(SIGN_IN_REDIRECT_KEY));
    // A record from the future (the clock moved) is not trusted to block anything.
    return Number.isFinite(at) && at > 0 && now >= at && now - at < SIGN_IN_LOOP_WINDOW_MS;
  } catch {
    return false;
  }
}
