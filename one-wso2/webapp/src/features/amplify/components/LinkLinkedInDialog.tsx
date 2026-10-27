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

import { Box, Button, Dialog, DialogContent, Typography } from "@wso2/oxygen-ui";
import { LinkIcon, LinkedinIcon } from "@wso2/oxygen-ui-icons-react";
import { dialogPaperSx } from "@components/confirmation-dialog/dialogPaperSx";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useStartLinkedInConnect } from "../api/useAmplifyMutations";
import { describeAmplifyError } from "../util/amplifyError";
import { isAllowedLink } from "../util/linkedinPost";

/**
 * The "Link Your LinkedIn Account" popup an unlinked Amplify click opens.
 *
 * Link Me asks amplify-api for a LinkedIn consent URL and sends the browser
 * there. LinkedIn comes back to /amplify/connect/callback, which finishes the
 * link and returns to `returnTo` with the post's share dialog open.
 *
 * The copy is the A9 placeholder until Legal signs off. The wireframe's "We
 * only keep your LinkedIn member ID" isn't true in phase 1: Amplify keeps an
 * encrypted LinkedIn token so it can post for you.
 */
export default function LinkLinkedInDialog({
  open,
  onClose,
  returnTo,
  pendingCampaignId,
  reconnect = false,
}: {
  open: boolean;
  onClose: () => void;
  returnTo: string;
  pendingCampaignId?: string;
  reconnect?: boolean;
}) {
  const start = useStartLinkedInConnect();
  const { showError } = useNotifications();

  const linkMe = () => {
    start.mutate(
      { returnTo, pendingCampaignId },
      {
        onSuccess: (auth) => {
          // Only ever follow a LinkedIn (or, in dev, the listed mock) sign-in page.
          if (auth?.authorizationUrl && isAllowedLink(auth.authorizationUrl)) window.location.assign(auth.authorizationUrl);
          else showError("Something went wrong, please try again.");
        },
        onError: (err) => showError(describeAmplifyError(err)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={start.isPending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { ...dialogPaperSx, borderColor: "primary.main" } } }}
      aria-labelledby="amplify-link-title"
    >
      <DialogContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
          <Box sx={{ color: "primary.main", display: "flex" }}>
            <LinkedinIcon size={22} aria-hidden />
          </Box>
          <Typography id="amplify-link-title" component="h2" sx={{ fontWeight: 700 }}>
            {reconnect ? "Link Your LinkedIn Account Again" : "Link Your LinkedIn Account"}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {reconnect ? "Your LinkedIn link has expired. " : ""}
          I consent to allow WSO2 to link to my LinkedIn profile account so that we can repost on my behalf. We only
          keep:
        </Typography>
        <Box component="ul" sx={{ m: 0, mb: 2, pl: 2.5, typography: "body2", color: "text.secondary" }}>
          <li>LinkedIn id (urn)</li>
          <li>Token to post on your behalf, securely stored encrypted</li>
          <li>Scopes</li>
          <li>And supporting data such as time captured, as required by LinkedIn rules and functionality</li>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" startIcon={<LinkIcon size={16} />} onClick={linkMe} disabled={start.isPending}>
            {start.isPending ? "Opening LinkedIn…" : "Link me"}
          </Button>
          <Button onClick={onClose} disabled={start.isPending}>
            Not now
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
