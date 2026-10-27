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

import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { type IconOptionProps } from "./IconOption";

export interface OptionGroupProps
  extends Omit<React.HTMLProps<HTMLDivElement>, "onChange"> {
  value?: string;
  children?: ReactElement<IconOptionProps> | ReactElement<IconOptionProps>[];
  onChange?: (value: string) => void;
}

/**
 * OptionGroup Component
 *
 * A wrapper component that manages selection state across a group of selectable `IconOption` component children
 *
 * It keeps track of the currently selected option and updates children accordingly.
 * When a selection is made, it triggers the `onChange` callback with the selected value.
 *
 * Props (OptionGroupProps):
 * - value: string | undefined – the currently selected option's name
 * - onChange?: (value: string) => void – called when a new option is selected
 * - children: ReactNode – expected to be elements of `IconOption`
 * - ...props: any – additional props are spread onto the wrapper div
 */
function OptionGroup({
  value,
  children,
  onChange,
  ...props
}: OptionGroupProps) {
  const [selected, setSelected] = useState<string | undefined>(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = (e: string) => {
    setSelected(e);
    onChange?.(e);
  };

  return (
    <div {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;

        return cloneElement(child, {
          selected: child.props.name === selected,
          onSelect: handleSelect,
        });
      })}
    </div>
  );
}

export default OptionGroup;
