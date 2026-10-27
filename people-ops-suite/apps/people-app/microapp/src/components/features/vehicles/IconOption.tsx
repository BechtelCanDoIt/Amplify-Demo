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

import { type ReactNode } from "react";

export interface IconOptionProps {
  name: string;
  children: ReactNode | ((props: { selected: boolean }) => ReactNode);
  selected?: boolean;
  onSelect?: (name: string) => void;
}

/**
 * IconOption Component
 *
 * A reusable circular button that displays an icon or custom content inside.
 * Commonly used for visual selection, such as choosing between options like "CAR" or "MOTORCYCLE".
 *
 * Highlights with a blue border when selected and triggers an optional `onSelect` callback
 * with the associated `name` value when clicked.
 *
 * Props (IconOptionProps):
 * - name: string – the identifier for this option (passed to onSelect when clicked)
 * - children: ReactNode – icon or content to display inside the button
 * - selected?: boolean – whether this option is currently selected
 * - onSelect?: (name: string) => void – callback fired on click with the option name
 */
function IconOption({
  name,
  children,
  selected = false,
  onSelect,
}: IconOptionProps) {
  return (
    <button
      className="flex justify-center items-center w-[3.12rem] h-[3.12rem] rounded-full bg-primary overflow-hidden transition-colors"
      style={{
        backgroundColor: selected ? "#ff7300" : "#EFEFEF",
      }}
      onClick={() => onSelect?.(name)}
    >
      {typeof children === "function" ? children({ selected }) : children}
    </button>
  );
}

export default IconOption;
