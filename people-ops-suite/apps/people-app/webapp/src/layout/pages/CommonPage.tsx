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

import { Box, Tab, Tabs, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface CommonPageProps {
  title: string;
  commonPageTabs: TabProps[];
  icon?: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  page?: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
}

interface TabProps {
  tabTitle: string;
  tabPath: string;
  icon?: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  page: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
}

const CommonPage = ({ title, commonPageTabs, icon, page }: CommonPageProps) => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState<number>(0);
  const tabs = useMemo(
    () => commonPageTabs.map((tab) => tab.tabPath),
    [commonPageTabs],
  );
  const hasTabs = commonPageTabs.length > 0;

  useEffect(() => {
    if (!hasTabs) {
      return;
    }
    const currentTab = searchParams.get("tab");
    if (currentTab && tabs.indexOf(currentTab) !== -1) {
      setValue(tabs.indexOf(currentTab));
    } else {
      setSearchParams((prev) => {
        prev.set("tab", tabs[0]);
        return prev;
      });
      setValue(0);
    }
  }, [hasTabs, searchParams, setSearchParams, tabs]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setSearchParams((prev) => {
      prev.set("tab", tabs[newValue]);
      return prev;
    });
  };

  const accentColor = theme.palette.secondary.contrastText;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {hasTabs && (
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{
            minHeight: 40,
            "& .MuiTabs-indicator": {
              backgroundColor: accentColor,
              height: 2.5,
            },
          }}
        >
          {commonPageTabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.tabTitle}
              icon={tab.icon}
              iconPosition="start"
              disableRipple
              id={`common-tab-${index}`}
              aria-controls={`common-tabpanel-${index}`}
              sx={{
                textTransform: "none",
                fontWeight: value === index ? 600 : 400,
                fontSize: "0.9rem",
                color: theme.palette.text.secondary,
                minHeight: 40,
                px: 2,
                "&.Mui-selected": {
                  color: accentColor,
                },
              }}
            />
          ))}
        </Tabs>
      )}
      <Box sx={{ flex: 1, overflow: "auto", mt: 1 }}>
        {hasTabs
          ? commonPageTabs.map((tab, index) => (
              <TabPanel key={tab.tabPath || index} value={value} index={index}>
                {tab.page}
              </TabPanel>
            ))
          : page}
      </Box>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`common-tabpanel-${index}`}
      aria-labelledby={`common-tab-${index}`}
      sx={{ height: "100%" }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

export default CommonPage;
