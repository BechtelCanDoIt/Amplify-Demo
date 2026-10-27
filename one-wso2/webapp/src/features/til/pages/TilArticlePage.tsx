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
import { useEffect, type ReactNode } from "react";
import { Box, Link, Skeleton, Typography } from "@wso2/oxygen-ui";
import { Link as RouterLink, useParams } from "react-router";
import { BASE_DOCUMENT_TITLE } from "@hooks/useDocumentTitle";
import { isTilBackendConfigured, useTilSubmission, useTilSubmissions } from "../api/useTilData";
import type { TilSubmission } from "../api/tilTypes";
import TilArticleBody from "../components/TilArticleBody";
import TilArticleLayout, { TIL_SERIF } from "../components/TilArticleLayout";
import TilMark from "../components/TilMark";
import { TIL_FEED_PATH, tilArticlePath, tilEntryPath } from "../util/tilArticleView";
import { describeError, isNotFound } from "../util/tilError";
import { tilInitials, tilShortDate } from "../util/tilFormat";
import { tilReadingMinutes } from "../util/tilRichText";

const MORE_COUNT = 3;

const kickerSx = { fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--til-accent)" } as const;

function source(entry: TilSubmission): string {
  return entry.whereDetail ? `${entry.where} · ${entry.whereDetail}` : entry.where;
}

// A message in the article's own column, for every state that isn't the entry.
function ArticleNotice({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: "68ch", mx: "auto", px: { xs: 2.5, sm: 3 }, py: 8 }}>
      <Typography sx={{ fontFamily: TIL_SERIF, fontSize: 20, lineHeight: 1.5 }}>{children}</Typography>
    </Box>
  );
}

// A Today I Learned entry as a full-page article (?view=article), outside
// the One WSO2 shell. Read-only on purpose: Edit and Delete stay on the entry
// page inside One WSO2, one click away through the masthead link.
export default function TilArticlePage() {
  const { id } = useParams();
  const configured = isTilBackendConfigured();
  const submission = useTilSubmission(id);
  // The newest few entries for "More learnings": one more than shown, in case
  // this entry is among them.
  const submissions = useTilSubmissions({ limit: MORE_COUNT + 1, offset: 0 });
  const entry = submission.data;
  const notFound = isNotFound(submission.error);

  // The article stands outside the One WSO2 shell, so its tab carries TIL's
  // name alone instead of useDocumentTitle's "<screen> · One WSO2".
  useEffect(() => {
    document.title = "TIL";
    return () => {
      document.title = BASE_DOCUMENT_TITLE;
    };
  }, []);

  // Outside the shell the window scrolls, so a new entry has to start at the
  // top itself (AppLayout's own reset only covers its scroll container).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const more = (submissions.data?.items ?? []).filter((s) => s.id !== id).slice(0, MORE_COUNT);

  return (
    <TilArticleLayout shellHref={id ? tilEntryPath(id) : TIL_FEED_PATH}>
      {!configured ? (
        <ArticleNotice>Today I Learned isn&apos;t connected in this environment yet.</ArticleNotice>
      ) : submission.isLoading ? (
        <Box sx={{ maxWidth: "68ch", mx: "auto", px: { xs: 2.5, sm: 3 }, pt: { xs: 4, md: 8 } }}>
          <Skeleton width="30%" />
          <Skeleton variant="rectangular" height={110} sx={{ my: 2, borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
        </Box>
      ) : notFound ? (
        <ArticleNotice>
          This entry doesn&apos;t exist anymore. It may have been deleted, or the link is wrong.
        </ArticleNotice>
      ) : submission.isError ? (
        <ArticleNotice>Couldn&apos;t load this entry. {describeError(submission.error)}</ArticleNotice>
      ) : entry ? (
        <>
          <Box component="article" sx={{ maxWidth: "68ch", mx: "auto", px: { xs: 2.5, sm: 3 }, pt: { xs: 4, md: 8 }, pb: 3 }}>
            <Typography sx={kickerSx}>{source(entry)}</Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: TIL_SERIF,
                fontSize: { xs: 32, sm: 40, md: 48 },
                lineHeight: 1.08,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                textWrap: "balance",
                mt: 1.5,
                mb: 2.25,
              }}
            >
              {entry.title || "Untitled entry"}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: 1.25,
                rowGap: 0.75,
                fontSize: 13.5,
                color: "text.secondary",
                pb: 2.75,
                mb: 3.25,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "var(--til-wash)",
                  color: "var(--til-accent)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {tilInitials(entry.who)}
              </Box>
              <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
                {entry.who}
              </Box>
              <span>· {tilShortDate(entry.createdAt)}</span>
              {entry.updatedAt && <span>· Updated {tilShortDate(entry.updatedAt)}</span>}
              <span>· {tilReadingMinutes(entry.what)} min read</span>
            </Box>
            <TilArticleBody html={entry.what} />
            {/* The end mark: the entry stops here, and what follows is the
                way on to other entries. */}
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
              <TilMark size={28} />
            </Box>
          </Box>

          {more.length > 0 && (
            <Box
              component="section"
              aria-labelledby="til-more-learnings"
              sx={{ borderTop: 1, borderColor: "divider", mt: 4, px: { xs: 2.5, md: 7 }, pt: 3.5, pb: 4.5 }}
            >
              <Typography
                id="til-more-learnings"
                component="h2"
                sx={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "text.secondary", mb: 2 }}
              >
                More learnings
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${MORE_COUNT}, 1fr)` }, gap: { xs: 2.5, md: 0 } }}>
                {more.map((s, i) => (
                  <Link
                    key={s.id}
                    component={RouterLink}
                    to={tilArticlePath(s.id)}
                    underline="none"
                    sx={{
                      display: "grid",
                      gap: 1,
                      alignContent: "start",
                      color: "inherit",
                      px: { md: i === 0 ? 0 : 2.5 },
                      // Longhands only: a responsive `borderLeft: "1px solid"`
                      // shorthand resets the colour to the text colour.
                      borderLeftStyle: "solid",
                      borderLeftWidth: { xs: 0, md: i === 0 ? 0 : 1 },
                      borderLeftColor: "divider",
                      "&:hover .til-more-title, &:focus-visible .til-more-title": { color: "var(--til-accent)" },
                    }}
                  >
                    <Typography component="span" sx={{ ...kickerSx, fontSize: 10.5 }}>
                      {s.where}
                    </Typography>
                    <Typography
                      component="span"
                      className="til-more-title"
                      sx={{ fontFamily: TIL_SERIF, fontSize: 19, fontWeight: 600, lineHeight: 1.25 }}
                    >
                      {s.title || "Untitled entry"}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: 12.5, color: "text.secondary" }}>
                      {s.who} · {tilReadingMinutes(s.what)} min read
                    </Typography>
                  </Link>
                ))}
              </Box>
            </Box>
          )}
        </>
      ) : null}
    </TilArticleLayout>
  );
}
