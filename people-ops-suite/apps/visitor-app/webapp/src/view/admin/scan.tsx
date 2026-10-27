import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Modal,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import { useParams, useSearchParams } from "react-router-dom";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import {
  fetchSingleVisit,
  visitStatusUpdate,
  FloorRoom,
} from "@slices/visitSlice/visit";
import { State, VisitStatus, VisitAction } from "@/types/types";
import ErrorHandler from "@component/common/ErrorHandler";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import FloorRoomSelector from "@root/src/view/employee/component/floorRoomSelector";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { CorporateFare, Visibility } from "@mui/icons-material";
import { useConfirmationModalContext } from "@root/src/context/DialogContext";
import { ConfirmationType } from "@/types/types";

dayjs.extend(utc);
dayjs.extend(timezone);

const toLocalDateTime = (utcString: string) => {
  return dayjs
    .utc(utcString)
    .tz(dayjs.tz.guess())
    .format("YYYY-MM-DD HH:mm:ss");
};

const approvalValidationSchema = Yup.object({
  passNumber: Yup.string().optional(),
  selectedFloorsAndRooms: Yup.array().optional(),
});

interface ScanProps {
  onClose?: () => void;
}

function Scan({ onClose }: ScanProps) {
  const { visitVerificationCode: visitVerificationCodeFromParams } = useParams<{
    visitVerificationCode: string;
  }>();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const dialogContext = useConfirmationModalContext();

  const visitVerificationCode =
    visitVerificationCodeFromParams ||
    searchParams.get("visitVerificationCode");

  const { currentVisit, currentVisitState, submitState, stateMessage } =
    useAppSelector((state: RootState) => state.visit);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [viewAccessibleFloors, setViewAccessibleFloors] = useState(false);
  const [accessibleFloors, setAccessibleFloors] = useState<FloorRoom[]>([]);

  const isInModal = !!searchParams.get("visitVerificationCode");

  useEffect(() => {
    if (visitVerificationCode) {
      dispatch(fetchSingleVisit(visitVerificationCode));
    }
  }, [dispatch, visitVerificationCode]);

  const handleStartVisit = async (
    passNumber: string,
    accessibleLocations: FloorRoom[],
  ) => {
    if (!currentVisit) return;

    try {
      const payload = {
        visitId: currentVisit.id,
        passNumber: passNumber.trim() || null,
        status: VisitAction.approve,
        accessibleLocations:
          accessibleLocations.length > 0 ? accessibleLocations : null,
        rejectionReason: null,
      };

      setIsApprovalModalOpen(false);

      await dispatch(visitStatusUpdate(payload));

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error starting visit:", error);
    }
  };

  const handleCompleteVisit = () => {
    if (!currentVisit) return;

    dialogContext.showConfirmation(
      "Do you want to complete this visit?",
      `This action will mark the visit as completed.`,
      ConfirmationType.accept,
      async () => {
        const payload = {
          visitId: currentVisit.id,
          status: VisitAction.complete,
          passNumber: null,
          accessibleLocations: null,
          rejectionReason: null,
        };

        await dispatch(visitStatusUpdate(payload));

        if (onClose) {
          onClose();
        }
      },
      "Confirm",
      "Cancel",
    );
  };

  const showViewAccessibleFloors = (locations: FloorRoom[]) => {
    setAccessibleFloors(locations || []);
    setViewAccessibleFloors(true);
  };

  if (currentVisitState === State.loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "55vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
        <Typography mt={2} color="textSecondary">
          Loading visit details...
        </Typography>
      </Box>
    );
  }

  if (currentVisitState === State.failed || !currentVisit) {
    return (
      <Box
        sx={{
          width: "100%",
          minHeight: "55vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          textAlign: "center",
        }}
      >
        <Alert
          severity="error"
          sx={{
            maxWidth: 520,
            width: "100%",
            mb: 3,
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            The QR code is expired or invalid.
          </Typography>
          <Typography variant="body2" gutterBottom>
            QR කේතය කල් ඉකුත් වී ඇත හෝ වලංගු නොවේ.
          </Typography>
          <Typography variant="body2">
            QR குறியீடு காலாவதியானது அல்லது செல்லாதது.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const isRequested = currentVisit.status === VisitStatus.requested;
  const isApproved = currentVisit.status === VisitStatus.approved;

  return (
    <Box
      sx={{
        width: isInModal ? "100%" : "100vw",
        minHeight: isInModal ? "auto" : "100vh",
        p: 4,
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Visit Details
        </Typography>

        <Card sx={{ mb: 3, mt: 2, backgroundColor: "inherit" }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.firstName == null &&
                  currentVisit.lastName == null
                    ? "N/A"
                    : `${currentVisit.firstName || ""} ${currentVisit.lastName || ""}`}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.email || "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Contact Number
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.contactNumber || "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Pass Number
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.passNumber || "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Whom They Meet
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.whomTheyMeet || "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Purpose of Visit
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.purposeOfVisit || "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Time of Entry
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.timeOfEntry
                    ? toLocalDateTime(currentVisit.timeOfEntry)
                    : "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Time of Departure
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentVisit.timeOfDeparture
                    ? toLocalDateTime(currentVisit.timeOfDeparture)
                    : "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  Accessible Locations
                </Typography>
                {currentVisit.accessibleLocations &&
                currentVisit.accessibleLocations.length > 0 ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() =>
                      showViewAccessibleFloors(
                        currentVisit.accessibleLocations || [],
                      )
                    }
                  >
                    View Locations
                  </Button>
                ) : (
                  <Typography variant="body1" fontWeight="medium">
                    N/A
                  </Typography>
                )}
              </Grid>
            </Grid>

            {isRequested &&
              currentVisit.visitDate !==
                new Date().toISOString().split("T")[0] && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body1">
                    This visit is scheduled for{" "}
                    <strong>{currentVisit.visitDate}</strong>.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    You can only start the visit on the scheduled date.
                  </Typography>
                </Alert>
              )}

            <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
              {isRequested &&
                currentVisit.visitDate ===
                  new Date().toISOString().split("T")[0] && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => setIsApprovalModalOpen(true)}
                    disabled={submitState === State.loading}
                  >
                    Start Visit
                  </Button>
                )}

              {isApproved && (
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={handleCompleteVisit}
                  disabled={submitState === State.loading}
                >
                  Complete Visit
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Start Visit Modal */}
      <Modal
        open={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        aria-labelledby="start-visit-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 800,
            maxHeight: "80vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            overflowY: "auto",
          }}
        >
          <Typography
            id="start-visit-modal"
            variant="h6"
            sx={{ mb: 2, fontWeight: "bold" }}
          >
            Start Visit
          </Typography>
          <Formik
            initialValues={{
              passNumber: "",
              selectedFloorsAndRooms: [],
            }}
            validationSchema={approvalValidationSchema}
            onSubmit={(values) => {
              handleStartVisit(
                values.passNumber,
                values.selectedFloorsAndRooms,
              );
            }}
          >
            {({ setFieldValue, values, errors, touched }) => (
              <Form>
                <Typography sx={{ mb: 2 }}>
                  Enter pass number and select access floors (both optional)
                </Typography>
                <Field
                  as={TextField}
                  name="passNumber"
                  label="Pass Number (Optional)"
                  fullWidth
                  variant="outlined"
                  placeholder="Enter pass number"
                  helperText={
                    (touched.passNumber && errors.passNumber) ??
                    errors.passNumber
                  }
                  error={touched.passNumber && Boolean(errors.passNumber)}
                  sx={{ mb: 2 }}
                />
                <FloorRoomSelector
                  selectedFloorsAndRooms={values.selectedFloorsAndRooms}
                  onChange={(value) =>
                    setFieldValue("selectedFloorsAndRooms", value)
                  }
                />
                {touched.selectedFloorsAndRooms &&
                  errors.selectedFloorsAndRooms && (
                    <Typography color="error" sx={{ mt: 1 }}>
                      {errors.selectedFloorsAndRooms}
                    </Typography>
                  )}
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setIsApprovalModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={submitState === State.loading}
                  >
                    Start Visit
                  </Button>
                </Box>
              </Form>
            )}
          </Formik>
        </Box>
      </Modal>

      {/* Accessible Floors Dialog */}
      <Dialog
        open={viewAccessibleFloors}
        onClose={() => setViewAccessibleFloors(false)}
      >
        <DialogTitle>Accessible Floors</DialogTitle>
        <DialogContent>
          {accessibleFloors.length === 0 ? (
            <Typography>No accessible floors assigned.</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 0.5 }}>
              <List
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  bgcolor: "background.paper",
                }}
              >
                {accessibleFloors.map((floorRoom, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar>
                        <CorporateFare />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={floorRoom.floor}
                      secondary={
                        floorRoom.rooms.length > 0
                          ? floorRoom.rooms.join(", ")
                          : "All rooms"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setViewAccessibleFloors(false)}
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Scan;
