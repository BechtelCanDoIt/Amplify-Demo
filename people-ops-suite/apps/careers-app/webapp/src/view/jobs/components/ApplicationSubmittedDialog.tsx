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

import { Button, Typography } from "@mui/material";
import { Check } from "lucide-react";

import Callout from "@component/common/Callout";
import StatusDialog from "@component/common/StatusDialog";
import { pillButtonSx } from "@utils/styles";

interface ApplicationSubmittedDialogProps {
  open: boolean;
  jobTitle: string;
  isSignedIn: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

const ApplicationSubmittedDialog = ({
  open,
  jobTitle,
  isSignedIn,
  onClose,
  onSignIn,
}: ApplicationSubmittedDialogProps) => (
  <StatusDialog
    open={open}
    onClose={onClose}
    tone="success"
    icon={<Check size={32} strokeWidth={3} />}
    title="Application submitted!"
    actions={
      isSignedIn ? (
        <Button variant="contained" onClick={onClose} sx={{ ...pillButtonSx, px: 4 }}>
          Done
        </Button>
      ) : (
        <>
          <Button onClick={onClose} sx={{ fontWeight: 600 }}>
            Not now
          </Button>
          <Button variant="contained" onClick={onSignIn} sx={{ ...pillButtonSx, px: 3 }}>
            Sign in or create account
          </Button>
        </>
      )
    }
  >
    <Typography fontSize="0.95rem" color="text.primary">
      You have submitted your application for {jobTitle}. Thank you for applying.
      {isSignedIn && " You can follow the application status through My Applications."}
    </Typography>

    {/* The application is already sent, so asking a guest to sign in now costs them nothing. */}
    {!isSignedIn && (
      <Callout tone="brand" sx={{ mt: 2.5, textAlign: "left" }}>
        <Typography fontWeight={700} fontSize="0.95rem" color="text.primary" mb={0.5}>
          Keep your Candidate Passport
        </Typography>
        <Typography fontSize="0.9rem" color="text.primary">
          Create a free Candidate Passport to track the status of this application, see interview invites and offers,
          and reuse your CV for your next role.
        </Typography>
      </Callout>
    )}
  </StatusDialog>
);

export default ApplicationSubmittedDialog;
