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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { PhoneNumberUtil } from "google-libphonenumber";
import { MuiTelInput } from "mui-tel-input";
import { hash } from "../../utils/utils";
import { bridgeLog } from "../../microapp-bridge";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { useDialog } from "../../contexts/DialogContext";
import { useUserStore } from "../../stores/user/user";
import { useGet, useAPI } from "../../services/useApi";
import { Endpoints } from "../../services/endpoints";
import FloorRoomSelector from "../../components/CreateVisit/FloorRoomSelector";
import BackgroundLoader from "../../components/Common/BackgroundLoader";
import {
  Employee,
  FloorRoom,
  AddVisitorPayload,
  AddVisitPayload,
  VisitorStatus,
  VisitorDetail,
} from "../../types/types";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Autocomplete from "@mui/material/Autocomplete";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BusinessIcon from "@mui/icons-material/Business";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

const phoneUtil = PhoneNumberUtil.getInstance();

const defaultVisitor: VisitorDetail = {
  name: "",
  contactNumber: undefined,
  countryCode: "+94",
  emailAddress: undefined,
  status: VisitorStatus.Draft,
};

const generateTimeSlots = (startHour = 8, endHour = 23, stepMinutes = 15) => {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
    }
  }
  const final = `${endHour.toString().padStart(2, "0")}:00`;
  if (!slots.includes(final)) slots.push(final);
  return slots;
};

