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

import { useState, type JSX } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { DownloadIcon, InfoIcon } from "@wso2/oxygen-ui-icons-react";
import { pdf } from "@react-pdf/renderer";
import PerspectiveHeader from "@components/perspective-header/PerspectiveHeader";
import { useCustomerSearch, formatCustomerAddress, type CustomerResult } from "@features/legal/api/useCustomerSearch";
import NdaPdfDocument, { NDA_ENTITY_CONFIGS, entityForCountry } from "./NdaPdfDocument";

// ── Static option lists ─────────────────────────────────────────────────────

// Only Mutual NDA — Standard is currently supported.
const NDA_TEMPLATE_LOCKED = "Mutual NDA \u2014 Standard";

// Derived from the keys of NDA_ENTITY_CONFIGS so the dropdown and the configs
// cannot drift apart. Each key corresponds to an official WSO2 NDA template docx.
// "WSO2 LLC — US" is labelled "WSO2 LLC (US)".
const WSO2_COMPANIES: { value: string; label: string }[] = Object.keys(NDA_ENTITY_CONFIGS).map((value) => ({
  value,
  label: value.replace(/ \u2014 (\w+)$/, " ($1)"),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function CustomerDetailRow({ label, value }: { label: string; value: string | null | undefined }): JSX.Element | null {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 64 }}>
        {label}
      </Typography>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function NdaPage(): JSX.Element {
  const [template] = useState(NDA_TEMPLATE_LOCKED);
  const [wso2Company, setWso2Company] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [customerInput, setCustomerInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  const { data: customerOptions = [], isFetching: searchingCustomers } = useCustomerSearch(customerInput);

  const allFilled = Boolean(template && wso2Company && selectedCustomer);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const customerName = selectedCustomer?.name ?? "";
      const customerAddress = formatCustomerAddress(selectedCustomer?.address ?? null);
      const now = new Date();
      const effectiveDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const blob = await pdf(
        <NdaPdfDocument
          template={template}
          wso2Company={wso2Company}
          customerName={customerName}
          customerAddress={customerAddress}
          effectiveDate={effectiveDate}
          notes=""
          year={now.getFullYear()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `NDA-${customerName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      setSnack({ open: true, severity: "success", message: "NDA downloaded successfully." });
    } catch {
      setSnack({ open: true, severity: "error", message: "Failed to generate PDF. Please try again." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <PerspectiveHeader
        title="NDA"
        subtitle="Non-disclosure agreement management and tracking."
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 480 }}>
        {/* NDA Template — locked to Mutual NDA Standard for now */}
        <TextField
          fullWidth
          label="NDA Template"
          value={template}
          disabled
        />

        {/* WSO2 Company — one option per official NDA template docx */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            select
            fullWidth
            label="WSO2 Company"
            value={wso2Company}
            onChange={(e) => setWso2Company(e.target.value)}
            helperText={
              selectedCustomer && !wso2Company
                ? `No WSO2 entity matches the billing country${
                    selectedCustomer.address?.billingCountry ? ` "${selectedCustomer.address.billingCountry}"` : ""
                  }. Choose one.`
                : undefined
            }
          >
            {WSO2_COMPANIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip
            title="Filled in from the customer's billing country when you select a customer. Check it, and change it if needed: the entity sets the governing law."
            placement="right"
          >
            <IconButton size="small" sx={{ color: "text.secondary", flexShrink: 0 }}>
              <InfoIcon size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Customer Name — server-side search via customer-search API */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Autocomplete
          fullWidth
          options={customerOptions}
          value={selectedCustomer}
          inputValue={customerInput}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_e, newValue) => {
            setSelectedCustomer(newValue);
            // The entity follows the customer's billing country, and stays editable.
            if (newValue) setWso2Company(entityForCountry(newValue.address?.billingCountry));
          }}
          onInputChange={(_e, newInput) => setCustomerInput(newInput)}
          filterOptions={(x) => x}
          loading={searchingCustomers}
          loadingText="Searching…"
          noOptionsText={
            customerInput.length < 2
              ? "Type to search customers"
              : "No customers found"
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Customer Name"
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchingCustomers && <CircularProgress size={16} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />
          <Tooltip
            title="Customer name and address are retrieved from Salesforce. Select the appropriate customer name from the dropdown, based on the Salesforce Account Name."
            placement="right"
          >
            <IconButton size="small" sx={{ color: "text.secondary", flexShrink: 0 }}>
              <InfoIcon size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Customer verification card — shown once a customer is selected */}
        {selectedCustomer && (
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 2,
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              backgroundColor: "action.hover",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Customer Details
              </Typography>
              <Tooltip title="Customer details are retrieved from Salesforce." placement="right">
                <IconButton size="small" sx={{ p: 0, color: "text.secondary" }}>
                  <InfoIcon size={14} />
                </IconButton>
              </Tooltip>
            </Box>
            <CustomerDetailRow label="Country" value={selectedCustomer.address?.billingCountry} />
            <CustomerDetailRow label="Address" value={formatCustomerAddress(selectedCustomer.address ?? null)} />
            <CustomerDetailRow label="Region" value={selectedCustomer.subRegion} />
            <CustomerDetailRow label="Industry" value={selectedCustomer.subIndustry} />
            <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: "0.75rem" }}>
              Please verify the customer name and address, as they will be sent to NDA exactly as shown here.
            </Alert>
          </Box>
        )}

        {/* Download button — only shown when all three dropdowns are filled */}
        {allFilled && (
          <Button
            variant="contained"
            startIcon={
              generating ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : (
                <DownloadIcon size={16} />
              )
            }
            disabled={generating}
            onClick={() => void handleDownload()}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            {generating ? "Generating PDF\u2026" : "Download NDA PDF"}
          </Button>
        )}
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
