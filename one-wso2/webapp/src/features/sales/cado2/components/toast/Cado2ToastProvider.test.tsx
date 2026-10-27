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
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useCado2Toast } from "./toastContext";
import Cado2ToastProvider from "./Cado2ToastProvider";

function Done() {
  const notify = useCado2Toast();
  return <button onClick={() => notify("Synced to Salesforce")}>Sync</button>;
}

// "It worked" messages go away by themselves (2026-10-13).
describe("Cado2ToastProvider", () => {
  it("shows a toast, then hides it after about 4 seconds", () => {
    vi.useFakeTimers();
    try {
      render(
        <Cado2ToastProvider>
          <Done />
        </Cado2ToastProvider>,
      );
      act(() => screen.getByRole("button", { name: "Sync" }).click());
      expect(screen.getByRole("status")).toHaveTextContent(
        "Synced to Salesforce",
      );
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByRole("status")).toBeInTheDocument(); // still there
      act(() => vi.advanceTimersByTime(2000));
      expect(screen.queryByRole("status")).toBeNull(); // gone by itself
    } finally {
      vi.useRealTimers();
    }
  });
});
