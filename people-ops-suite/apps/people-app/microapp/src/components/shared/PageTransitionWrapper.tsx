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

import React from "react";
import { motion, type Variants } from "motion/react";

interface PageTransitionWrapperProps {
  type: "main" | "secondary";
  children: React.ReactNode;
}

const variants: { main: Variants; secondary: Variants } = {
  main: {
    initial: { opacity: 0, scale: 1.03 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        opacity: { duration: 0.4 },
        scale: { duration: 0.3 },
        ease: "easeIn",
      },
    },
    exit: {
      opacity: 0,
      scale: 1.01,
      transition: {
        opacity: {
          duration: 0.2,
        },
        scale: {
          duration: 0.1,
        },
        ease: "easeOut",
      },
    },
  },
  secondary: {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
  },
};

/**
 * PageTransitionWrapper Component
 *
 * Wraps children with a motion div applying page transition animations.
 * Selects animation variant based on `type` prop.
 *
 * Props (PageTransitionWrapperProps):
 * - type: "main" | "secondary" — determines which animation variant to apply.
 * - children: React.ReactNode — content inside the wrapper.
 */
function PageTransitionWrapper({ children, type }: PageTransitionWrapperProps) {
  const variant = type === "main" ? variants.main : variants.secondary;

  return (
    <motion.div
      variants={variant}
      initial="initial"
      animate="animate"
      exit="exit"
      className="size-full"
    >
      {children}
    </motion.div>
  );
}

export default PageTransitionWrapper;
