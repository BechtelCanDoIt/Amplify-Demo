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

import { useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import VirtualizedListbox from "@components/virtualized-listbox/VirtualizedListbox";
import type { SubscriptionEmployee } from "../api/subscriptionTypes";
import { useSubscriptionEmployees } from "../api/useSubscriptionData";

// Pick the employee an admin is acting for.
//
// Not People Ops' EmployeeEmailPicker, though the two look alike. That one
// reads people-app's /employees/basic-info, which is admin-gated by a DIFFERENT
// backend and returns active employees only. This roster comes from the
// subscription service's own /employees, which the subscription admin groups
// authorize and which deliberately includes MARKED LEAVERS — someone working
// out their notice still commutes and still eats, and their subscription still
// has to be closed before they go. Pointing this screen at the other endpoint
// would quietly drop exactly the people whose subscriptions need attention.
//
// The whole roster arrives in one call, so filtering is local and instant;
// there is no search endpoint to debounce against.

export default function SubscriptionEmployeePicker({
  value,
  onChange,
  enabled,
  disabled,
}: {
  value: SubscriptionEmployee | null;
  onChange: (employee: SubscriptionEmployee | null) => void;
  /** False until the caller is known to be an admin — /employees 403s otherwise. */
  enabled: boolean;
  disabled?: boolean;
}) {
  // The roster is the heaviest request this screen makes (every active +
  // marked-leaver employee) and the one thing on this page an admin might
  // never actually need — they may arrive, glance at the page, and leave
  // without picking anyone. So it is fetched on the first OPEN of the
  // dropdown, not the moment the gate confirms admin access. `hasOpened`
  // latches true and never resets; the 10-minute staleTime on the query
  // means a second open reuses the cached roster rather than refetching.
  const [hasOpened, setHasOpened] = useState(false);
  const employees = useSubscriptionEmployees(enabled && hasOpened);

  // Sorted by name rather than left in the service's order, which is the
  // GraphQL query's and means nothing to a reader scrolling the list.
  const options = useMemo(() => {
    const rows = [...(employees.data ?? [])];
    rows.sort((a, b) =>
      fullName(a).localeCompare(fullName(b), undefined, { sensitivity: "base" }),
    );
    return rows;
  }, [employees.data]);

  return (
    <Autocomplete<SubscriptionEmployee, false, false, false>
      options={options}
      value={value}
      onChange={(_, option) => onChange(option)}
      onOpen={() => setHasOpened(true)}
      // NOT `|| employees.isLoading`: the fetch only starts once the field is
      // opened, so disabling on isLoading would fight the very click that
      // triggers it — MUI closes an Autocomplete's popup the instant it goes
      // disabled, which would slam the dropdown shut the moment the query
      // flips to loading. The in-popup "Loading…" state below (`loading`)
      // carries the feedback instead, and the field stays open throughout.
      disabled={disabled}
      loading={employees.isLoading}
      loadingText="Loading employees…"
      // MUI's default "No options" reads as if the picker is broken (or
      // still loading). It only shows once loading is done — so a failed
      // roster fetch (network blip, the gateway timing out) would otherwise
      // render identically to "no employees matched", with no way to tell
      // the admin their search is broken rather than genuinely empty, and no
      // way to retry short of leaving the page. `noOptionsText` accepts a
      // node, not just a string, so the error case gets its own message and
      // an actual retry action instead of settling for text alone.
      noOptionsText={
        employees.isError ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="body2" color="text.secondary">
              Couldn&apos;t load employees.
            </Typography>
            <Button size="small" onClick={() => void employees.refetch()}>
              Retry
            </Button>
          </Stack>
        ) : (
          "No employees found"
        )
      }
      autoHighlight
      size="small"
      sx={{ maxWidth: 460 }}
      // Both halves are searchable: people look for a colleague by name and by
      // address, and matching only one of them fails half the time.
      getOptionLabel={(option) => `${fullName(option)} <${option.workEmail}>`}
      isOptionEqualToValue={(a, b) =>
        a.workEmail.toLowerCase() === b.workEmail.toLowerCase()
      }
      // Without this, every matching row mounts as a real DOM node — for the
      // full company roster that's the "click it and it hangs" feeling: the
      // main thread blocks committing hundreds of avatar rows at once, so
      // nothing paints (not even the loading state) until the roster is
      // fully in the DOM. VirtualizedListbox (react-window under the hood,
      // ported from digiops-hr's leave microapp — see its own comment) keeps
      // only the ~8 visible rows mounted regardless of roster size. Same
      // pairing LeaveApplyPage's "Notify people" picker uses against the same
      // scale of directory. `disableListWrap` is required alongside it — MUI
      // otherwise wraps each option for keyboard nav in a way that assumes a
      // plain (non-virtualized) list.
      disableListWrap
      ListboxComponent={VirtualizedListbox}
      renderOption={(props, option) => {
        // React requires the key as a prop, not inside a spread.
        const { key, ...liProps } = props as typeof props & { key: string };
        return (
          <Box
            component="li"
            key={key}
            {...liProps}
            sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.75 }}
          >
            <Avatar
              src={option.employeeThumbnail ?? undefined}
              // people-app serves some thumbnails from Google's avatar CDN,
              // which 403s a request carrying our referrer.
              slotProps={{ img: { referrerPolicy: "no-referrer" } }}
              sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, flexShrink: 0 }}
            >
              {initials(option)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, ...ELLIPSIS }}>
                {fullName(option)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", ...ELLIPSIS }}
              >
                {option.workEmail}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Employee"
          placeholder="Search by name or email"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {employees.isLoading ? <CircularProgress size={14} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

const ELLIPSIS = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

export function fullName(employee: SubscriptionEmployee): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
}

export function initials(employee: SubscriptionEmployee): string {
  const first = employee.firstName?.[0] ?? "";
  const last = employee.lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}
