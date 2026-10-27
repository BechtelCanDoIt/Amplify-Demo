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
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { humanizeHttpError } from "@api/http";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { useUpdatePromotionRequestJobBand } from "../api/usePromotionRequests";
import { usePromotionDesignations } from "../api/usePromotionDesignations";
import type { PromotionRequestFull } from "../api/types";

// Offered when the promotable roles lookup returns nothing, e.g. when the
// employee's career function is unknown.
const JOB_BANDS = Array.from({ length: 13 }, (_, i) => i + 1);

interface JobBandOption {
  band: number;
  role: string | null;
}

function jobBandLabel(band: number, role: string | null | undefined): string {
  return role ? `${role} (JB ${band})` : `JB ${band}`;
}

// Ports submittedRequests.tsx's own "Update Application Job Band" dialog —
// Active Promotion Requests tab only.
export default function EditJobBandDialog({
  request,
  onClose,
}: {
  request: PromotionRequestFull | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(request)} onClose={onClose} maxWidth="sm" fullWidth>
      {request && (
        // Keyed on the request id so the picker's own state (and the
        // "nothing to update"/"pick a different band" warning) resets
        // fresh whenever a different row opens this dialog, rather than
        // needing an effect to re-seed it — React's own recommended
        // pattern for "reset state when a prop changes".
        <EditJobBandDialogContent key={request.id} request={request} onClose={onClose} />
      )}
    </Dialog>
  );
}

function EditJobBandDialogContent({
  request,
  onClose,
}: {
  request: PromotionRequestFull;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<JobBandOption | null>(
    request.nextJobBand != null ? { band: request.nextJobBand, role: request.promotedJobRole } : null,
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmationContent | null>(null);
  const update = useUpdatePromotionRequestJobBand();
  const designations = usePromotionDesignations(request.id, true);

  // One option per designation: a band can have more than one title in a
  // career function.
  const options = useMemo<JobBandOption[]>(() => {
    const roles = designations.data?.roles ?? [];
    const fromApi: JobBandOption[] = roles
      .filter((r): r is typeof r & { jobBand: number } => r.jobBand != null)
      .map((r) => ({ band: r.jobBand, role: r.designation }));
    if (fromApi.length === 0) {
      return JOB_BANDS.filter((band) => band > request.currentJobBand).map((band) => ({
        band,
        role: band === request.nextJobBand ? request.promotedJobRole : null,
      }));
    }
    // The saved band and role stay selectable even when the lookup no longer returns them.
    if (
      request.nextJobBand != null &&
      !fromApi.some((o) => o.band === request.nextJobBand && o.role === request.promotedJobRole)
    ) {
      fromApi.push({ band: request.nextJobBand, role: request.promotedJobRole });
    }
    return fromApi.sort((a, b) => a.band - b.band || (a.role ?? "").localeCompare(b.role ?? ""));
  }, [designations.data, request.currentJobBand, request.nextJobBand, request.promotedJobRole]);

  const handleSave = () => {
    if (selected == null) {
      setWarning("Nothing to update");
      return;
    }
    if (selected.band === request.nextJobBand && selected.role === request.promotedJobRole) {
      setWarning("Please select a different job band or role than the current one.");
      return;
    }
    setConfirm({
      title: "Do you want to update this promotion request?",
      text: "The recommended job band for this request will change.",
      confirmLabel: "Yes",
      confirmAction: () => {
        // Stays open (rather than closing immediately) until the mutation
        // actually resolves — closing right away would unmount this content
        // before a failed PATCH's error had anywhere to render, silently
        // telling the user it worked when it didn't.
        update.mutate(
          {
            id: request.id,
            promotingJobBand: selected.band,
            ...(selected.role != null && { promotedJobRole: selected.role }),
          },
          { onSuccess: onClose },
        );
      },
    });
  };

  return (
    <>
      <ConfirmationDialog content={confirm} onClose={() => setConfirm(null)} />
      <DialogTitle>Update Application Job Band</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Current Job Band</Typography>
            <TextField
              size="small"
              disabled
              fullWidth
              value={jobBandLabel(request.currentJobBand, request.currentJobRole)}
            />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Recommended Job Band *</Typography>
            <Autocomplete
              size="small"
              options={options}
              getOptionLabel={(option) => jobBandLabel(option.band, option.role)}
              isOptionEqualToValue={(option, value) => option.band === value.band && option.role === value.role}
              value={selected}
              onChange={(_e, value) => setSelected(value)}
              loading={designations.isLoading}
              disabled={designations.isLoading}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
        </Grid>
        {designations.isError && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Couldn&apos;t load the job roles, so only job bands are listed. {humanizeHttpError(designations.error)}
          </Alert>
        )}
        {warning && (
          <Typography variant="caption" sx={{ display: "block", color: "warning.main", mt: 1.5 }}>
            {warning}
          </Typography>
        )}
        {update.isError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {humanizeHttpError(update.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={update.isPending || designations.isLoading}
        >
          Save
        </Button>
      </DialogActions>
    </>
  );
}
