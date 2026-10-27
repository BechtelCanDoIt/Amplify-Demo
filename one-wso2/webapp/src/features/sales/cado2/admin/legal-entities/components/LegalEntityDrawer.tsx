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

import { useEffect, type JSX } from "react";
import { Controller, useForm, type RegisterOptions } from "react-hook-form";
import type { ReactNode } from "react";
import { Box, Button, Divider, Drawer, FormControlLabel, IconButton, Stack, Switch, TextField, Typography } from "@wso2/oxygen-ui";
import { BadgeCheckIcon, LandmarkIcon, MapPinIcon, ToggleRightIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import {
  emptyLegalEntityForm,
  toFormValues,
  type LegalEntity,
  type LegalEntityFormValues,
} from "@features/sales/cado2/admin/legal-entities/api/legalEntityTypes";

interface LegalEntityDrawerProps {
  /** Whether the drawer is open. */
  readonly open: boolean;
  /** The entity being edited, or null to add a new one. */
  readonly entity: LegalEntity | null;
  /** Called with the form values on Save. */
  readonly onSave: (values: LegalEntityFormValues) => void;
  readonly onClose: () => void;
  /** True while the save request is in flight. */
  readonly saving: boolean;
  /** The save error to show, if the last save failed. */
  readonly saveError: unknown;
}

// Mirrors the backend rule, so the user sees the problem before saving.
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;

type FieldName = Exclude<keyof LegalEntityFormValues, "isActive">;

type Section = "identity" | "address" | "registration";

/** Field definitions in display order, with the backend's length limits; `half` fields share a row. */
const FIELDS: readonly { name: FieldName; label: string; required?: boolean; max: number; section: Section; half?: boolean }[] = [
  { name: "code", label: "Code", required: true, max: 32, section: "identity" },
  { name: "name", label: "Legal name", required: true, max: 255, section: "identity" },
  { name: "addressLine1", label: "Address line 1", required: true, max: 255, section: "address" },
  { name: "addressLine2", label: "Address line 2", max: 255, section: "address" },
  { name: "city", label: "City", required: true, max: 100, section: "address", half: true },
  { name: "stateProvince", label: "State / province", max: 100, section: "address", half: true },
  { name: "postalCode", label: "Postal code", max: 20, section: "address", half: true },
  { name: "country", label: "Country", required: true, max: 100, section: "address", half: true },
  { name: "taxId", label: "Tax ID", max: 50, section: "registration", half: true },
  { name: "registrationNumber", label: "Registration number", max: 50, section: "registration", half: true },
  { name: "phone", label: "Phone", max: 50, section: "registration" },
];

const SECTIONS: readonly { key: Section; title: string; icon: ReactNode }[] = [
  { key: "identity", title: "Identity", icon: <LandmarkIcon size={16} /> },
  { key: "address", title: "Registered Address", icon: <MapPinIcon size={16} /> },
  { key: "registration", title: "Registration", icon: <BadgeCheckIcon size={16} /> },
];

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }): JSX.Element {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 1.5 }}>
      <Box aria-hidden sx={{ width: 26, height: 26, borderRadius: 1, display: "grid", placeItems: "center", color: "primary.main", bgcolor: "action.selected" }}>
        {icon}
      </Box>
      <Typography variant="overline" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
        {title}
      </Typography>
    </Stack>
  );
}

function rulesFor(field: (typeof FIELDS)[number]): RegisterOptions<LegalEntityFormValues, FieldName> {
  return {
    validate: (raw) => {
      const value = String(raw ?? "").trim();
      if (field.required && !value) return `${field.label} is required`;
      if (value.length > field.max) return `${field.label} must be at most ${field.max} characters`;
      if (field.name === "code" && value && !CODE_PATTERN.test(value)) {
        return "Use 2–32 upper-case letters, digits or underscores, starting with a letter (e.g. WSO2_LLC)";
      }
      return true;
    },
  };
}

/**
 * Side panel to add or edit a legal entity. The code is fixed
 * once created, because quotes will refer to it.
 */
export default function LegalEntityDrawer({
  open,
  entity,
  onSave,
  onClose,
  saving,
  saveError,
}: LegalEntityDrawerProps): JSX.Element {
  const isEdit = entity !== null;
  const { control, handleSubmit, reset } = useForm<LegalEntityFormValues>({
    defaultValues: emptyLegalEntityForm,
    mode: "onTouched",
  });

  // Load the entity (or a blank form) each time the drawer opens.
  useEffect(() => {
    if (open) reset(entity ? toFormValues(entity) : emptyLegalEntityForm);
  }, [open, entity, reset]);

  return (
    <Drawer anchor="right" open={open} onClose={saving ? undefined : onClose}>
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit(onSave)}
        sx={{ width: { xs: "100vw", sm: 520 }, height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 3, py: 2.5 }}>
          <Box aria-hidden sx={{ width: 36, height: 36, borderRadius: 1.5, display: "grid", placeItems: "center", color: "primary.main", bgcolor: "action.selected" }}>
            <LandmarkIcon size={20} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {isEdit ? `Edit ${entity.code}` : "Add legal entity"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              A WSO2 company quotes can be issued from
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} disabled={saving} size="small">
            <XIcon size={18} />
          </IconButton>
        </Stack>
        <Divider />

        <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flexGrow: 1 }}>
          {saveError ? (
            <ErrorNotice error={saveError} sx={{ mb: 2 }}>
              Couldn&apos;t save.
            </ErrorNotice>
          ) : null}
          <Stack spacing={3}>
            {SECTIONS.map((section) => (
              <Box key={section.key} component="section" aria-label={section.title}>
                <SectionHeading icon={section.icon} title={section.title} />
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 2 }}>
                  {FIELDS.filter((f) => f.section === section.key).map((field) => (
                    <Box key={field.name} sx={{ gridColumn: field.half ? "span 1" : "1 / -1" }}>
                      <Controller
                        name={field.name}
                        control={control}
                        rules={rulesFor(field)}
                        render={({ field: input, fieldState }) => (
                          <TextField
                            {...input}
                            label={field.label}
                            required={field.required}
                            disabled={saving || (isEdit && field.name === "code")}
                            error={Boolean(fieldState.error)}
                            helperText={
                              fieldState.error?.message ??
                              (isEdit && field.name === "code" ? "The code can't be changed after creation." : undefined)
                            }
                            size="small"
                            fullWidth
                          />
                        )}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
            <Box component="section" aria-label="Availability">
              <SectionHeading icon={<ToggleRightIcon size={16} />} title="Availability" />
              <Controller
                name="isActive"
                control={control}
                render={({ field: input }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={input.value}
                        onChange={(_, checked) => input.onChange(checked)}
                        disabled={saving}
                        slotProps={{ input: { role: "switch" } }}
                      />
                    }
                    label="Active (offered on new quotes)"
                  />
                )}
              />
            </Box>
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
