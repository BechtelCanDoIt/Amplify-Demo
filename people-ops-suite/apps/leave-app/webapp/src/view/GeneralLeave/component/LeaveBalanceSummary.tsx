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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  CircularProgress,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";

import { useCallback, useEffect, useState } from "react";

import { getLeaveEntitlement } from "@root/src/services/leaveService";
import { useAppSelector } from "@root/src/slices/store";
import {
  EmployeeLocation,
  LeaveEntitlement,
  LeaveLabel,
  LeavePolicy,
  LeaveTooltip,
  LeaveType,
} from "@root/src/types/types";

interface BalanceRow {
  label: string;
  tooltip?: string;
  entitled: number | null;
  consumed: number;
  periodLabel?: string;
}

const LEAVE_KEY_LABEL: Record<string, { label: string; tooltip?: string }> = {
  congesPayes: { label: LeaveLabel.CONGES_PAYES, tooltip: LeaveTooltip[LeaveType.CONGES_PAYES] },
  rtt: { label: LeaveLabel.RTT, tooltip: LeaveTooltip[LeaveType.RTT] },
  annual: { label: LeaveLabel.SPAIN_ANNUAL },
  casual: { label: LeaveLabel.SPAIN_CASUAL },
  sick: { label: LeaveLabel.SICK },
};

const LOCATION_KEYS: Record<string, string[]> = {
  [EmployeeLocation.FR]: ["congesPayes", "rtt", "sick"],
  [EmployeeLocation.ES]: ["annual", "casual", "sick"],
};

function formatPeriod(start?: string | null, end?: string | null): string | undefined {
  if (!start || !end) return undefined;
  return `${dayjs(start).format("MMM YYYY")} – ${dayjs(end).format("MMM YYYY")}`;
}

export default function LeaveBalanceSummary() {
  const theme = useTheme();
  const userInfo = useAppSelector((state) => state.user.userInfo);
  const location = userInfo?.location ?? null;
  const email = userInfo?.workEmail ?? "";

  const currentYear = dayjs().year();

  const [entitlement, setEntitlement] = useState<LeaveEntitlement | null>(null);
  const [rttEntitlement, setRttEntitlement] = useState<LeaveEntitlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    if (!email || !location) return;
    if (location !== EmployeeLocation.FR && location !== EmployeeLocation.ES) return;

    setLoading(true);
    setError(null);
    try {
      const fetches: Promise<void>[] = [
        getLeaveEntitlement(email).then((data) => {
          if (data.length > 0) setEntitlement(data[0]);
        }),
      ];

      if (location === EmployeeLocation.FR) {
        fetches.push(
          getLeaveEntitlement(email, [currentYear]).then((data) => {
            if (data.length > 0) setRttEntitlement(data[0]);
          }),
        );
      }

      await Promise.all(fetches);
    } catch (err: unknown) {
      console.error("Failed to fetch leave entitlement:", err);
      setError("Unable to load leave balance");
    } finally {
      setLoading(false);
    }
  }, [email, location, currentYear]);

  useEffect(() => {
    void fetchEntitlement();
  }, [fetchEntitlement]);

  if (!location || (location !== EmployeeLocation.FR && location !== EmployeeLocation.ES)) {
    return null;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" py={1}>
        {error}
      </Typography>
    );
  }

  if (!entitlement) return null;

  const keys = LOCATION_KEYS[location] ?? [];
  const rows: BalanceRow[] = keys
    .map((key) => {
      const meta = LEAVE_KEY_LABEL[key];
      if (!meta) return null;
      const policyKey = key as keyof LeavePolicy;
      const isRtt = key === "rtt";
      const isSick = key === "sick";
      const source = isRtt && rttEntitlement ? rttEntitlement : entitlement;
      const entitled = source.leavePolicy[policyKey] ?? null;
      const consumed = source.policyAdjustedLeave[policyKey] ?? 0;
      const currentYearPeriod = `${dayjs().startOf("year").format("MMM YYYY")} – ${dayjs().endOf("year").format("MMM YYYY")}`;
      const periodLabel =
        isRtt || isSick
          ? currentYearPeriod
          : formatPeriod(entitlement.periodStart, entitlement.periodEnd);
      return {
        label: meta.label,
        tooltip: meta.tooltip,
        entitled,
        consumed,
        periodLabel,
      } satisfies BalanceRow;
    })
    .filter(Boolean) as BalanceRow[];

  if (rows.length === 0) return null;

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.customBorder.territory.active}`,
        borderRadius: "12px",
        p: { xs: 2, md: 3 },
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
          Leave Balance
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={2}>
        {rows.map((row) => {
          const isUnlimited = row.entitled === null;
          const entitled = row.entitled ?? 0;
          const remaining = isUnlimited ? null : Math.max(entitled - row.consumed, 0);
          const progress = !isUnlimited && entitled > 0 ? (row.consumed / entitled) * 100 : 0;
          const isOverLimit = !isUnlimited && row.consumed > entitled && entitled > 0;

          const barColor = isOverLimit
            ? theme.palette.error.main
            : progress > 80
              ? theme.palette.warning.main
              : theme.palette.primary.main;

          return (
            <Box
              key={row.label}
              sx={{
                flex: 1,
                px: 2,
                py: 1.5,
                borderRadius: "10px",
                border: `1px solid ${theme.palette.customBorder.territory.active}`,
                backgroundColor: theme.palette.surface.territory.active,
              }}
            >
              <Stack direction="row" alignItems="center" gap={0.5} mb={1}>
                <Typography variant="body2" fontWeight={600}>
                  {row.label}
                </Typography>
                {row.tooltip && (
                  <Tooltip title={row.tooltip} arrow>
                    <InfoOutlinedIcon
                      sx={{
                        fontSize: 14,
                        color: theme.palette.customText.primary.p4.active,
                        cursor: "help",
                      }}
                    />
                  </Tooltip>
                )}
                {row.periodLabel && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.customText.primary.p4.active,
                      backgroundColor: theme.palette.background.paper,
                      px: 1,
                      py: 0.25,
                      borderRadius: "6px",
                      ml: "auto",
                    }}
                  >
                    {row.periodLabel}
                  </Typography>
                )}
              </Stack>

              {!isUnlimited && (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progress, 100)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    mb: 1,
                    backgroundColor: alpha(barColor, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      backgroundColor: barColor,
                    },
                  }}
                />
              )}

              <Typography
                variant="caption"
                sx={{
                  color: isOverLimit
                    ? theme.palette.error.main
                    : theme.palette.customText.primary.p3.active,
                  fontWeight: 500,
                }}
              >
                {isUnlimited
                  ? `${row.consumed} used · Unlimited`
                  : `${row.consumed} / ${entitled} used${remaining != null && remaining > 0 ? ` · ${remaining} left` : ""}`}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
