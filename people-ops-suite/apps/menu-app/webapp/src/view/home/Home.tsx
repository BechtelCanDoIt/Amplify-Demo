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
import { Box, Divider } from "@mui/material";

import PreLoader from "@root/src/component/common/PreLoader";
import { useGetDinnerRequestQuery } from "@root/src/services/dod.api";
import { useGetMenuQuery } from "@root/src/services/menu.api";

import DinnerOnDemand from "./DinnerOnDemand";
import Menu from "./Menu";

export default function Home() {
  const { data: menuData, isLoading: isMenuLoading, isError: isMenuError } = useGetMenuQuery();
  const {
    data: dinnerData,
    isLoading: isDinnerLoading,
    error: dinnerError,
  } = useGetDinnerRequestQuery();

  if (isMenuLoading || isDinnerLoading) {
    return <PreLoader />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <Menu data={menuData} isError={isMenuError} />

      <Divider />

      <DinnerOnDemand dinner={dinnerData} error={dinnerError} />
    </Box>
  );
}
