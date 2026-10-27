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

import { Alert, Box, Button, CircularProgress, Divider, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { useLocation } from "react-router";
import { humanizeHttpError } from "@api/http";
import { usePartnerInfo } from "../api/usePartners";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

// Ported from the source app's Resellers/ResellerDashboard/Profile/Profile.js
// — a fully read-only display of the reseller's submitted company/applicant/
// signatory details.
export default function ProfileTab({ companyId }: { companyId: string }) {
  const partnerInfo = usePartnerInfo(companyId);
  const location = useLocation();
  const data = partnerInfo.data?.[0];

  if (partnerInfo.isLoading) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2, p: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading profile…
        </Typography>
      </Stack>
    );
  }
  if (partnerInfo.isError || !data) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Couldn't load this partner's profile. {humanizeHttpError(partnerInfo.error)}</Alert>
      </Box>
    );
  }

  const viewDocument = () => {
    if (!data.fileName) return;
    const extension = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    const path = extension === "pdf" ? "/due-diligence/view-pdf" : IMAGE_EXTENSIONS.has(extension) ? "/due-diligence/view-image" : null;
    if (!path) return;
    // Profile is reachable from either perspective's rail, so unlike
    // Finance's/Legal's own viewers there's no single hardcoded answer here
    // — forward whichever one actually got the caller to this dashboard (see
    // useDueDiligenceNavigate). A new tab has no history entry to carry
    // `fromPerspective` on, so the URL has to say it instead.
    const fromPerspective = (location.state as { fromPerspective?: string } | null)?.fromPerspective;
    const from = fromPerspective ? `&from=${encodeURIComponent(fromPerspective)}` : "";
    window.open(
      `${path}?fileName=${encodeURIComponent(data.fileName)}&extension=${encodeURIComponent(extension)}${from}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Box sx={{ p: { xs: 2, lg: 4 }, maxWidth: 900 }}>
      <Stack spacing={2.5}>
        {data.fileName && (
          <Button variant="outlined" onClick={viewDocument} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            View Signed Document
          </Button>
        )}

        <Field label="Please provide the candidate's full business name, aliases, and other names" value={data.companyName} />
        <Field label="Tax ID Number" value={data.taxIdNumber} />
        <Field label="Country" value={data.country} />
        <Field label="State" value={data.state} />
        <Field label="City/Province" value={data.cityProvince} />
        <Field label="Street Address" value={data.streetAddress} />
        <Field label="Postal/Zip Code" value={data.postalZipCode} />

        <Typography variant="body2" sx={{ textAlign: "justify" }}>
          The information provided below will remain strictly confidential and used for the creditworthiness
          assessment only.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
          <Field label="Year of incorporation" value={data.yearOfIncorporation} />
          <Field label="No of current employees" value={data.noOfEmployees} />
          <Field label="No of current customers" value={data.noOfCustomers} />
        </Box>

        <Field
          label="Please provide any company brochures or website address for the candidate that explains its business and experience."
          value={data.websiteLink}
        />

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Applicant Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2.5}>
            <Field label="Applicant Name" value={data.applicantName} />
            <Field label="Applicant Designation" value={data.applicantDesignation} />
            <Field label="Applicant Email" value={data.applicantEmail} />
          </Stack>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Signatory Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2.5}>
            <Field label="Signatory Name" value={data.signatoryName} />
            <Field label="Signatory Designation" value={data.signatoryDesignation} />
            <Field label="Signatory Email" value={data.signatoryEmail} />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" sx={{ textAlign: "justify" }}>
        {label}
      </Typography>
      <TextField value={value ?? ""} size="small" disabled fullWidth />
    </Stack>
  );
}
