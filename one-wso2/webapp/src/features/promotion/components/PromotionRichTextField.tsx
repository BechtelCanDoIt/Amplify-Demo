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

import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Box, useTheme } from "@wso2/oxygen-ui";
import { sanitizePromotionHtml } from "../util/promotionRichText";

// Ports promotion-app's own richEditor.tsx (react-draft-wysiwyg/draft-js) as
// `react-quill-new` instead — the same substitution PAR's own
// ParRichTextField already makes, and for the same reason: draft-js has no
// React 19 support. Toolbar is a subset of source's own (bold/italic/
// underline, ordered/unordered list, indent/outdent) — link and undo/redo
// are dropped, matching the same simplification PAR's port already settled
// on rather than inventing a different toolbar shape for this app.
const MODULES = {
  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], [{ indent: "-1" }, { indent: "+1" }], ["clean"]],
  clipboard: { matchVisual: false, matchers: [] },
};
const FORMATS = ["bold", "italic", "underline", "list", "bullet", "indent"];

export default function PromotionRichTextField({
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

  return (
    <Box
      sx={{
        "& .quill": {
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
        },
        "& .ql-container": {
          fontSize: "inherit",
          fontFamily: "inherit",
          border: "none",
          flex: 1,
          minHeight: "20vh",
          maxHeight: "45vh",
          display: "flex",
          flexDirection: "column",
        },
        "& .ql-editor": {
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          padding: "12px 15px",
          overflowWrap: "break-word",
        },
        "& .ql-toolbar": {
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        },
        "& .ql-container.ql-snow, & .ql-toolbar.ql-snow": {
          border: "none",
        },
      }}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(html) => onChange(sanitizePromotionHtml(html))}
        placeholder={placeholder}
        modules={MODULES}
        formats={FORMATS}
        readOnly={disabled}
      />
    </Box>
  );
}
