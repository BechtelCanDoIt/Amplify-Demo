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

import { AppsSharp } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useState } from "react";
import { ExitToAppsDialog } from "@/components/shared";

function Header() {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  return (
    <>
      <header className="w-full bg-[#F2F2EF] px-4 sticky top-0 z-20">
        <div className="pt-[var(--safe-top)] pb-3">
          <div className="relative h-11">
            <h1 className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-xl font-bold text-[#1F2A44] whitespace-nowrap">
              People
            </h1>
            <IconButton
              onClick={() => setIsExitDialogOpen(true)}
              aria-label="Back to Super App"
              size="small"
              className="!absolute !left-0 !top-1/2 !-translate-y-1/2"
            >
              <AppsSharp className="text-[#1F2A44]" />
            </IconButton>
          </div>
        </div>
      </header>

      <ExitToAppsDialog
        open={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
      />
    </>
  );
}

export default Header;
