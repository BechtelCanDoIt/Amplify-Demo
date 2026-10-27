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

import { Button, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type ApplicationFeedback,
  type ApplicationInterview,
  type DocumentsStatus,
  type OfferAnswer,
  type OfferLetter,
  State,
} from "@/types/types";
import CenteredSpinner from "@component/common/CenteredSpinner";
import PageContainer from "@component/common/PageContainer";
import { ApplicationStatus, OFFER_CONFLICT_ERROR, OFFER_EXPIRED_ERROR, SnackMessage } from "@config/constant";
import { useAppAuthContext } from "@context/AuthContext";
import {
  dismissFeedback,
  refreshApplications,
  respondToOffer,
  retryApplications,
  sendFeedback,
} from "@slices/careersSlice/careers";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { jobPath } from "@utils/jobFilterUtils";
import { fetchDocumentsStatus, fetchInterviews, fetchOfferLetter } from "@utils/profileService";
import AcceptOfferDialog from "@view/applications/components/AcceptOfferDialog";
import ApplicationDetails from "@view/applications/components/ApplicationDetails";
import ApplicationList from "@view/applications/components/ApplicationList";
import DeclineOfferDialog from "@view/applications/components/DeclineOfferDialog";
import RejectionFeedbackDialog from "@view/applications/components/RejectionFeedbackDialog";
import WelcomeDialog from "@view/applications/components/WelcomeDialog";

