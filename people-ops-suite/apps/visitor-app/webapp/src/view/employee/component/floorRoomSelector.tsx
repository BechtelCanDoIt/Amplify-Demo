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

import React, { useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  FormHelperText,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Room as RoomIcon,
} from "@mui/icons-material";
import { FloorRoom } from "@root/src/slices/visitSlice/visit";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { fetchBuildingResources } from "@root/src/slices/buildingResourcesSlice/buildingResources";

interface FloorRoomSelectorProps {
  selectedFloorsAndRooms: FloorRoom[];
  onChange: (floorsAndRooms: FloorRoom[]) => void;
  error?: string;
  disabled?: boolean;
}

const FloorRoomSelector: React.FC<FloorRoomSelectorProps> = ({
  selectedFloorsAndRooms,
  onChange,
  error,
  disabled = false,
}) => {
  const dispatch = useAppDispatch();
  const { buildingResources, loading: buildingResourcesLoading } =
    useAppSelector((state: RootState) => state.buildingResources);

  // Transform building resources into floor/room structure
  const availableFloorsAndRooms = useMemo(() => {
    if (!buildingResources || buildingResources.length === 0) {
      return [];
    }

    // Group resources by floorName and collect resourceName (rooms)
    const floorsMap = new Map<string, string[]>();

    buildingResources.forEach((resource) => {
      // Only process resources that have floorName defined
      if (resource.floorName && resource.resourceName) {
        const floor = resource.floorName.trim();
        const room = resource.resourceName.trim();

        if (!floorsMap.has(floor)) {
          floorsMap.set(floor, []);
        }

        // Add room to the floor if it doesn't already exist
        const rooms = floorsMap.get(floor)!;
        if (!rooms.includes(room)) {
          rooms.push(room);
        }
      }
    });

    // Convert Map to array format [{floor, rooms: [...]}]
    const result = Array.from(floorsMap.entries())
      .map(([floor, rooms]) => ({
        floor,
        rooms: rooms.sort(), // Sort rooms alphabetically
      }))
      .sort((a, b) => {
        // Custom sort to handle floor numbers and names
        const floorA = a.floor.toLowerCase();
        const floorB = b.floor.toLowerCase();

        // Extract numbers from floor names for better sorting
        const numA = parseInt(floorA.match(/\d+/)?.[0] || "999");
        const numB = parseInt(floorB.match(/\d+/)?.[0] || "999");

        if (numA !== numB) {
          return numA - numB;
        }

        // If numbers are same or no numbers, sort alphabetically
        return floorA.localeCompare(floorB);
      });

    return result;
  }, [buildingResources]);

  useEffect(() => {
    if (buildingResources.length === 0) {
      dispatch(fetchBuildingResources());
    }
  }, [dispatch, buildingResources.length]);

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
    const updatedFloors = selectedFloorsAndRooms.map((item) =>
      item.floor === floor ? { ...item, rooms } : item,
    );
    onChange(updatedFloors);
  };

  const getAvailableRoomsForFloor = (floor: string): string[] => {
    const floorData = availableFloorsAndRooms.find(
      (item) => item.floor === floor,
    );
    return floorData ? floorData.rooms : [];
  };

  return (
    <Box sx={{ opacity: disabled ? 0.75 : 1 }}>
      {buildingResourcesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : availableFloorsAndRooms.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No building resources available. Please contact the administrator.
        </Typography>
      ) : (
        <>
          {/* Floor Selection */}
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            Select Floors
          </Typography>

          <Grid container spacing={1} sx={{ mb: 3 }}>
            {availableFloorsAndRooms.map((floorData) => {
              const isSelected = selectedFloorsAndRooms.some(
                (item) => item.floor === floorData.floor,
              );
              return (
                <Grid item key={floorData.floor}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => addFloor(floorData.floor)}
                    disabled={disabled || isSelected}
                    sx={{
                      minWidth: "auto",
                      ...(disabled && { cursor: "not-allowed" }),
                    }}
                  >
                    {floorData.floor}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          {/* Selected Floors and Room Selection */}
          {selectedFloorsAndRooms.length > 0 && (
            <Box>
              {selectedFloorsAndRooms.map((floorRoom) => {
                const availableRooms = getAvailableRoomsForFloor(
                  floorRoom.floor,
                );

                return (
                  <Card
                    key={floorRoom.floor}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      bgcolor: disabled ? "action.hover" : "background.paper",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <BusinessIcon color="primary" fontSize="small" />
                          {floorRoom.floor}
                        </Typography>

                        {!disabled && (
                          <IconButton
                            size="small"
                            onClick={() => removeFloor(floorRoom.floor)}
                            disabled={disabled}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      {/* Room Selection with Chips in Input */}
                      <Autocomplete
                        multiple
                        options={availableRooms}
                        value={floorRoom.rooms || []}
                        onChange={(event, newValue) => {
                          updateRooms(floorRoom.floor, newValue as string[]);
                        }}
                        disabled={disabled}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Search and select rooms"
                            placeholder={
                              (floorRoom.rooms?.length ?? 0) === 0
                                ? "Search and select rooms..."
                                : ""
                            }
                            variant="outlined"
                            fullWidth
                            size="small"
                            InputProps={{
                              ...params.InputProps,
                              disabled: disabled,
                            }}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              {...getTagProps({ index })}
                              key={option}
                              label={option}
                              icon={<RoomIcon fontSize="small" />}
                              color="primary"
                              variant="filled"
                              size="small"
                              disabled={disabled}
                            />
                          ))
                        }
                        renderOption={(props, option) => {
                          const { key, ...rest } = props;
                          return (
                            <Box component="li" key={key} {...rest}>
                              <RoomIcon sx={{ mr: 1 }} fontSize="small" />
                              {option}
                            </Box>
                          );
                        }}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </>
      )}

      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
};

export default FloorRoomSelector;
