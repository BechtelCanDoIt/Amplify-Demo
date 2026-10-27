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
import { useCallback, useState, type JSX, type ReactNode } from "react";
import { Alert, Snackbar } from "@wso2/oxygen-ui";
import { Cado2ToastContext } from "./toastContext";

/** How long a toast stays: long enough to read a short sentence. */
const TOAST_MS = 4000;

/**
 * Holds CadO2's toast above its pages, so a toast outlives a page change (a
 * new quote's first save moves to its edit address). The same look as
 * Promotions' feedback toast: bottom centre, gone after 4 seconds.
 */
export default function Cado2ToastProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [shown, setShown] = useState<{ message: string; key: number } | null>(
    null,
  );
  const notify = useCallback(
    (message: string) => setShown({ message, key: Date.now() }),
    [],
  );
  const close = () => setShown(null);
  return (
    <Cado2ToastContext.Provider value={notify}>
      {children}
      <Snackbar
        key={shown?.key}
        open={shown !== null}
        autoHideDuration={TOAST_MS}
        onClose={(_, reason) => reason !== "clickaway" && close()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={close} role="status">
          {shown?.message}
        </Alert>
      </Snackbar>
    </Cado2ToastContext.Provider>
  );
}
