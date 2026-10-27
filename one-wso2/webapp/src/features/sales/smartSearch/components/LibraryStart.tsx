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

import { useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router";
import { Box, ButtonBase, IconButton, Link, Paper, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import {
  CompassIcon,
  HistoryIcon,
  LockIcon,
  PinIcon,
  PinOffIcon,
  ShieldIcon,
  SwordsIcon,
  TagIcon,
  UsersIcon,
  type LucideIcon,
} from "@wso2/oxygen-ui-icons-react";
import PerspectiveHeader from "@components/perspective-header/PerspectiveHeader";
import { usePinnedEntries, useTogglePin } from "@features/pinned/usePinned";
import { LIBRARY_TOPICS, type LibraryTopic } from "../util/libraryTopics";
import { belongsToSomethingElse } from "../util/libraryKeys";
import { rise } from "../util/libraryMotion";
import { useRecentSearches } from "../util/useLibraryStorage";
import { SMART_SEARCH_LIBRARY_PATH } from "../smartSearchPaths";
import SearchBox from "./SearchBox";
import WelcomeCard from "./WelcomeCard";

const TOPIC_ICON: Record<LibraryTopic["id"], LucideIcon> = {
  security: ShieldIcon,
  pricing: TagIcon,
  competitors: SwordsIcon,
  demos: CompassIcon,
  onboarding: UsersIcon,
};

interface LibraryStartProps {
  readonly onSearch: (query: string) => void;
}

function SectionLabel({ children }: { readonly children: string }): JSX.Element {
  return (
    <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: "block", mb: 1 }}>
      {children}
    </Typography>
  );
}

/** The Library before anyone has asked anything: the box, a few topics to start from, and what they left behind. */
export default function LibraryStart({ onSearch }: LibraryStartProps): JSX.Element {
  const navigate = useNavigate();
  const page = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // "/" jumps to the box from anywhere on the page, unless something else is being typed in.
  useEffect(() => {
    const jump = (event: KeyboardEvent) => {
      if (event.key !== "/" || belongsToSomethingElse(event, page.current)) return;
      event.preventDefault();
      searchInput.current?.focus();
    };
    window.addEventListener("keydown", jump);
    return () => window.removeEventListener("keydown", jump);
  }, []);
  const recent = useRecentSearches();
  const togglePin = useTogglePin();
  const pinnedSearches = usePinnedEntries().filter(
    (entry) => entry.kind === "search" && entry.href.startsWith(`${SMART_SEARCH_LIBRARY_PATH}?`),
  );

  return (
    <Box ref={page}>
      <PerspectiveHeader
        title="Ask Sales"
        subtitle="Ask a question in plain language. Ask Sales finds the exact page, slide, sheet or video moment in Pitstop content that answers it."
      />
      <Box>
        <SearchBox
          autoFocus
          large
          shortcut="/"
          inputRef={searchInput}
          examples={LIBRARY_TOPICS.map((topic) => topic.question)}
          onSubmit={onSearch}
        />
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 1, ml: 1, color: "text.secondary" }}>
          <LockIcon size={13} />
          <Typography variant="caption">
            Searches Pitstop content only, and shows only what you are allowed to see.
          </Typography>
        </Stack>

        <WelcomeCard />

        <Box sx={{ mt: 4 }}>
          <SectionLabel>Start with a topic</SectionLabel>
          <Box
            sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {LIBRARY_TOPICS.map((topic, index) => {
              const Icon = TOPIC_ICON[topic.id];
              return (
                <Paper
                  key={topic.id}
                  variant="outlined"
                  component={ButtonBase}
                  onClick={() => onSearch(topic.question)}
                  sx={{
                    borderRadius: 1.5,
                    p: 2,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    gap: 1,
                    "&:hover": { borderColor: "text.secondary" },
                    "@media (prefers-reduced-motion: no-preference)": {
                      transition: "transform 160ms ease, border-color 160ms ease",
                      "&:hover": { transform: "translateY(-2px)" },
                    },
                    ...rise(120 + index * 70),
                  }}
                >
                  <Box sx={{ color: "primary.main", display: "flex" }}>
                    <Icon size={20} />
                  </Box>
                  <Typography variant="subtitle2">{topic.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {topic.question}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ mt: 4, display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Box>
            <SectionLabel>Pinned searches</SectionLabel>
            {pinnedSearches.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Pin a search from its results and it shows up here and in the top bar.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {pinnedSearches.map((entry) => (
                  <Stack key={entry.id} direction="row" sx={{ alignItems: "center" }}>
                    <ButtonBase
                      onClick={() => navigate(entry.href)}
                      sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start", gap: 1.25, p: 1, borderRadius: 1, textAlign: "left" }}
                    >
                      <Box sx={{ color: "primary.main", display: "flex" }}>
                        <PinIcon size={16} />
                      </Box>
                      <Typography variant="body2" noWrap>
                        {entry.label}
                      </Typography>
                    </ButtonBase>
                    <Tooltip title="Unpin">
                      <IconButton
                        size="small"
                        aria-label={`Unpin ${entry.label}`}
                        onClick={() =>
                          togglePin({ kind: "search", id: entry.id, label: entry.label, href: entry.href })
                        }
                      >
                        <PinOffIcon size={14} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
              <SectionLabel>Recent on this device</SectionLabel>
              {recent.items.length > 0 && (
                <Link component="button" type="button" variant="caption" onClick={recent.clear} underline="hover">
                  Clear
                </Link>
              )}
            </Stack>
            {recent.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Your recent searches show up here.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {recent.items.map((query) => (
                  <ButtonBase
                    key={query}
                    onClick={() => onSearch(query)}
                    sx={{ justifyContent: "flex-start", gap: 1.25, p: 1, borderRadius: 1, textAlign: "left" }}
                  >
                    <Box sx={{ color: "text.secondary", display: "flex" }}>
                      <HistoryIcon size={16} />
                    </Box>
                    <Typography variant="body2">{query}</Typography>
                  </ButtonBase>
                ))}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, px: 1 }}>
              Recent searches are kept in this browser only.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
