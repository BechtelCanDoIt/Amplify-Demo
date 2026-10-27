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

import { motion } from "motion/react";
import { CircularProgress } from "@mui/material";
import { serviceUrls } from "@/config/config";
import useHttp, { executeWithTokenHandling, getEmailAsync } from "@/utils/http";
import { useState } from "react";
import { Logger } from "@/utils/logger";

interface DeleteConfirmationModalProps {
  id: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * DeleteConfirmationModal Component
 *
 * Displays a confirmation dialog for vehicle deletion with animated modal overlay.
 * Handles the delete mutation, shows loading state during deletion, and provides
 * confirm/cancel actions. Modal can be dismissed by clicking the backdrop.
 *
 * Props (DeleteConfirmationModalProps):
 * - id: number — vehicle ID to delete from the system.
 * - onConfirm: () => void — callback executed after successful deletion.
 * - onCancel: () => void — callback executed when user cancels or dismisses modal.
 */
export default function DeleteConfirmationModal({
  id,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  const [isPending, setIsPending] = useState<boolean>(false);
  const { handleRequest, handleRequestWithNewToken } = useHttp();

  const handleConfirm = async () => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.deleteVehicle(
        await getEmailAsync(),
        encodeURIComponent(String(id)),
      ),
      "DELETE",
      null,
      () => onConfirm(),
      (error) => Logger.error("vehicle delete failed", error),
      (pending) => setIsPending(pending),
    );
  };

  return (
    <div className="flex items-center fixed top-0 left-0 inset-0 z-40">
      <motion.div
        className="absolute w-full h-full bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onCancel}
      />
      <motion.div
        className="will-change-transform w-full px-4 py-3 mx-5 bg-white rounded-xl mb-[150px] relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25 }}
      >
        <h2 className="text-lg font-semibold">Confirm Delete Vehicle</h2>
        <p className="text-base font-medium opacity-50">
          Are you sure you want to permanently delete this vehicle from the
          system?
        </p>
        <div className="flex justify-end gap-3 mt-7 mb-1 text-lg">
          <button
            className="font-[550] w-1/3 p-[0.35rem] bg-[#F5F5F5] text-[#5c5c5c] rounded-[0.46rem] transition-colors"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="font-[550] w-1/3 p-[0.35rem] bg-primary text-white rounded-[0.46rem] transition-colors"
            onClick={handleConfirm}
            disabled={isPending}
          >
            Confirm
          </button>
        </div>
        {isPending && (
          <div className="absolute top-0 left-0 size-full bg-white/50 grid place-items-center">
            <CircularProgress
              size={26}
              thickness={5}
              style={{ color: "#4a4a4a" }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
