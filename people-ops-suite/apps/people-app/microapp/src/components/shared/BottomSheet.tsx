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

import { motion } from "motion/react";
import { type PropsWithChildren } from "react";

interface BottomSheetProps extends PropsWithChildren {
  onClose: () => void;
}

/**
 * BottomSheet Component
 *
 * A modal sliding panel that appears from the bottom of the screen.
 *
 * Typically used for displaying temporary, focused content or forms
 * without navigating away from the current page.
 *
 * Accepts an `onClose` callback to handle dismissal (usually triggered
 * by clicking outside the panel or a close action inside).
 *
 * This component manages overlay click handling, animation states,
 * and basic styling for the bottom sheet container.
 *
 * Props:
 * - onClose: () => void — Callback when the bottom sheet should close.
 * - children: React.ReactNode — Content inside the bottom sheet.
 */
function BottomSheet({ children, onClose }: BottomSheetProps) {
  return (
    <div className="flex items-end fixed top-0 left-0 inset-0 z-40">
      <motion.div
        className="absolute w-full h-full bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        onClick={onClose}
      />
      <motion.div
        className="will-change-transform w-full bg-white rounded-t-[0.53rem] pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.6 }}
      >
        <div className="flex justify-center p-[0.4rem]">
          <div className="w-[40px] h-[5px] bg-[#BFBFBF] rounded-xs" />
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}

export default BottomSheet;
