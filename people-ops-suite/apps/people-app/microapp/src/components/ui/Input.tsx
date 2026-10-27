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

import { useId, type InputHTMLAttributes } from "react";
import type { Validity } from "@/types";
import { validation } from "@/constants";
import { Search } from "@mui/icons-material";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  validity?: Validity;
}

/**
 * TextInput Component
 *
 * A styled text input field with optional label and dynamic outline color
 * based on the validity prop.
 *
 * Props (TextInputProps):
 * - label?: string — optional label text displayed above the input.
 * - validity?: 'VALID' | 'INVALID' | 'UNCERTAIN' — controls outline color on focus.
 * - All other standard input props like value, placeholder, onChange, disabled, etc., are supported.
 */
export function TextInput(props: TextInputProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;

  return (
    <div className="flex flex-col">
      {props.label && (
        <label htmlFor={inputId} className="font-[550] text-lg mb-2.5">
          {props.label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        className={`w-full outline-[3.5px] outline-transparent focus:outline-[3px] ${
          props.validity === validation.INVALID
            ? "focus:outline-[#ffb6b6]"
            : "focus:outline-[#8FC4FF]"
        } bg-[#EFEFEF] text-gray-700 px-3 py-[0.4rem] rounded-lg text-lg placeholder:text-[#8F8F8F] font-medium transition-colors ease-in duration-200 ${
          props.className
        }`}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
      />
    </div>
  );
}

export function SearchInput() {
  return (
    <div className="flex gap-2 items-center w-full bg-[#EFEFEF] px-2 py-1 rounded-lg text-lg placeholder:text-[#8F8F8F] font-medium mt-2">
      <div className="mb-[2px]">
        <Search style={{ color: "#787878", fontSize: 23 }} />
      </div>
      <input
        type="search"
        placeholder="Search available services"
        aria-label="Search available services"
        className="w-full placeholder:text-[#8F8F8F] font-medium text-lg focus:outline-none"
      />
    </div>
  );
}
