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
import { AddSharp } from "@mui/icons-material";

/**
 * EmptyState Component
 *
 * Placeholder UI rendered when no vehicles have been added by the user.
 * Encourages the user to add their vehicle with visual guidance using the '+' (Add) icon.
 */
function EmptyState() {
  return (
    <motion.section
      className="border-b border-[#E5E5E5] py-5 text-center"
      layout
    >
      <h1 className="text-lg font-semibold text-[#717171]">
        No vehicles added yet.
      </h1>

      {/* NOTE: &nbsp; is used here to add a forced space so the text and icon don’t stick together */}
      <p className="text-base font-medium text-[#808080]">
        To get started, click the&nbsp;
        <AddSharp className="text-primary" style={{ fontSize: 23 }} />
        &nbsp;icon and add your vehicle details.
      </p>
    </motion.section>
  );
}

export default EmptyState;
