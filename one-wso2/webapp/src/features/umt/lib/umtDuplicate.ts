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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// Mark as Duplicate's target must be another update's number. Whether that
// update exists is checked before the dependency is recorded
// (useUmtMarkAsDuplicate); this is the shape check that runs first.
export function umtDuplicateTargetError(value: string, currentId: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[1-9][0-9]*$/.test(trimmed)) return "Enter an update number.";
  if (Number(trimmed) === Number(currentId)) return "An update can't be a duplicate of itself.";
  return undefined;
}
