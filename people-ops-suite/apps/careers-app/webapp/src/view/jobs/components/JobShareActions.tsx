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

import { Box, Stack, Tooltip, useTheme } from "@mui/material";
import { Bookmark, BookmarkCheck, Facebook, Linkedin, Twitter } from "lucide-react";

import { heroColorsOf } from "@config/brand";
import { jobShareLinks } from "@utils/jobFilterUtils";
import type { VacancyDetail } from "@utils/vacancyService";

interface JobShareActionsProps {
  job: Pick<VacancyDetail, "id" | "title" | "country">;
  isSignedIn: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}

const NETWORK_ICONS = {
  facebook: <Facebook size={15} />,
  x: <Twitter size={15} />,
  linkedin: <Linkedin size={15} />,
};

const circleSx = (hero: ReturnType<typeof heroColorsOf>) =>
  ({
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `1px solid ${hero.circleBorder}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: hero.circleIcon,
  }) as const;

// Share links for the job page, plus a save button that only a signed-in candidate sees.
const JobShareActions = ({ job, isSignedIn, isSaved, onToggleSave }: JobShareActionsProps) => {
  const hero = heroColorsOf(useTheme().palette.mode);
  const links = jobShareLinks(job, window.location.origin);

  return (
    <Stack direction="row" gap={1.5} mt={3}>
      {links.map((link) => (
        <Tooltip key={link.href} title={link.label}>
          <Box
            component="a"
            href={link.href}
            aria-label={`${link.label} (opens in a new tab)`}
            target="_blank"
            rel="noopener noreferrer"
            sx={circleSx(hero)}
          >
            {NETWORK_ICONS[link.network]}
          </Box>
        </Tooltip>
      ))}
      {isSignedIn && (
        <Box
          component="button"
          aria-label="Save job"
          aria-pressed={isSaved}
          onClick={onToggleSave}
          sx={{
            ...circleSx(hero),
            color: isSaved ? "primary.main" : hero.circleIcon,
            background: "none",
            cursor: "pointer",
          }}
        >
          {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </Box>
      )}
    </Stack>
  );
};

export default JobShareActions;
