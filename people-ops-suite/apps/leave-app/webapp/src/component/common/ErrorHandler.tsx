// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import { Box, Container, useTheme } from "@mui/material";

import ErrorSvg from "@assets/images/error.svg";
import Wso2LogoBlack from "@assets/images/wso2-logo_black.svg";
import Wso2LogoWhite from "@assets/images/wso2-logo_white.svg";
import StateWithImage from "@component/ui/StateWithImage";
import { ErrorHandlerProps } from "@root/src/utils/types";

const ErrorHandler = (props: ErrorHandlerProps) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: "100vw",
        height: "90vh",
        backgroundColor: theme.palette.background.default,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 5,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <img
            alt="logo"
            width="150"
            height="auto"
            src={theme.palette.mode === "dark" ? Wso2LogoWhite : Wso2LogoBlack}
          />
          <StateWithImage
            message={props.message || "Something went wrong! Please try again later."}
            imageUrl={ErrorSvg}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default ErrorHandler;
