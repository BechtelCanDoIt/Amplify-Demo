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

import { Box, Button, Stack, Typography } from "@mui/material";
import { User } from "lucide-react";

import Callout from "@component/common/Callout";
import { BRAND_TINT } from "@config/brand";
import { pillButtonSx } from "@utils/styles";

interface GuestSignInPromptProps {
  onSignIn: () => void;
}

// Shown to a guest before they type anything: signing in now loses nothing and fills the form from the profile.
const GuestSignInPrompt = ({ onSignIn }: GuestSignInPromptProps) => (
  <Callout tone="brand" sx={{ mb: 3 }}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      gap={2}
    >
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BRAND_TINT.soft,
            color: "primary.main",
          }}
        >
          <User size={20} />
        </Box>
        <Box>
          <Typography fontWeight={700} fontSize="0.95rem" color="text.primary">
            Have a Candidate Passport?
          </Typography>
          <Typography fontSize="0.9rem" color="text.primary">
            Sign in or sign up to fill this form from your profile and track this application. Or continue as a guest
            below.
          </Typography>
        </Box>
      </Stack>
      <Button variant="outlined" onClick={onSignIn} sx={{ ...pillButtonSx, flexShrink: 0, px: 3 }}>
        Sign in / Sign up
      </Button>
    </Stack>
  </Callout>
);

export default GuestSignInPrompt;
