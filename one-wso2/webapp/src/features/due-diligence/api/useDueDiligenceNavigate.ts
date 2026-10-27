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

import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions, type To } from "react-router";

/**
 * A drop-in replacement for react-router's `useNavigate()` for any page under
 * `/due-diligence/*`.
 *
 * That whole route tree sits OUTSIDE every perspective's own path prefix (see
 * PerspectiveContext.tsx) — the entry points into it (the rail's own link,
 * and the Finance/Legal overview cards) already pass `state: { fromPerspective }`
 * so the rail stays on Finance or Legal instead of falling back to the
 * default. But PerspectiveContext resolves that purely from the CURRENT
 * navigation's own state — it doesn't chain automatically — so the moment a
 * due-diligence page navigates onward (a table row, a tab, a back button)
 * without re-attaching that same state, the very next hop loses it and the
 * rail snaps back to the default perspective.
 *
 * This hook reads whatever `fromPerspective` the CURRENT page already has and
 * re-attaches it to every navigation this page makes, so it survives however
 * many hops deep into due-diligence's own pages the user goes — not just the
 * first one.
 */
export function useDueDiligenceNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPerspective = (location.state as { fromPerspective?: string } | null)?.fromPerspective;

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      if (!fromPerspective) {
        navigate(to, options);
        return;
      }
      navigate(to, {
        ...options,
        state: { fromPerspective, ...(options?.state as object | undefined) },
      });
    },
    [navigate, fromPerspective],
  );
}