const Applications = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { getToken } = useAppAuthContext();
  const applications = useAppSelector((state: RootState) => state.careers.applications);
  const applicationsState = useAppSelector((state: RootState) => state.careers.applicationsState);
  const jobs = useAppSelector((state: RootState) => state.careers.jobs);
  const jobsState = useAppSelector((state: RootState) => state.careers.jobsState);

  // The list, or one application's details when the URL has an id.
  const { id: applicationId } = useParams<{ id: string }>();

  const selectedApplication = applicationId ? applications.find((a) => a.id === applicationId) : undefined;
  const stillLoading = applicationsState === State.idle || applicationsState === State.loading;

  const dismissedFeedbackIds = useAppSelector((state: RootState) => state.careers.dismissedFeedbackIds);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const feedbackDue =
    selectedApplication?.status === ApplicationStatus.Rejected &&
    !selectedApplication.feedbackSubmitted &&
    !dismissedFeedbackIds.includes(selectedApplication.id);

  const handleSendFeedback = async (feedback: ApplicationFeedback) => {
    if (!selectedApplication) return;
    setSendingFeedback(true);
    try {
      const token = await getToken();
      await dispatch(sendFeedback({ accessToken: token, applicationId: selectedApplication.id, feedback })).unwrap();
      dispatch(enqueueSnackbarMessage({ message: SnackMessage.success.feedbackSent, type: "success" }));
    } catch {
      dispatch(enqueueSnackbarMessage({ message: SnackMessage.error.sendFeedback, type: "error" }));
    } finally {
      setSendingFeedback(false);
    }
  };

  // The offer letter, kept in this page only and shown once the candidate has an offer or has accepted one.
  const [offerLetter, setOfferLetter] = useState<OfferLetter | null>(null);
  const selectedId = selectedApplication?.id;
  const hasOffer =
    selectedApplication?.status === ApplicationStatus.Offer ||
    selectedApplication?.status === ApplicationStatus.OfferAccepted;

  useEffect(() => {
    setOfferLetter(null);
    if (!selectedId || !hasOffer) return;
    let cancelled = false;
    getToken()
      .then((token) => fetchOfferLetter(token, selectedId))
      .then((letter) => {
        if (!cancelled) setOfferLetter(letter);
      })
      // A failed load shows nothing.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId, hasOffer, getToken]);

  // The interviews of the opened application, past and upcoming; none when they cannot be loaded.
  const [interviews, setInterviews] = useState<ApplicationInterview[]>([]);

  useEffect(() => {
    setInterviews([]);
    if (!selectedId) return;
    let cancelled = false;
    getToken()
      .then((token) => fetchInterviews(token, selectedId))
      .then((loaded) => {
        if (!cancelled) setInterviews(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId, getToken]);

  // Whether the documents were already submitted; unknown until the check is back.
  const [documentsStatus, setDocumentsStatus] = useState<DocumentsStatus | null | undefined>(undefined);
  // Raised to ask for the check again after it failed.
  const [documentsStatusAttempt, setDocumentsStatusAttempt] = useState(0);
  const hasAcceptedOffer = selectedApplication?.status === ApplicationStatus.OfferAccepted;

  useEffect(() => {
    setDocumentsStatus(undefined);
    if (!selectedId || !hasAcceptedOffer) return;
    let cancelled = false;
    getToken()
      .then((token) => fetchDocumentsStatus(token, selectedId))
      .then((loaded) => {
        if (!cancelled) setDocumentsStatus(loaded);
      })
      // A failed check is kept apart from "not submitted", and can be tried again.
      .catch(() => {
        if (!cancelled) setDocumentsStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, hasAcceptedOffer, getToken, documentsStatusAttempt]);

  const [offerDialog, setOfferDialog] = useState<"accept" | "decline" | "welcome" | null>(null);
  const [respondingToOffer, setRespondingToOffer] = useState(false);

  const handleOfferAnswer = async (answer: OfferAnswer) => {
    if (!selectedApplication) return;
    setRespondingToOffer(true);
    try {
      const token = await getToken();
      await dispatch(respondToOffer({ accessToken: token, applicationId: selectedApplication.id, answer })).unwrap();
      if (answer.response === "accepted") {
        setOfferDialog("welcome");
      } else {
        setOfferDialog(null);
        dispatch(enqueueSnackbarMessage({ message: SnackMessage.success.offerDeclined, type: "success" }));
      }
    } catch (error) {
      const name = (error as { name?: string }).name;
      if (name === OFFER_CONFLICT_ERROR || name === OFFER_EXPIRED_ERROR) {
        // Closes the dialog and loads the real state.
        setOfferDialog(null);
        dispatch(refreshApplications());
        const message = name === OFFER_EXPIRED_ERROR ? SnackMessage.error.offerExpired : SnackMessage.error.offerConflict;
        dispatch(enqueueSnackbarMessage({ message, type: "error" }));
      } else {
        dispatch(enqueueSnackbarMessage({ message: SnackMessage.error.respondToOffer, type: "error" }));
      }
    } finally {
      setRespondingToOffer(false);
    }
  };

  return (
    <PageContainer>
      {selectedApplication && offerDialog === "accept" && (
        <AcceptOfferDialog
          jobTitle={selectedApplication.jobTitle}
          sending={respondingToOffer}
          onConfirm={() => handleOfferAnswer({ response: "accepted" })}
          onClose={() => setOfferDialog(null)}
        />
      )}
      {selectedApplication && offerDialog === "decline" && (
        <DeclineOfferDialog
          jobTitle={selectedApplication.jobTitle}
          sending={respondingToOffer}
          onDecline={handleOfferAnswer}
          onClose={() => setOfferDialog(null)}
        />
      )}
      {selectedApplication && offerDialog === "welcome" && (
        <WelcomeDialog
          jobTitle={selectedApplication.jobTitle}
          onSubmitDocuments={() => navigate(`/applications/${selectedApplication.id}/documents`)}
          onClose={() => setOfferDialog(null)}
        />
      )}
      {selectedApplication && feedbackDue && (
        <RejectionFeedbackDialog
          jobTitle={selectedApplication.jobTitle}
          sending={sendingFeedback}
          onSend={handleSendFeedback}
          onClose={() => dispatch(dismissFeedback(selectedApplication.id))}
        />
      )}
      {applicationId ? (
        <>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => navigate("/applications")}
            sx={{ mb: 2, ml: -1, fontWeight: 600 }}
          >
            Applications
          </Button>

          {selectedApplication ? (
            <ApplicationDetails
              application={selectedApplication}
              jobOpen={jobsState !== State.success || jobs.some((job) => job.id === selectedApplication.jobId)}
              onOpenJob={(jobId) => {
                const job = jobs.find((j) => j.id === jobId);
                navigate(job ? jobPath(job) : `/jobs/${jobId}`);
              }}
              canAcceptOffer={!applications.some((a) => a.status === ApplicationStatus.OfferAccepted)}
              onAcceptOffer={() => setOfferDialog("accept")}
              onDeclineOffer={() => setOfferDialog("decline")}
              onSubmitDocuments={() => navigate(`/applications/${selectedApplication.id}/documents`)}
              offerLetter={offerLetter}
              interviews={interviews}
              documentsStatus={documentsStatus}
              onRetryDocumentsStatus={() => setDocumentsStatusAttempt((current) => current + 1)}
            />
          ) : stillLoading ? (
            <CenteredSpinner />
          ) : (
            <Typography color="text.secondary">We couldn&apos;t find this application.</Typography>
          )}
        </>
      ) : (
        <ApplicationList
          applications={applications}
          applicationsState={applicationsState}
          onView={(id) => navigate(`/applications/${id}`)}
          onBrowseJobs={() => navigate("/jobs")}
          onRetry={() => dispatch(retryApplications())}
        />
      )}
    </PageContainer>
  );
};

export default Applications;
