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

import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const PinEntry: React.FC = () => {
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;
    setIsValidating(true);
    navigate(`/admin-panel?tab=active-visits&visitVerificationCode=${pin}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ maxWidth: 520, mx: "auto", py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the 6-digit PIN provided to the visitor.
        </Typography>
        <TextField
          fullWidth
          label="Enter 6-digit PIN"
          value={pin}
          onChange={handlePinChange}
          placeholder="000000"
          inputProps={{
            maxLength: 6,
            style: {
              fontSize: "1.5rem",
              textAlign: "center",
              letterSpacing: "0.5rem",
            },
          }}
          sx={{ mb: 3 }}
          disabled={isValidating}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handlePinSubmit();
            }
          }}
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handlePinSubmit}
          disabled={pin.length !== 6 || isValidating}
          sx={{ py: 1.5 }}
        >
          {isValidating ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Verify PIN"
          )}
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2, textAlign: "center" }}
        >
          The PIN is shared with the visitor via SMS.
        </Typography>
      </Box>
    </Container>
  );
};

export default PinEntry;
