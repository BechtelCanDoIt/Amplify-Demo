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

import { useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Box, useTheme } from "@wso2/oxygen-ui";
import { sanitizeEditorHtml } from "../util/tilRichText";

// react-quill-new, same as every other One WSO2 rich-text field -- draft-js
// has no React 19 support. Toolbar is bold/italic/underline and lists, the
// minimum that makes a multi-paragraph learning readable. Text only: no
// pictures, links or undo-redo, kept deliberately simple.
const FORMATS = ["bold", "italic", "underline", "list", "bullet"];

export default function TilRichTextField({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  // theme.palette holds the light scheme only; theme.vars follows the
  // light/dark switch.
  const palette = (theme.vars ?? theme).palette;
  // Heavier than palette.divider so the editor reads as a field beside the
  // Source/Title outlines.
  const editorBorder = `1px solid color-mix(in srgb, ${palette.text.primary} 30%, transparent)`;
  const quillRef = useRef<ReactQuill>(null);

  // Quill's own snow theme never sets a `title` on its toolbar buttons --
  // each one is just an icon with no accessible name and no hover tooltip,
  // which is why none of them say what they do. Set directly on the DOM
  // nodes Quill already built (via the toolbar module's own .container),
  // rather than through modules.toolbar config, which has no option for
  // this at all.
  useEffect(() => {
    const toolbar = quillRef.current?.getEditor().getModule("toolbar") as { container?: HTMLElement } | undefined;
    const container = toolbar?.container;
    if (!container) return;
    const labels: [string, string][] = [
      [".ql-bold", "Bold"],
      [".ql-italic", "Italic"],
      [".ql-underline", "Underline"],
      ['.ql-list[value="ordered"]', "Numbered list"],
      ['.ql-list[value="bullet"]', "Bullet list"],
      [".ql-clean", "Clear formatting"],
    ];
    for (const [selector, label] of labels) {
      container.querySelector(selector)?.setAttribute("title", label);
    }
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["clean"]],
      },
      clipboard: {
        matchVisual: false,
        matchers: [],
      },
    }),
    [],
  );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        "& .quill": {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          border: editorBorder,
          borderRadius: 1,
        },
        "& .ql-container": {
          fontSize: "inherit",
          fontFamily: "inherit",
          border: "none",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
        // !important because quill's own base styles set color directly on
        // this element too.
        "& .ql-editor": {
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          padding: "12px 15px",
          overflowWrap: "break-word",
          color: `${palette.text.primary} !important`,
        },
        // Quill's placeholder defaults to italic -- none of this app's other
        // fields do that (see the Who/Where placeholders beside this one),
        // so drop it for visual consistency.
        "& .ql-editor.ql-blank::before": {
          color: `color-mix(in srgb, ${palette.text.primary} 50%, transparent) !important`,
          fontStyle: "normal",
          left: 15,
          right: 15,
        },
        "& .ql-toolbar": {
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: editorBorder,
          flexShrink: 0,
        },
        "& .ql-container.ql-snow, & .ql-toolbar.ql-snow": {
          border: "none",
        },
        // Restores the toolbar divider the rule above just cleared.
        "& .ql-toolbar.ql-snow": {
          borderBottom: editorBorder,
        },
        // quill.snow.css hardcodes its toolbar icon colors (a dim grey
        // stroke, #444, and #06c blue on hover), which is low-contrast on a
        // dark surface and off-brand on either — repaint every icon state.
        // !important because quill.snow.css's own hover/active rule
        // (.ql-snow.ql-toolbar button.ql-active .ql-stroke, etc.) sits at
        // the same specificity as a plain nested selector here, so which one
        // wins is a coin flip decided by import order, not a chain worth
        // relying on.
        "& .ql-toolbar .ql-stroke": { stroke: `${palette.text.primary} !important` },
        "& .ql-toolbar .ql-fill": { fill: `${palette.text.primary} !important` },
        "& .ql-toolbar .ql-picker-label": { color: `${palette.text.primary} !important` },
        "& .ql-toolbar button:hover .ql-stroke, & .ql-toolbar button.ql-active .ql-stroke, & .ql-toolbar button:focus .ql-stroke":
          { stroke: `${palette.primary.main} !important` },
        "& .ql-toolbar button:hover .ql-fill, & .ql-toolbar button.ql-active .ql-fill, & .ql-toolbar button:focus .ql-fill":
          { fill: `${palette.primary.main} !important` },
        "& .ql-toolbar button:hover, & .ql-toolbar button.ql-active, & .ql-toolbar button:focus": {
          color: `${palette.primary.main} !important`,
        },
      }}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={(html) => onChange(sanitizeEditorHtml(html))}
        placeholder={placeholder}
        modules={modules}
        formats={FORMATS}
        readOnly={disabled}
      />
    </Box>
  );
}
