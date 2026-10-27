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

interface MoreOptionsProps {
  onDelete: () => void;
}

/**
 * MoreOptions Component
 *
 * A collapsible action panel that appears with animation
 * to reveal additional options related to an item, such as deleting or removing it.
 *
 * Currently includes a single "Remove" button styled with a warning color.
 * Clicking it triggers the `onDelete` callback.
 *
 * Props (MoreOptionsProps):
 * - onDelete: () => void – callback executed when the user clicks "Remove"
 */
function MoreOptions({ onDelete }: MoreOptionsProps) {
  return (
    <motion.div
      className="font-[550] overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: "auto",
        opacity: 1,
        transition: {
          height: { duration: 0.3 },
          opacity: { duration: 0.2, delay: 0.22 },
        },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: {
          height: { duration: 0.3 },
          opacity: { duration: 0.2 },
        },
      }}
    >
      <button
        className="w-full p-[0.27rem] bg-[#FFEBEB] text-[#B44E4E] rounded-[0.46rem] mt-3 mb-[1.1rem]"
        onClick={onDelete}
      >
        Remove
      </button>
    </motion.div>
  );
}

export default MoreOptions;
