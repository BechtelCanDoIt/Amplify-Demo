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

import { useCallback, useEffect } from "react";
import CommonPage from "@layout/pages/CommonPage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HubIcon from "@mui/icons-material/Hub";
import BusinessIcon from "@mui/icons-material/Business";
import GroupsIcon from "@mui/icons-material/Groups";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  createBusinessUnit,
  createSubTeam,
  createTeam,
  createUnit,
  fetchAllCompanyOrgChartEntities,
  fetchCompanyOrgChartStructure,
  selectBusinessUnits,
  selectEntitiesState,
  selectSubTeams,
  selectTeams,
  selectUnits,
  updateBusinessUnit,
  updateSubTeam,
  updateTeam,
  updateUnit,
  CreateEntityPayload,
  UpdateEntityPayload,
} from "@slices/masterDataSlice/masterData";
import EntityTab from "./EntityTab";
import HierarchyView from "./HierarchyView";

export default function MasterDataView() {
  const dispatch = useAppDispatch();
  const loadingState = useAppSelector(selectEntitiesState);
  const businessUnits = useAppSelector(selectBusinessUnits);
  const teams = useAppSelector(selectTeams);
  const subTeams = useAppSelector(selectSubTeams);
  const units = useAppSelector(selectUnits);

  const refreshData = useCallback(() => {
    dispatch(fetchAllCompanyOrgChartEntities());
    dispatch(fetchCompanyOrgChartStructure());
  }, [dispatch]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleCreateBU = async (payload: CreateEntityPayload) => {
    await dispatch(createBusinessUnit(payload)).unwrap();
    refreshData();
  };

  const handleUpdateBU = async (id: number, payload: UpdateEntityPayload) => {
    await dispatch(updateBusinessUnit({ id, payload })).unwrap();
    refreshData();
  };

  const handleCreateTeam = async (payload: CreateEntityPayload) => {
    await dispatch(createTeam(payload)).unwrap();
    refreshData();
  };

  const handleUpdateTeam = async (id: number, payload: UpdateEntityPayload) => {
    await dispatch(updateTeam({ id, payload })).unwrap();
    refreshData();
  };

  const handleCreateSubTeam = async (payload: CreateEntityPayload) => {
    await dispatch(createSubTeam(payload)).unwrap();
    refreshData();
  };

  const handleUpdateSubTeam = async (id: number, payload: UpdateEntityPayload) => {
    await dispatch(updateSubTeam({ id, payload })).unwrap();
    refreshData();
  };

  const handleCreateUnit = async (payload: CreateEntityPayload) => {
    await dispatch(createUnit(payload)).unwrap();
    refreshData();
  };

  const handleUpdateUnit = async (id: number, payload: UpdateEntityPayload) => {
    await dispatch(updateUnit({ id, payload })).unwrap();
    refreshData();
  };

  return (
    <CommonPage
      title="Master Data"
      icon={<HubIcon />}
      commonPageTabs={[
        {
          tabTitle: "Hierarchy",
          tabPath: "org-structure",
          icon: <AccountTreeIcon />,
          page: <HierarchyView />,
        },
        {
          tabTitle: "Business Units",
          tabPath: "business-units",
          icon: <BusinessIcon />,
          page: (
            <EntityTab
              entityLabel="Business Unit"
              headEmailLabel="BU Head Email"
              entities={businessUnits}
              loadingState={loadingState}
              onCreate={handleCreateBU}
              onUpdate={handleUpdateBU}
            />
          ),
        },
        {
          tabTitle: "Teams",
          tabPath: "teams",
          icon: <GroupsIcon />,
          page: (
            <EntityTab
              entityLabel="Team"
              headEmailLabel="Team Head Email"
              entities={teams}
              loadingState={loadingState}
              onCreate={handleCreateTeam}
              onUpdate={handleUpdateTeam}
            />
          ),
        },
        {
          tabTitle: "Sub Teams",
          tabPath: "sub-teams",
          icon: <GroupWorkIcon />,
          page: (
            <EntityTab
              entityLabel="Sub Team"
              headEmailLabel="Sub Team Head Email"
              entities={subTeams}
              loadingState={loadingState}
              onCreate={handleCreateSubTeam}
              onUpdate={handleUpdateSubTeam}
            />
          ),
        },
        {
          tabTitle: "Units",
          tabPath: "units",
          icon: <WorkspacesIcon />,
          page: (
            <EntityTab
              entityLabel="Unit"
              headEmailLabel="Unit Head Email"
              entities={units}
              loadingState={loadingState}
              onCreate={handleCreateUnit}
              onUpdate={handleUpdateUnit}
            />
          ),
        },
      ]}
    />
  );
}
