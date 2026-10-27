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

import { useState, type FormEvent, type JSX, type Ref } from "react";
import { Box, Button, IconButton, InputAdornment, TextField, Typography, alpha } from "@wso2/oxygen-ui";
import { SearchIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { useTypingPlaceholder } from "../util/libraryMotion";
import { LIBRARY_MAX_QUERY_LENGTH } from "../smartSearchPaths";

interface SearchBoxProps {
  /** What the box starts with. The parent re-keys the box when the address changes, so it follows back and forward. */
  readonly initialValue?: string;
  readonly autoFocus?: boolean;
  /** Called with the trimmed question; never with an empty one. */
  readonly onSubmit: (query: string) => void;
  /** Called after the × empties the box, for a page that should also leave the question behind. */
  readonly onClear?: () => void;
  /** Questions typed out in turn as the placeholder, for the start screen; the first one stays put when motion is off. */
  readonly examples?: readonly string[];
  /** The bigger box with a glow, for the start screen. */
  readonly large?: boolean;
  /** The key that jumps to the box, shown while it is empty. */
  readonly shortcut?: string;
  readonly inputRef?: Ref<HTMLInputElement>;
}

// Fixed sizes, so the box and its button fit the same in every theme: the themes disagree on padding, borders and corners.
const SIZES = { regular: { height: 40, inset: 4 }, large: { height: 56, inset: 6 } } as const;

const DEFAULT_PLACEHOLDER = "Try: How do we answer a security questionnaire?";

/**
 * The question box. A form, so Enter and the button do the same thing and it is announced as a search.
 */
export default function SearchBox({
  initialValue = "",
  autoFocus = false,
  onSubmit,
  onClear,
  examples = [DEFAULT_PLACEHOLDER],
  large = false,
  shortcut,
  inputRef,
}: SearchBoxProps): JSX.Element {
  const [draft, setDraft] = useState(initialValue);
  const placeholder = useTypingPlaceholder(examples, draft === "");
  const { height, inset } = large ? SIZES.large : SIZES.regular;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (question) onSubmit(question);
  };

  const clear = () => {
    setDraft("");
    onClear?.();
  };

  return (
    <Box component="form" role="search" aria-label="Search Ask Sales" onSubmit={submit}>
      <TextField
        fullWidth
        autoFocus={autoFocus}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        inputRef={inputRef}
        sx={(theme) => ({
          "& .MuiOutlinedInput-root": {
            height,
            borderRadius: `${height / 2}px`,
            ...(large && {
              transition: "box-shadow 220ms ease, border-color 220ms ease",
              "&.Mui-focused": {
                boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.16)}, 0 10px 36px ${alpha(theme.palette.primary.main, 0.22)}`,
              },
            }),
          },
          "& .MuiOutlinedInput-input": {
            py: 0,
            height: "100%",
            boxSizing: "border-box",
            ...(large && { fontSize: "1.0625rem" }),
          },
          ...(large && { "@media (prefers-reduced-motion: reduce)": { "& .MuiOutlinedInput-root": { transition: "none" } } }),
        })}
        slotProps={{
          htmlInput: { "aria-label": "Ask a question", maxLength: LIBRARY_MAX_QUERY_LENGTH },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon size={18} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {draft === "" && shortcut && (
                  <Typography
                    component="kbd"
                    variant="caption"
                    aria-hidden="true"
                    sx={{
                      display: { xs: "none", md: "inline" },
                      mr: 1,
                      minWidth: 22,
                      textAlign: "center",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: "6px",
                      color: "text.secondary",
                      fontFamily: "inherit",
                      lineHeight: 1.6,
                    }}
                  >
                    {shortcut}
                  </Typography>
                )}
                {draft !== "" && (
                  <IconButton size="small" onClick={clear} aria-label="Clear search" sx={{ mr: 0.5 }}>
                    <XIcon size={16} />
                  </IconButton>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={draft.trim() === ""}
                  sx={{
                    height: height - 2 * inset,
                    minHeight: 0,
                    boxSizing: "border-box",
                    py: 0,
                    px: large ? 2.5 : 2,
                    borderRadius: `${height / 2 - inset}px`,
                    lineHeight: 1.2,
                  }}
                >
                  Search
                </Button>
              </InputAdornment>
            ),
            // The button sits the same distance from the top, bottom and right edge of the box.
            sx: { pl: large ? 2.5 : 2, pr: `${inset}px` },
          },
        }}
      />
    </Box>
  );
}
