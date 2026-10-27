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

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

import { AddSharp, KeyboardBackspaceSharp } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";

import type { Vehicle } from "@/types";
import { PageTransitionWrapper } from "@/components/shared";
import {
  EmptyState,
  VehicleRow,
  AddVehicleSheet,
  DeleteConfirmationModal,
} from "@/components/features/vehicles";
import useHttp, { executeWithTokenHandling, getEmailAsync } from "@/utils/http";
import { serviceUrls } from "@/config/config";
import { type Response as VehicleResponse } from "@/types";
import { Logger } from "@/utils/logger";

function VehicleManagementPage() {
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehiclePendingRemoval, setVehiclePendingRemoval] = useState<
    number | undefined
  >(undefined);
  const [rows, setRows] = useState<Vehicle[]>([]);

  const { handleRequest, handleRequestWithNewToken } = useHttp();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchVehicles = async () => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      await serviceUrls.fetchVehicles(await getEmailAsync()),
      "GET",
      null,
      (data) => {
        const vehicles = (data as VehicleResponse).vehicles.map(
          (v): Vehicle => ({
            id: v.vehicleId,
            type: v.vehicleType,
            number: v.vehicleRegistrationNumber,
          }),
        );

        setRows(vehicles);
      },
      (error) => Logger.error("Error while fetching vehicle list:", error),
      (loading) => setIsLoading(loading),
    );
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDeleteRequest = (id: number) => {
    setVehiclePendingRemoval(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setVehiclePendingRemoval(undefined);
    fetchVehicles();
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setVehiclePendingRemoval(undefined);
  };

  return (
    <PageTransitionWrapper type="secondary">
      <div className="h-screen">
        <section className="px-1 pt-[calc(var(--safe-top)+24px)]">
          <BackButton />
        </section>
        <div className="flex flex-col-reverse px-4 mt-5">
          {isLoading ? (
            <div className="grid place-items-center size-full border-b border-[#E5E5E5] pb-12">
              <CircularProgress size={29} sx={{ color: "#ff7300" }} />
            </div>
          ) : (
            <>
              {rows.length > 0 ? (
                <>
                  {rows.map((row, index) => (
                    <VehicleRow
                      key={row.id}
                      index={index + 1}
                      {...row}
                      onDelete={() => {
                        handleDeleteRequest(row.id);
                      }}
                    />
                  ))}
                </>
              ) : (
                <EmptyState />
              )}
            </>
          )}
        </div>
      </div>
      <section className="pr-1 mx-5 fixed bottom-20 right-1.5">
        <AddButton onClick={() => setShowBottomSheet(true)} />
      </section>
      <AnimatePresence>
        {showBottomSheet && (
          <AddVehicleSheet
            onClose={() => setShowBottomSheet(false)}
            onSubmit={fetchVehicles}
          />
        )}
        {showDeleteModal && vehiclePendingRemoval && (
          <DeleteConfirmationModal
            id={vehiclePendingRemoval}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </AnimatePresence>
    </PageTransitionWrapper>
  );
}

export default VehicleManagementPage;

interface AddButtonProps {
  onClick: () => void;
}

function AddButton({ onClick }: AddButtonProps) {
  return (
    <IconButton
      className="size-[40px] grid place-items-center rounded-full transition-colors"
      onClick={onClick}
      style={{
        backgroundColor: "#ff7300",
      }}
    >
      <AddSharp className="text-white" style={{ fontSize: 30.5 }} />
    </IconButton>
  );
}

export function BackButton() {
  const navigate = useNavigate();
  const handleBackButtonClick = () => navigate(-1);

  return (
    <IconButton onClick={handleBackButtonClick}>
      <KeyboardBackspaceSharp className="text-black" style={{ fontSize: 27 }} />
    </IconButton>
  );
}
