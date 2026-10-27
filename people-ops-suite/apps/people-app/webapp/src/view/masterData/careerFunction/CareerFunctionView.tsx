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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, useTheme } from "@mui/material";
import CommonPage from "@layout/pages/CommonPage";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { useAppDispatch, useAppSelector } from "@slices/store";
import { State } from "@/types/types";
import {
  CareerFunction,
  CreateCareerFunctionPayload,
  CreateDesignationPayload,
  Designation,
  UpdateCareerFunctionPayload,
  UpdateDesignationPayload,
  createCareerFunction,
  createDesignation,
  fetchCareerFunctions,
  fetchDesignations,
  selectCareerFunctionsState,
  selectDesignationsState,
  selectCareerFunctions,
  selectDesignations,
  updateCareerFunction,
  updateDesignation,
} from "@slices/careerFunctionSlice/careerFunction";
import CareerFunctionList from "./CareerFunctionList";
import DesignationGrid from "./DesignationGrid";
import CareerFunctionDialog from "./CareerFunctionDialog";
import DesignationDialog from "./DesignationDialog";

export default function CareerFunctionView() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const careerFunctionsState = useAppSelector(selectCareerFunctionsState);
  const designationsState = useAppSelector(selectDesignationsState);
  const careerFunctions = useAppSelector(selectCareerFunctions);
  const designations = useAppSelector(selectDesignations);

  // Either list still in flight counts as loading — the screen needs both.
  const isLoading =
    careerFunctionsState === State.loading || designationsState === State.loading;

  // undefined = nothing chosen yet (initial, before data loads)
  // null      = the "Unassigned" pseudo-entry is selected
  // number    = that career function is selected
  const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined);

  const [careerFunctionDialogOpen, setCareerFunctionDialogOpen] = useState(false);
  const [editingCareerFunction, setEditingCareerFunction] = useState<CareerFunction | null>(null);

  const [designationDialogOpen, setDesignationDialogOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);

  const refreshData = useCallback(() => {
    dispatch(fetchCareerFunctions());
    dispatch(fetchDesignations());
  }, [dispatch]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (selectedId !== undefined) return;
    if (careerFunctionsState !== State.success || designationsState !== State.success) return;

    // Prefer the first active career function; fall back to the Unassigned group, then to
    // any inactive career function. The last case matters now that the status filter
    // defaults to "all": without it nothing would be selected in an all-inactive org, and
    // `selectedId ?? null` would then list the orphans under an empty header.
    const byName = (a: CareerFunction, b: CareerFunction) =>
      a.careerFunction.localeCompare(b.careerFunction);
    const active = careerFunctions.filter((cf) => cf.isActive).sort(byName);

    if (active.length > 0) {
      setSelectedId(active[0].id);
      return;
    }
    if (designations.some((d) => d.careerFunctionId === null)) {
      setSelectedId(null);
      return;
    }
    const inactive = [...careerFunctions].sort(byName);
    if (inactive.length > 0) {
      setSelectedId(inactive[0].id);
    }
  }, [selectedId, careerFunctionsState, designationsState, careerFunctions, designations]);

  const visibleDesignations = useMemo(
    // `undefined` means no selection has been resolved yet. Guard it explicitly: without
    // this, `selectedId ?? null` would collapse to null on the first render and briefly
    // list the Unassigned designations under an empty header.
    () =>
      selectedId === undefined
        ? []
        : designations.filter((d) => d.careerFunctionId === selectedId),
    [designations, selectedId],
  );

  const selectedCareerFunction = useMemo(
    () => (selectedId != null ? (careerFunctions.find((cf) => cf.id === selectedId) ?? null) : null),
    [careerFunctions, selectedId],
  );

  const isUnassigned = selectedId === null;
  const careerFunctionName = isUnassigned ? "Unassigned" : (selectedCareerFunction?.careerFunction ?? "");


  const handleSelect = (id: number | null) => {
    setSelectedId(id);
  };

  const handleAddCareerFunction = () => {
    setEditingCareerFunction(null);
    setCareerFunctionDialogOpen(true);
  };

  const handleEditCareerFunction = (cf: CareerFunction) => {
    setEditingCareerFunction(cf);
    setCareerFunctionDialogOpen(true);
  };

  const handleCareerFunctionDialogClose = () => {
    setCareerFunctionDialogOpen(false);
    setEditingCareerFunction(null);
  };

  const handleCareerFunctionSubmit = async (
    payload: CreateCareerFunctionPayload | UpdateCareerFunctionPayload,
  ) => {
    if (editingCareerFunction) {
      await dispatch(
        updateCareerFunction({ id: editingCareerFunction.id, payload: payload as UpdateCareerFunctionPayload }),
      ).unwrap();
    } else {
      await dispatch(createCareerFunction(payload as CreateCareerFunctionPayload)).unwrap();
    }
    refreshData();
  };

  const handleAddDesignation = () => {
    setEditingDesignation(null);
    setDesignationDialogOpen(true);
  };

  const handleEditDesignation = (d: Designation) => {
    setEditingDesignation(d);
    setDesignationDialogOpen(true);
  };

  const handleDesignationDialogClose = () => {
    setDesignationDialogOpen(false);
    setEditingDesignation(null);
  };

  const handleDesignationSubmit = async (payload: CreateDesignationPayload | UpdateDesignationPayload) => {
    if (editingDesignation) {
      await dispatch(
        updateDesignation({ id: editingDesignation.id, payload: payload as UpdateDesignationPayload }),
      ).unwrap();
    } else {
      await dispatch(createDesignation(payload as CreateDesignationPayload)).unwrap();
    }
    refreshData();
  };

  return (
    <CommonPage
      title="Career Functions"
      icon={<WorkspacesIcon />}
      commonPageTabs={[]}
      page={
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "400px 1fr" },
              height: "100%",
            }}
          >
            <Box
              sx={{
                borderRight: { md: `1px solid ${theme.palette.divider}` },
                borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: "none" },
              }}
            >
              <CareerFunctionList
                careerFunctions={careerFunctions}
                designations={designations}
                selectedId={selectedId ?? null}
                onSelect={handleSelect}
                onAdd={handleAddCareerFunction}
                onEdit={handleEditCareerFunction}
                isLoading={isLoading}
              />
            </Box>
            <DesignationGrid
              designations={visibleDesignations}
              careerFunctionName={careerFunctionName}
              isUnassigned={isUnassigned}
              isLoading={isLoading}
              onAdd={handleAddDesignation}
              onEdit={handleEditDesignation}
            />
          </Box>
          <CareerFunctionDialog
            open={careerFunctionDialogOpen}
            onClose={handleCareerFunctionDialogClose}
            onSubmit={handleCareerFunctionSubmit}
            careerFunction={editingCareerFunction}
            allCareerFunctions={careerFunctions}
          />
          <DesignationDialog
            open={designationDialogOpen}
            onClose={handleDesignationDialogClose}
            onSubmit={handleDesignationSubmit}
            designation={editingDesignation}
            careerFunctions={careerFunctions}
            defaultCareerFunctionId={selectedId ?? null}
            allDesignations={designations}
          />
        </>
      }
    />
  );
}
