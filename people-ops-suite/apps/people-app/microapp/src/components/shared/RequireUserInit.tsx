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

import { useEffect, useState, type ReactNode } from "react";
import { getToken } from "@/components/microapp-bridge";
import { getDisplayNameFromJwt, getEmailFromJwt } from "@/utils/http";
import type { User } from "@/types";

interface RequireUserInitProps {
  children: (props: { user: User | undefined }) => ReactNode;
}

/**
 * RequireUserInit Component
 *
 * Ensures user initialization before rendering children. Retrieves JWT token,
 * extracts user information, and provides it to children via render props pattern.
 * Displays nothing until user initialization is complete.
 *
 * Props (RequireUserInitProps):
 * - children: (props: { user: User | undefined }) => ReactNode — render prop function
 *   that receives user object (undefined if no token or initialization failed).
 */
export default function RequireUserInit({ children }: RequireUserInitProps) {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = () => {
      getToken((token: string | undefined) => {
        if (token) {
          setUser({
            name: getDisplayNameFromJwt(token) ?? "",
            email: getEmailFromJwt(token) ?? "",
          });
        }

        setInitialized(true);
      });
    };

    init();
  }, []);

  if (!initialized) return null;

  return <>{children({ user })}</>;
}
