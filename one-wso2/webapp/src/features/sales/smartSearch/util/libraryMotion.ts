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

import { useEffect, useState } from "react";

/** False when the system asks for reduced motion, and when it can't be told (so tests and old browsers get no animation). */
export function canAnimate(): boolean {
  try {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    return query !== undefined && !query.matches;
  } catch {
    return false;
  }
}

/** A gentle fade-and-rise on mount, switched off by the browser's own reduced-motion setting. */
export function rise(delayMs = 0) {
  return {
    "@keyframes libraryRise": {
      from: { opacity: 0, transform: "translateY(8px)" },
      to: { opacity: 1, transform: "none" },
    },
    animation: `libraryRise 360ms ease-out ${delayMs}ms both`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
  };
}

/** A short pop, for the icon that has just changed state. */
export const pop = {
  "@keyframes libraryPop": {
    "0%": { transform: "scale(0.6)", opacity: 0 },
    "60%": { transform: "scale(1.15)", opacity: 1 },
    "100%": { transform: "scale(1)" },
  },
  animation: "libraryPop 260ms ease-out",
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
};

const TYPING_STEP_MS = 18;
const TYPING_TARGET_STEPS = 80;

/** The text revealed a few characters at a time, or all of it at once when `animate` is off or `skip` is called. */
export function useTypedText(text: string, animate: boolean): { shown: string; typing: boolean; skip: () => void } {
  const [count, setCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const running = animate && !skipped && count < text.length;

  useEffect(() => {
    if (!animate || skipped || text === "") return;
    const step = Math.max(1, Math.ceil(text.length / TYPING_TARGET_STEPS));
    const id = window.setInterval(() => setCount((current) => Math.min(text.length, current + step)), TYPING_STEP_MS);
    return () => window.clearInterval(id);
  }, [animate, skipped, text]);

  return { shown: running ? text.slice(0, count) : text, typing: running, skip: () => setSkipped(true) };
}

const PLACEHOLDER_STEP_MS = 45;
const PLACEHOLDER_HOLD_STEPS = 50;

/** The examples typed out one after another, for a placeholder; the first one, still, when `active` is off. */
export function useTypingPlaceholder(examples: readonly string[], active: boolean): string {
  const [tick, setTick] = useState(0);
  const animated = active && examples.length > 1 && canAnimate();

  useEffect(() => {
    if (!animated) return;
    const id = window.setInterval(() => setTick((current) => current + 1), PLACEHOLDER_STEP_MS);
    return () => window.clearInterval(id);
  }, [animated]);

  if (!animated) return examples[0] ?? "";
  let position = tick % examples.reduce((total, example) => total + example.length + PLACEHOLDER_HOLD_STEPS, 0);
  for (const example of examples) {
    if (position < example.length + PLACEHOLDER_HOLD_STEPS) return example.slice(0, position);
    position -= example.length + PLACEHOLDER_HOLD_STEPS;
  }
  return examples[0] ?? "";
}
