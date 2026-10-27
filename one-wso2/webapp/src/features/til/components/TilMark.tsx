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
import { appMarkTones } from "@components/app-marks/appMarkTones";

// Today I Learned's own mark: a lightbulb over an open book. The bulb is the
// symbol TIL's rail item already uses (lucide's Lightbulb, traced at 2x on
// the same 48-unit grid as the launcher marks in AppMark.tsx); the pages say
// where it lives, in Knowledge. Drawn in Knowledge's three tones, but not
// Knowledge's own open-book mark, which stands for the whole area rather
// than this one feed.
//
// The bulb carries the hue, its base is the dark accent, and the two pages
// sit back in the pale tone. Scaled so it weighs the same as the launcher
// marks: 32% coverage and L* 66 at 64px.
export default function TilMark({ size = 48 }: { size?: number }) {
  const t = appMarkTones("knowledge")!;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 32c7-2 13.5-1.2 20 2.5V46c-6.5-3.7-13-4.5-20-2.5z" fill={t.field} />
      <path d="M44 32c-7-2-13.5-1.2-20 2.5V46c6.5-3.7 13-4.5 20-2.5z" fill={t.field} />
      <g transform="translate(24 0) scale(0.74) translate(-24 -1.3)">
        <path
          d="M30 28c.4-2 1.4-3.4 3-5 2-1.8 3-4.4 3-7A12 12 0 0 0 12 16c0 2 .4 4.4 3 7 1.4 1.4 2.6 3 3 5z"
          fill={t.lead}
        />
        <rect x="17.5" y="31" width="13" height="4.6" rx="2.3" fill={t.detail} />
      </g>
    </svg>
  );
}
