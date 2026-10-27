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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, Collapse, Typography } from "@wso2/oxygen-ui";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  TriangleAlertIcon,
} from "@wso2/oxygen-ui-icons-react";
import { copyRichText } from "../util/clipboard";
import { generateSignatureHTML, hasSignatureContent, type SignatureData } from "../util/signatureGenerator";

type CopyState = "idle" | "success" | "error";

export default function SignaturePreviewCard({ data }: { data: SignatureData }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [showCode, setShowCode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const hasContent = hasSignatureContent(data);
  const signatureHTML = useMemo(
    () => (hasContent ? generateSignatureHTML(data) : ""),
    [hasContent, data],
  );

  const handleCopy = useCallback(async () => {
    if (!signatureHTML) return;
    const ok = await copyRichText(signatureHTML);
    setCopyState(ok ? "success" : "error");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState("idle"), 2500);
  }, [signatureHTML]);

  const CopyStateIcon = copyState === "success" ? CheckIcon : copyState === "error" ? TriangleAlertIcon : CopyIcon;
  const copyLabel =
    copyState === "success" ? "Copied!" : copyState === "error" ? "Couldn't copy — try again" : "Copy for email";

  return (
    <Card variant="outlined" sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
        Preview
      </Typography>

      {/* A mock browser-style frame around the rendered signature, so it
          reads as "what an email will look like" rather than as a plain box
          of HTML on the page. */}
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            bgcolor: "action.hover",
            px: 1.5,
            py: 0.75,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
            <Box key={color} sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Email preview
          </Typography>
        </Box>
        {/* Hardcoded white, not `background.paper`: this simulates an email
            client's canvas, which is always light regardless of app theme,
            and the signature HTML's text colors are hardcoded to match. */}
        <Box sx={{ bgcolor: "#ffffff", p: 3, minHeight: 150 }}>
          {hasContent ? (
            <div dangerouslySetInnerHTML={{ __html: signatureHTML }} />
          ) : (
            <Typography
              variant="body2"
              sx={{ color: "rgba(0, 0, 0, 0.6)", fontStyle: "italic", pt: 5 }}
              align="center"
            >
              Fill in your name or designation to see a preview.
            </Typography>
          )}
        </Box>
      </Box>

      <Button
        variant="contained"
        fullWidth
        disabled={!hasContent}
        onClick={() => void handleCopy()}
        startIcon={<CopyStateIcon size={16} />}
        color={copyState === "error" ? "error" : copyState === "success" ? "success" : "primary"}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        {copyLabel}
      </Button>

      {hasContent && (
        <Typography variant="caption" color="text.secondary" align="center">
          Copy for email, then paste it into Gmail Settings → Signature.
        </Typography>
      )}

      <Box>
        <Button
          size="small"
          disabled={!hasContent}
          onClick={() => setShowCode((v) => !v)}
          endIcon={showCode ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
          sx={{ textTransform: "none", fontSize: 12, color: "text.secondary" }}
        >
          {showCode ? "Hide" : "Show"} HTML source
        </Button>
        <Collapse in={showCode && hasContent}>
          <Box
            component="pre"
            sx={{
              mt: 1,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 1.5,
              maxHeight: 220,
              overflowY: "auto",
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {signatureHTML}
          </Box>
        </Collapse>
      </Box>
    </Card>
  );
}
