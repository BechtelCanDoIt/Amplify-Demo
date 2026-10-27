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
import { Box, Container } from "@mui/material";

import ErrorSvg from "@assets/images/error.svg";
import StateWithImage from "@component/ui/StateWithImage";
import { useWso2Logo } from "@root/src/hooks/useWso2Logo";
import { ErrorHandlerProps } from "@root/src/utils/types";

const ErrorHandler = (props: ErrorHandlerProps) => {
  const wso2Logo = useWso2Logo();
  return (
    <Box
      sx={{
        paddingX: 2,
        paddingY: 5,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <img alt="logo" width="150" height="auto" src={wso2Logo} />
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
