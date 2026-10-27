// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useMemo } from "react";
import { BuildingResource, FloorRoom } from "../../types/types";
import { useGet } from "../../services/useApi";
import { Endpoints } from "../../services/endpoints";
import LoadingSpinner from "../Common/LoadingSpinner";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";

import BusinessIcon from "@mui/icons-material/Business";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CancelIcon from "@mui/icons-material/Cancel";

interface FloorRoomSelectorProps {
  selectedFloorsAndRooms: FloorRoom[];
  onChange: (floorsAndRooms: FloorRoom[]) => void;
  disabled?: boolean;
}

const FloorRoomSelector: React.FC<FloorRoomSelectorProps> = ({
  selectedFloorsAndRooms,
  onChange,
  disabled = false,
}) => {
  const { data: buildingResources, isLoading } = useGet<BuildingResource[]>(
    ["building-resources"],
    Endpoints.getBuildingResources(),
  );

  // Transform building resources into floor/room structure
  const availableFloorsAndRooms = useMemo(() => {
    if (!buildingResources || buildingResources.length === 0) return [];

    const floorsMap = new Map<string, string[]>();
    buildingResources.forEach((resource) => {
      if (resource.floorName && resource.resourceName) {
        const floor = resource.floorName.trim();
        const room = resource.resourceName.trim();
        if (!floorsMap.has(floor)) floorsMap.set(floor, []);
        const rooms = floorsMap.get(floor)!;
        if (!rooms.includes(room)) rooms.push(room);
      }
    });

    return Array.from(floorsMap.entries())
      .map(([floor, rooms]) => ({
        floor,
        rooms: rooms.sort(),
      }))
      .sort((a, b) => {
        const numA = parseInt(a.floor.match(/\d+/)?.[0] || "999");
        const numB = parseInt(b.floor.match(/\d+/)?.[0] || "999");
        if (numA !== numB) return numA - numB;
        return a.floor.localeCompare(b.floor);
      });
  }, [buildingResources]);

  const addFloor = (floor: string) => {
    if (disabled) return;
    if (!selectedFloorsAndRooms.find((item) => item.floor === floor)) {
      onChange([...selectedFloorsAndRooms, { floor, rooms: [] }]);
    }
  };

  const removeFloor = (floor: string) => {
    if (disabled) return;
    onChange(selectedFloorsAndRooms.filter((item) => item.floor !== floor));
  };

  const updateRooms = (floor: string, rooms: string[]) => {
    if (disabled) return;
    onChange(
      selectedFloorsAndRooms.map((item) =>
        item.floor === floor ? { ...item, rooms } : item,
      ),
    );
  };

  const toggleRoom = (floor: string, room: string) => {
    if (disabled) return;
    const floorData = selectedFloorsAndRooms.find(
      (item) => item.floor === floor,
    );
    if (!floorData) return;
    const rooms = floorData.rooms.includes(room)
      ? floorData.rooms.filter((r) => r !== room)
      : [...floorData.rooms, room];
    updateRooms(floor, rooms);
  };

  const getAvailableRoomsForFloor = (floor: string): string[] => {
    return (
      availableFloorsAndRooms.find((item) => item.floor === floor)?.rooms || []
    );
  };

  if (isLoading)
    return <LoadingSpinner message="Loading building resources..." />;
  if (!availableFloorsAndRooms.length)
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No building resources available.
      </Typography>
    );

  return (
    <Box
      sx={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {/* Floor Selection Buttons */}
      <Typography
        variant="body2"
        fontWeight={500}
        color="text.secondary"
        sx={{ mb: 1 }}
      >
        Select Floors
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        {availableFloorsAndRooms.map((floorData) => {
          const isSelected = selectedFloorsAndRooms.some(
            (item) => item.floor === floorData.floor,
          );
          return (
            <Chip
              key={floorData.floor}
              label={floorData.floor}
              size="small"
              variant={isSelected ? "filled" : "outlined"}
              onClick={() => addFloor(floorData.floor)}
              disabled={disabled || isSelected}
              sx={{
                borderRadius: "8px",
                fontWeight: 500,
                fontSize: "0.75rem",
                ...(isSelected
                  ? {
                      bgcolor: "#FFF3E8",
                      color: "#FF7300",
                      borderColor: "#FFE0C2",
                    }
                  : {
                      borderColor: "#D1D5DB",
                      color: "#6C7496",
                      "&:hover": { borderColor: "#FF7300", color: "#FF7300" },
                    }),
              }}
            />
          );
        })}
      </Stack>

      {/* Selected Floors & Room Selection */}
      {selectedFloorsAndRooms.map((floorRoom) => {
        const availableRooms = getAvailableRoomsForFloor(floorRoom.floor);

        return (
          <Paper
            key={floorRoom.floor}
            variant="outlined"
            sx={{ p: 2, mb: 1.5, borderRadius: "12px", bgcolor: "#F4F6F9" }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <BusinessIcon sx={{ fontSize: 18, color: "#FF7300" }} />
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.secondary"
                >
                  {floorRoom.floor}
                </Typography>
              </Stack>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => removeFloor(floorRoom.floor)}
                  sx={{ color: "#7E87AD", "&:hover": { color: "#ED1B24" } }}
                >
                  <CancelIcon sx={{ fontSize: 20 }} />
                </IconButton>
              )}
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {availableRooms.map((room) => {
                const isSelected = floorRoom.rooms.includes(room);
                return (
                  <Chip
                    key={room}
                    icon={<LocationOnOutlinedIcon sx={{ fontSize: 12 }} />}
                    label={room}
                    size="small"
                    onClick={() => toggleRoom(floorRoom.floor, room)}
                    sx={{
                      borderRadius: "16px",
                      fontSize: "0.75rem",
                      ...(isSelected
                        ? {
                            bgcolor: "#FF7300",
                            color: "#fff",
                            "& .MuiChip-icon": { color: "#fff" },
                          }
                        : {
                            bgcolor: "#fff",
                            color: "#6C7496",
                            border: "1px solid #D1D5DB",
                            "& .MuiChip-icon": { color: "#6C7496" },
                            "&:hover": { borderColor: "#FF7300" },
                          }),
                    }}
                  />
                );
              })}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
};

export default FloorRoomSelector;