const getDurationLabel = (
  entry: string | null,
  departure: string | null,
): string => {
  if (!entry || !departure) return "";
  const [eh, em] = entry.split(":").map(Number);
  const [dh, dm] = departure.split(":").map(Number);
  const diff = dh * 60 + dm - (eh * 60 + em);
  if (diff <= 0) return "";
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} mins`;
};

const normalizeContact = (raw: string) => `+${raw.replace(/\D/g, "")}`;

const handlePaste = (text: string): string => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match?.[0]?.trim() || "";
};

// Shared styles
const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    fontSize: "0.875rem",
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
  },
  "& input": {
    textAlign: "left",
    "&::-webkit-date-and-time-value": {
      textAlign: "left",
    },
    "&::-webkit-datetime-edit": {
      textAlign: "left",
    },
  },
};

function CreateVisit() {
  const { showSnackbar } = useSnackbar();
  const { showConfirmation } = useDialog();
  const user = useUserStore((state) => state.user);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [whoTheyMeet, setWhoTheyMeet] = useState("");
  const [whoTheyMeetName, setWhoTheyMeetName] = useState("");
  const [purposeOfVisit, setPurposeOfVisit] = useState("");
  const [accessibleLocations, setAccessibleLocations] = useState<FloorRoom[]>(
    [],
  );
  const [visitDate, setVisitDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [timeOfEntry, setTimeOfEntry] = useState("");
  const [timeOfDeparture, setTimeOfDeparture] = useState("");
  const [visitors, setVisitors] = useState<VisitorDetail[]>([
    { ...defaultVisitor },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState("");

  // Validation error states
  interface FormErrors {
    visitDate?: string;
    timeOfEntry?: string;
    timeOfDeparture?: string;
  }
  interface VisitorErrors {
    name?: string;
    emailAddress?: string;
    contactNumber?: string;
  }
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [visitorErrors, setVisitorErrors] = useState<
    Record<number, VisitorErrors>
  >({});

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const clearFormError = (field: keyof FormErrors) => {
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearVisitorError = (index: number, field: keyof VisitorErrors) => {
    setVisitorErrors((prev) => {
      const next = { ...prev };
      if (next[index]) {
        const updated = { ...next[index] };
        delete updated[field];
        next[index] = updated;
      }
      return next;
    });
  };

  const validateVisitorForSubmit = (
    visitor: VisitorDetail,
    index: number,
  ): boolean => {
    const errors: VisitorErrors = {};
    let valid = true;

    // Name required
    if (!visitor.name?.trim()) {
      errors.name = "Name is required";
      valid = false;
    }

    // At least one of email or contact required
    const hasEmail = !!visitor.emailAddress?.trim();
    const hasContact = !!visitor.contactNumber?.trim();
    if (!hasEmail && !hasContact) {
      errors.emailAddress = "Email address or contact number is required";
      errors.contactNumber = "Email address or contact number is required";
      valid = false;
    }

    // Email format
    if (hasEmail && !emailRegex.test(visitor.emailAddress!.trim())) {
      errors.emailAddress = "Invalid email format";
      valid = false;
    }

    // Email uniqueness
    if (hasEmail) {
      const duplicates = visitors.filter(
        (v, i) =>
          i !== index &&
          v.emailAddress?.trim().toLowerCase() ===
            visitor.emailAddress!.trim().toLowerCase(),
      );
      if (duplicates.length > 0) {
        errors.emailAddress = "Email must be unique across visitors";
        valid = false;
      }
    }

    // Contact number validation using google-libphonenumber
    if (hasContact) {
      const contact = visitor.contactNumber!.trim();
      if (!contact.startsWith("+")) {
        errors.contactNumber =
          "Phone number must start with country code (e.g. +94)";
        valid = false;
      } else {
        try {
          const parsed = phoneUtil.parseAndKeepRawInput(contact);
          if (!phoneUtil.isValidNumber(parsed)) {
            errors.contactNumber =
              "Invalid phone number for the selected country";
            valid = false;
          } else if (
            visitor.countryCode &&
            visitor.countryCode !== `+${parsed.getCountryCode()}`
          ) {
            errors.contactNumber = `Phone number doesn't match selected country code (${visitor.countryCode})`;
            valid = false;
          }
        } catch {
          errors.contactNumber = "Invalid phone number format";
          valid = false;
        }
      }
    }

    setVisitorErrors((prev) => ({ ...prev, [index]: errors }));
    return valid;
  };

  const validateFormForSubmit = (): boolean => {
    const errors: FormErrors = {};
    let valid = true;

    // Visit date required
    if (!visitDate) {
      errors.visitDate = "Visit date is required";
      valid = false;
    } else if (!dayjs(visitDate).isSameOrAfter(dayjs(), "day")) {
      errors.visitDate = "Visit date cannot be in the past";
      valid = false;
    }

    // Time of entry: if today, cannot be in the past
    if (visitDate && timeOfEntry) {
      const entryDateTime = dayjs(`${visitDate} ${timeOfEntry}`);
      if (entryDateTime.isBefore(dayjs().subtract(1, "minute"))) {
        errors.timeOfEntry = "Cannot be in the past";
        valid = false;
      }
    }

    // Time of departure: must be after entry
    if (visitDate && timeOfEntry && timeOfDeparture) {
      const entryDateTime = dayjs(`${visitDate} ${timeOfEntry}`);
      const departureDateTime = dayjs(`${visitDate} ${timeOfDeparture}`);
      if (!departureDateTime.isAfter(entryDateTime)) {
        errors.timeOfDeparture = "Must be after entry time";
        valid = false;
      }
    }

    setFormErrors(errors);
    return valid;
  };

  // Employee search
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  // Pre-populate "Whom They Meet" with the logged-in user's details
  useEffect(() => {
    if (user?.email && !whoTheyMeet) {
      const nameParts = (user.name || "").trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || user.email;
      const lastName = nameParts.slice(1).join(" ");
      const fullName = user.name?.trim() || user.email;

      setWhoTheyMeet(user.email);
      setWhoTheyMeetName(fullName);
      setInputValue(fullName);
      setSelectedEmployee({
        firstName,
        lastName,
        workEmail: user.email,
        employeeThumbnail: null,
      });

      // Fetch employee record to get the thumbnail
      (async () => {
        try {
          const { default: apiClient } =
            await import("../../services/apiClient");
          const endpoint = Endpoints.getEmployees({
            search: user.email,
            offset: 0,
            limit: 1,
          });
          const res = await apiClient.get(
            `${endpoint.baseUrl}${endpoint.path}`,
          );
          const employees: Employee[] = res.data;
          const match = employees?.find(
            (emp) => emp.workEmail.toLowerCase() === user.email.toLowerCase(),
          );
          if (match) {
            setSelectedEmployee(match);
            const empFullName =
              `${match.firstName || ""} ${match.lastName || ""}`.trim();
            if (empFullName) {
              setWhoTheyMeetName(empFullName);
              setInputValue(empFullName);
            }
          } else {
            bridgeLog(
              `CreateVisit: no employee match found for ${user.email}`,
              "warn",
            );
          }
        } catch (err) {
          // Thumbnail fetch failed silently — fallback already set above
          bridgeLog(`CreateVisit: employee lookup failed - ${err}`, "error");
        }
      })();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitorDebounceRefs = useRef<
    Record<number, ReturnType<typeof setTimeout> | null>
  >({});

  // Employee search query
  const { data: employeesData, isLoading: isLoadingEmployees } = useGet<
    Employee[]
  >(
    ["employees", employeeSearch],
    Endpoints.getEmployees({
      search: employeeSearch || undefined,
      offset: 0,
      limit: 20,
    }),
    undefined,
    true,
  );

  // Pin the logged-in user as the first option once the field is cleared
  const selfEmployeeOption: Employee | null = useMemo(() => {
    if (!user?.email) return null;
    const nameParts = (user.name || "").trim().split(/\s+/).filter(Boolean);
    return {
      firstName: nameParts[0] || user.email,
      lastName: nameParts.slice(1).join(" "),
      workEmail: user.email,
      employeeThumbnail: null,
    };
  }, [user]);

  const employees = useMemo(() => {
    const base = employeesData || [];
    if (inputValue.trim() || !selfEmployeeOption) return base;
    const filteredBase = base.filter(
      (emp) =>
        emp.workEmail.toLowerCase() !==
        selfEmployeeOption.workEmail.toLowerCase(),
    );
    return [selfEmployeeOption, ...filteredBase];
  }, [employeesData, inputValue, selfEmployeeOption]);

  // Add visitor mutation
  const addVisitorMutation = useAPI<any, AddVisitorPayload>(
    Endpoints.addVisitor(),
    "POST",
  );

  // Add visit mutation
  const addVisitMutation = useAPI<any, AddVisitPayload>(
    Endpoints.addVisit(),
    "POST",
  );

  // Cleanup debounce timers
  useEffect(() => {
    const currentRefs = visitorDebounceRefs.current;
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      Object.values(currentRefs).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  const entryHour = timeOfEntry ? Number(timeOfEntry.split(":")[0]) : null;
  const timeSlots = useMemo(
    () => generateTimeSlots(entryHour ?? 8, 23, 15),
    [entryHour],
  );

  const isLocked = useMemo(
    () => visitors.some((v) => v.status === VisitorStatus.Completed),
    [visitors],
  );

  const hasDraftVisitors = useMemo(
    () => visitors.some((v) => v.status === VisitorStatus.Draft),
    [visitors],
  );

  const canAddMoreVisitors = useMemo(() => {
    if (visitors.length === 0) return false;
    const last = visitors[visitors.length - 1];
    return isLocked && last.status !== VisitorStatus.Draft;
  }, [visitors, isLocked]);

  const debouncedEmployeeSearch = useCallback((term: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setEmployeeSearch(term.trim());
    }, 500);
  }, []);

  const fetchVisitorByEmailOrContact = useCallback(
    async (emailOrContact: string, index: number) => {
      if (!emailOrContact?.trim()) return;
      try {
        const idHash = await hash(emailOrContact);
        const { default: apiClient } = await import("../../services/apiClient");
        const endpoint = Endpoints.getVisitor(idHash);
        const res = await apiClient.get(`${endpoint.baseUrl}${endpoint.path}`);
        const visitor = res.data;

        if (visitor) {
          const fetched: VisitorDetail = {
            name: `${visitor.firstName || ""} ${visitor.lastName || ""}`.trim(),
            contactNumber: visitor.contactNumber || "",
            countryCode: "+94",
            emailAddress: visitor.email || "",
            status: VisitorStatus.Draft,
          };
          setVisitors((prev) => {
            const updated = [...prev];
            updated[index] = fetched;
            return updated;
          });
        }
      } catch {
        // Visitor not found, that's okay
      }
    },
    [],
  );

  const updateVisitor = useCallback(
    (index: number, field: keyof VisitorDetail, value: any) => {
      setVisitors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [],
  );

  const removeVisitor = useCallback((index: number) => {
    setVisitors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addNewVisitorBlock = useCallback(() => {
    setVisitors((prev) => [...prev, { ...defaultVisitor }]);
  }, []);

  const submitVisitor = useCallback(
    async (index: number) => {
      const visitor = visitors[index];
      if (!visitor || visitor.status !== VisitorStatus.Draft) return;

      // Validate form-level fields
      const formValid = validateFormForSubmit();
      // Validate visitor-level fields
      const visitorValid = validateVisitorForSubmit(visitor, index);

      if (!formValid || !visitorValid) {
        showSnackbar({
          message: "Please fix the errors before submitting",
          variant: "error",
        });
        return;
      }

      showConfirmation(
        "Submit Visitor",
        "Do you want to submit this visitor? This will add the visitor's information to the system.",
        async () => {
          setIsSubmitting(true);
          setSubmittingMessage("Processing Visitor");

          try {
            const idInput =
              visitor.emailAddress?.trim() ||
              (visitor.contactNumber
                ? normalizeContact(visitor.contactNumber)
                : undefined);
            if (!idInput) return;
            const hashedId = await hash(idInput);

            const visitUUID = uuidv4();
            let qrCodeByteArray: number[] | undefined;

            try {
              const qrCodeBase64 = await QRCode.toDataURL(visitUUID, {
                width: 300,
                margin: 2,
                color: { dark: "#000000", light: "#ffffff" },
                errorCorrectionLevel: "H",
              });
              const base64Data = qrCodeBase64.split(",")[1];
              const binaryString = window.atob(base64Data);
              qrCodeByteArray = Array.from(binaryString, (char) =>
                char.charCodeAt(0),
              );
            } catch (err) {
              console.error("QR generation failed:", err);
            }

            const visitorName = visitor.name?.trim() || "";
            let contactNumber: string | undefined;
            if (visitor.contactNumber) {
              try {
                const parsed = phoneUtil.parseAndKeepRawInput(
                  visitor.contactNumber,
                );
                const nationalNumber =
                  parsed.getNationalNumber()?.toString() || undefined;
                contactNumber = nationalNumber
                  ? `${visitor.countryCode}${nationalNumber}`
                  : normalizeContact(visitor.contactNumber);
              } catch {
                contactNumber = normalizeContact(visitor.contactNumber);
              }
            }

            // Add visitor
            const addVisitorPayload: AddVisitorPayload = {
              idHash: hashedId,
              firstName: visitorName.split(" ")[0] || undefined,
              lastName: visitorName.split(" ").slice(1).join(" ") || undefined,
            };
            if (contactNumber) addVisitorPayload.contactNumber = contactNumber;
            if (visitor.emailAddress)
              addVisitorPayload.email = visitor.emailAddress;

            await addVisitorMutation.mutateAsync(addVisitorPayload);

            // Add visit
            let timeOfEntryUTC: string | undefined;
            if (visitDate && timeOfEntry) {
              timeOfEntryUTC = dayjs(`${visitDate} ${timeOfEntry}`)
                .utc()
                .toISOString();
            }
            let timeOfDepartureUTC: string | undefined;
            if (visitDate && timeOfDeparture) {
              timeOfDepartureUTC = dayjs(`${visitDate} ${timeOfDeparture}`)
                .utc()
                .toISOString();
            }

            const addVisitPayload: AddVisitPayload = {
              uuid: visitUUID,
              qrCode: qrCodeByteArray,
              visitDate,
              timeOfEntry: timeOfEntryUTC,
              timeOfDeparture: timeOfDepartureUTC,
              visitorIdHash: hashedId,
              whomTheyMeet: whoTheyMeet || undefined,
              companyName: companyName || undefined,
              accessibleLocations: accessibleLocations.length
                ? accessibleLocations
                : undefined,
              purposeOfVisit: purposeOfVisit || undefined,
            };

            await addVisitMutation.mutateAsync(addVisitPayload);

            // Mark visitor as completed
            setVisitors((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: VisitorStatus.Completed,
              };
              return updated;
            });

            showSnackbar({
              message: "Visitor submitted successfully!",
              variant: "success",
            });
          } catch (err: any) {
            showSnackbar({
              message: err?.message || "Failed to submit visitor",
              variant: "error",
            });
          } finally {
            setIsSubmitting(false);
            setSubmittingMessage("");
          }
        },
        "Yes",
        "Cancel",
      );
    },
    [
      visitors,
      visitDate,
      timeOfEntry,
      timeOfDeparture,
      whoTheyMeet,
      companyName,
      accessibleLocations,
      purposeOfVisit,
      showConfirmation,
      showSnackbar,
      addVisitorMutation,
      addVisitMutation,
    ],
  );

  const resetForm = useCallback(() => {
    showConfirmation(
      "Complete Visit",
      "Visit details are already locked. No more changes allowed. Start a new visit?",
      () => {
        setCompanyName("");
        setPurposeOfVisit("");
        setAccessibleLocations([]);
        setVisitDate(dayjs().format("YYYY-MM-DD"));
        setTimeOfEntry("");
        setTimeOfDeparture("");
        setVisitors([{ ...defaultVisitor }]);
        setFormErrors({});
        setVisitorErrors({});

        // Pre-populate "Whom They Meet" with the logged-in user
        if (user?.email) {
          const nameParts = (user.name || "").trim().split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || user.email;
          const lastName = nameParts.slice(1).join(" ");
          const fullName = user.name?.trim() || user.email;

          setWhoTheyMeet(user.email);
          setWhoTheyMeetName(fullName);
          setInputValue(fullName);
          setSelectedEmployee({
            firstName,
            lastName,
            workEmail: user.email,
            employeeThumbnail: null,
          });

          (async () => {
            try {
              const { default: apiClient } =
                await import("../../services/apiClient");
              const endpoint = Endpoints.getEmployees({
                search: user.email,
                offset: 0,
                limit: 1,
              });
              const res = await apiClient.get(
                `${endpoint.baseUrl}${endpoint.path}`,
              );
              const employees: Employee[] = res.data;
              const match = employees?.find(
                (emp) =>
                  emp.workEmail.toLowerCase() === user.email.toLowerCase(),
              );
              if (match) {
                setSelectedEmployee(match);
                const empFullName =
                  `${match.firstName || ""} ${match.lastName || ""}`.trim();
                if (empFullName) {
                  setWhoTheyMeetName(empFullName);
                  setInputValue(empFullName);
                }
              } else {
                bridgeLog(
                  `CreateVisit.resetForm: no employee match found for ${user.email}`,
                  "warn",
                );
              }
            } catch (err) {
              bridgeLog(
                `CreateVisit.resetForm: employee lookup failed - ${err}`,
                "error",
              );
            }
          })();
        } else {
          setWhoTheyMeet("");
          setWhoTheyMeetName("");
          setSelectedEmployee(null);
          setInputValue("");
        }
      },
      "Yes",
      "Cancel",
    );
  }, [showConfirmation, user]);

  const today = dayjs().format("YYYY-MM-DD");

  return (
    <Box
      sx={{
        px: 2,
        pt: 2,
        pb: 12,
        overflowY: "auto",
        overflowX: "hidden",
        height: "100%",
        maxWidth: "100%",
      }}
    >
      {isSubmitting && <BackgroundLoader message={submittingMessage} />}

      {/* Visit Information */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Visit Information
          </Typography>
          {isLocked && <LockIcon fontSize="small" sx={{ color: "grey.500" }} />}
        </Box>

        {/* Whom They Meet */}
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            open={autocompleteOpen && !isLocked}
            onOpen={() => !isLocked && setAutocompleteOpen(true)}
            onClose={() => setAutocompleteOpen(false)}
            disablePortal
            options={employees}
            getOptionLabel={(option) => {
              if (typeof option === "string") {
                return whoTheyMeetName || option;
              }
              return `${option?.firstName || ""} ${option?.lastName || ""}`.trim();
            }}
            value={selectedEmployee}
            onChange={(_, newValue) => {
              if (isLocked) return;
              if (newValue === null) {
                setWhoTheyMeet("");
                setWhoTheyMeetName("");
                setSelectedEmployee(null);
                return;
              }
              if (typeof newValue === "object") {
                const fullName =
                  `${newValue.firstName || ""} ${newValue.lastName || ""}`.trim();
                setWhoTheyMeet(newValue.workEmail || "");
                setWhoTheyMeetName(fullName);
                setSelectedEmployee(newValue);
              }
            }}
            isOptionEqualToValue={(option, value) =>
              option.workEmail === value.workEmail
            }
            inputValue={inputValue}
            onInputChange={(event, newInputValue, reason) => {
              setInputValue(newInputValue);
              if (reason === "reset") return;
              const trimmed = newInputValue.trim();
              if (trimmed.length === 0) {
                debouncedEmployeeSearch("");
              } else if (trimmed.length >= 2) {
                debouncedEmployeeSearch(trimmed);
              }
            }}
            filterOptions={(x) => x}
            loading={isLoadingEmployees}
            autoHighlight
            disabled={isLocked}
            size="small"
            noOptionsText={
              inputValue.trim().length < 2
                ? "Type at least 2 characters to search"
                : isLoadingEmployees
                  ? "Searching..."
                  : "No employees found"
            }
            renderOption={(props, employee) => (
              <li
                {...props}
                key={employee.workEmail}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <Avatar
                  src={employee.employeeThumbnail ?? undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {employee.firstName?.charAt(0)?.toUpperCase() || "?"}
                </Avatar>
                <Box>
                  <Typography variant="body2" noWrap>
                    {`${employee.firstName} ${employee.lastName}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {employee.workEmail}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => {
              const thumbnail = selectedEmployee?.employeeThumbnail ?? null;
              let initial = "?";
              if (selectedEmployee) {
                initial = (
                  selectedEmployee.firstName?.charAt(0) || "?"
                ).toUpperCase();
              }

              return (
                <TextField
                  {...params}
                  label="Whom They Meet"
                  placeholder="Search by name or email..."
                  disabled={isLocked}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        {selectedEmployee && (
                          <InputAdornment position="start" sx={{ ml: 0.5 }}>
                            <Avatar
                              src={thumbnail ?? undefined}
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.75rem",
                              }}
                            >
                              {!thumbnail && initial}
                            </Avatar>
                          </InputAdornment>
                        )}
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {isLoadingEmployees && (
                          <InputAdornment position="end" sx={{ mr: 1 }}>
                            <CircularProgress size={18} />
                          </InputAdornment>
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData?.getData("text") || "";
                    const extractedEmail = handlePaste(pastedText);
                    const valueToUse = extractedEmail || pastedText.trim();
                    setInputValue(valueToUse);
                    if (valueToUse.length >= 2) {
                      debouncedEmployeeSearch(extractedEmail);
                    }
                  }}
                  sx={textFieldSx}
                />
              );
            }}
          />
        </Box>

        {/* Purpose of Visit */}
        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          label="Purpose of Visit"
          placeholder="Enter purpose of visit..."
          value={purposeOfVisit}
          onChange={(e) => setPurposeOfVisit(e.target.value)}
          disabled={isLocked}
          sx={textFieldSx}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Accessible Floors & Rooms */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
        >
          <BusinessIcon fontSize="small" color="primary" />
          Accessible Floors & Rooms
          {isLocked && <LockIcon fontSize="small" sx={{ color: "grey.500" }} />}
        </Typography>
        <FloorRoomSelector
          selectedFloorsAndRooms={accessibleLocations}
          onChange={(val) => !isLocked && setAccessibleLocations(val)}
          disabled={isLocked}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Schedule */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
        >
          <AccessTimeIcon fontSize="small" color="primary" />
          Schedule
          {isLocked && <LockIcon fontSize="small" sx={{ color: "grey.500" }} />}
        </Typography>

        <Stack spacing={2}>
          {/* Visit Date */}
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Visit Date"
            required
            value={visitDate}
            inputProps={{ min: today }}
            onChange={(e) => {
              if (isLocked) return;
              setVisitDate(e.target.value);
              clearFormError("visitDate");
            }}
            disabled={isLocked}
            InputLabelProps={{ shrink: true }}
            error={!!formErrors.visitDate}
            helperText={formErrors.visitDate}
            sx={textFieldSx}
          />

          {/* Entry Time */}
          <TextField
            fullWidth
            size="small"
            type="time"
            label="Expected Entry Time"
            value={timeOfEntry}
            onChange={(e) => {
              if (isLocked) return;
              setTimeOfEntry(e.target.value);
              setTimeOfDeparture("");
              clearFormError("timeOfEntry");
              clearFormError("timeOfDeparture");
            }}
            disabled={isLocked || !visitDate}
            InputLabelProps={{ shrink: true }}
            error={!!formErrors.timeOfEntry}
            helperText={formErrors.timeOfEntry}
            sx={textFieldSx}
          />

          {/* Departure Time */}
          <FormControl
            fullWidth
            size="small"
            error={!!formErrors.timeOfDeparture}
          >
            <InputLabel id="departure-time-label" shrink>
              Expected Departure Time
              {timeOfEntry && timeOfDeparture
                ? ` (${getDurationLabel(timeOfEntry, timeOfDeparture)})`
                : ""}
            </InputLabel>
            <Select
              labelId="departure-time-label"
              value={timeOfDeparture}
              onChange={(e) => {
                if (isLocked) return;
                setTimeOfDeparture(e.target.value as string);
                clearFormError("timeOfDeparture");
              }}
              disabled={isLocked || !timeOfEntry}
              displayEmpty
              notched
              label={`Expected Departure Time${timeOfEntry && timeOfDeparture ? ` (${getDurationLabel(timeOfEntry, timeOfDeparture)})` : ""}`}
              sx={{
                borderRadius: "12px",
                fontSize: "0.875rem",
                textAlign: "left",
                "& .MuiSelect-select": {
                  textAlign: "left",
                },
              }}
            >
              {timeSlots
                .filter((t) => !timeOfEntry || t > timeOfEntry)
                .map((slot) => {
                  const dur = getDurationLabel(timeOfEntry, slot);
                  return (
                    <MenuItem key={slot} value={slot}>
                      {slot} {dur ? `(${dur})` : ""}
                    </MenuItem>
                  );
                })}
            </Select>
            {formErrors.timeOfDeparture && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 1.75 }}
              >
                {formErrors.timeOfDeparture}
              </Typography>
            )}
          </FormControl>
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Visitors */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
          Visitors
        </Typography>

        {visitors.map((visitor, idx) => (
          <Card
            key={idx}
            variant="outlined"
            sx={{ mb: 3, backgroundColor: "inherit" }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PersonOutlineIcon color="primary" />
                  Visitor {idx + 1}
                  {visitor.status === VisitorStatus.Completed && (
                    <LockIcon fontSize="small" sx={{ color: "grey.500" }} />
                  )}
                </Typography>
                {visitors.length > 1 &&
                  visitor.status === VisitorStatus.Draft && (
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => removeVisitor(idx)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
              </Box>

              <Grid container spacing={2}>
                {/* Email */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="Email Address"
                    placeholder="visitor@example.com"
                    value={visitor.emailAddress || ""}
                    disabled={visitor.status === VisitorStatus.Completed}
                    error={!!visitorErrors[idx]?.emailAddress}
                    helperText={visitorErrors[idx]?.emailAddress}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText =
                        (e as React.ClipboardEvent).clipboardData?.getData(
                          "text",
                        ) || "";
                      const extractedEmail = handlePaste(pastedText);
                      updateVisitor(idx, "emailAddress", extractedEmail);
                      clearVisitorError(idx, "emailAddress");
                      if (
                        visitor.status === VisitorStatus.Draft &&
                        extractedEmail &&
                        extractedEmail.includes("@") &&
                        extractedEmail.length >= 6
                      ) {
                        updateVisitor(idx, "name", "");
                        updateVisitor(idx, "contactNumber", "");
                        fetchVisitorByEmailOrContact(extractedEmail, idx);
                      }
                    }}
                    onChange={(e) => {
                      const email = e.target.value.trim();
                      updateVisitor(idx, "emailAddress", email);
                      clearVisitorError(idx, "emailAddress");

                      if (visitorDebounceRefs.current[idx]) {
                        clearTimeout(visitorDebounceRefs.current[idx]!);
                      }
                      visitorDebounceRefs.current[idx] = setTimeout(() => {
                        if (
                          visitor.status === VisitorStatus.Draft &&
                          email &&
                          email.includes("@") &&
                          email.length >= 6
                        ) {
                          updateVisitor(idx, "name", "");
                          updateVisitor(idx, "contactNumber", "");
                          fetchVisitorByEmailOrContact(email, idx);
                        }
                        delete visitorDebounceRefs.current[idx];
                      }, 600);
                    }}
                    sx={textFieldSx}
                  />
                </Grid>

                {/* Contact Number */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <MuiTelInput
                    fullWidth
                    size="small"
                    label="Contact Number"
                    value={visitor.contactNumber || ""}
                    onChange={(newValue, info) => {
                      updateVisitor(idx, "contactNumber", newValue);
                      if (info?.countryCallingCode) {
                        updateVisitor(
                          idx,
                          "countryCode",
                          `+${info.countryCallingCode}`,
                        );
                      }
                      clearVisitorError(idx, "contactNumber");

                      if (visitor.emailAddress) return;

                      const contact = newValue.replace(/\D/g, "");
                      if (visitorDebounceRefs.current[idx]) {
                        clearTimeout(visitorDebounceRefs.current[idx]!);
                      }
                      visitorDebounceRefs.current[idx] = setTimeout(() => {
                        if (visitor.status === VisitorStatus.Draft && contact) {
                          updateVisitor(idx, "name", "");
                          updateVisitor(idx, "emailAddress", "");
                          fetchVisitorByEmailOrContact(
                            normalizeContact(newValue),
                            idx,
                          );
                        }
                        delete visitorDebounceRefs.current[idx];
                      }, 600);
                    }}
                    defaultCountry="LK"
                    forceCallingCode
                    disabled={visitor.status === VisitorStatus.Completed}
                    error={!!visitorErrors[idx]?.contactNumber}
                    helperText={visitorErrors[idx]?.contactNumber}
                    sx={textFieldSx}
                  />
                </Grid>

                {/* Name */}
                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name"
                    required
                    placeholder="Full name"
                    value={visitor.name || ""}
                    disabled={visitor.status === VisitorStatus.Completed}
                    error={!!visitorErrors[idx]?.name}
                    helperText={visitorErrors[idx]?.name}
                    onChange={(e) => {
                      const onlyLettersAndSpaces = e.target.value.replace(
                        /[^A-Za-z\s]/g,
                        "",
                      );
                      updateVisitor(idx, "name", onlyLettersAndSpaces);
                      clearVisitorError(idx, "name");
                    }}
                    sx={textFieldSx}
                  />
                </Grid>

                {/* Submit Visitor Button */}
                {visitor.status === VisitorStatus.Draft && (
                  <Grid size={12} sx={{ textAlign: "right" }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                      onClick={() => submitVisitor(idx)}
                      disabled={isSubmitting}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        bgcolor: "#FF7300",
                        "&:hover": {
                          bgcolor: "#E56600",
                        },
                      }}
                    >
                      Submit Visitor
                    </Button>
                  </Grid>
                )}

                {visitor.status === VisitorStatus.Completed && (
                  <Grid size={12}>
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                      label="Visitor submitted"
                      size="small"
                      sx={{
                        color: "#009345",
                        bgcolor: "#e6f4ed",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        "& .MuiChip-icon": { color: "#009345" },
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        ))}

        {/* Add Visitor & Complete Buttons */}
        {isLocked && (
          <Box
            sx={{
              mt: 3,
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            {canAddMoreVisitors && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
                onClick={addNewVisitorBlock}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  bgcolor: "#F3F4F8",
                  color: "#4B5064",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#E9EBF5",
                    boxShadow: "none",
                  },
                }}
              >
                Add Visitor
              </Button>
            )}
            {!hasDraftVisitors && (
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                onClick={resetForm}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  bgcolor: "#FF7300",
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#E56600",
                    boxShadow: "none",
                  },
                }}
              >
                Complete Visit
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default CreateVisit;
