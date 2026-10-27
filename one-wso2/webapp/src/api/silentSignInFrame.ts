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

/**
 * Whether this document is the hidden iframe the Asgardeo SDK uses for silent
 * sign-in: an authorization response loaded inside a frame.
 *
 * The SDK points that iframe at `/authorize?prompt=none`, and the IdP answers by
 * redirecting it to this app's own sign-in callback, so a full copy of the app
 * boots inside it, sharing the tab's session storage. Left to render, the copy
 * makes its own requests with the same token, and when they are refused it starts
 * its own silent sign-in: another iframe, another copy, without end. Only
 * AsgardeoProvider may run there, because it completes the sign-in.
 *
 * Neither half is enough alone. Being framed would also blank a page that embeds
 * this app on purpose, and every top-level sign-in lands with the same response
 * parameters. Together they only occur for a `prompt=none` request, since an
 * interactive sign-in cannot run in a frame: the IdP's login page refuses to be
 * framed. Both come from the browser and the OAuth protocol rather than from how
 * the SDK builds its iframes, so an SDK upgrade cannot quietly switch this off.
 */
export function isSilentSignInFrame(win: Window = window): boolean {
  if (win.self === win.top) return false;
  const params = new URLSearchParams(win.location.search);
  return params.has("state") && (params.has("code") || params.has("error"));
}
