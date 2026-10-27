// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import React, { useContext, useEffect, useState } from "react";

import { useIdleTimer } from "react-idle-timer";

import { SecureApp, useAuthContext } from "@asgardeo/auth-react";
import ErrorHandler from "@component/common/ErrorHandler";
import PreLoader from "@component/common/PreLoader";
import StatusWithAction from "@component/ui/StatusWithAction";
import { Button } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { loadPrivileges, setUserAuthData } from "@slices/authSlice/auth";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { getUserInfo } from "@slices/userSlice/user";
import { APIService } from "@utils/apiService";

type AuthContextType = {
  appSignIn: () => void;
  appSignOut: () => void;
};
const AuthContext = React.createContext<AuthContextType>({} as AuthContextType);

const timeout = 1800_000;
const promptBeforeIdle = 4_000;

const AppAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [idlePromptOpen, setIdlePromptOpen] = useState(false);
  const [ui, setUI] = useState<"loading" | "active" | "logout" | "error">(
    "loading"
  );

  const dispatch = useAppDispatch();
  const auth = useAppSelector((state: RootState) => state.auth);
  const userInfo = useAppSelector((state: RootState) => state.user);

  const {
    signIn,
    signOut,
    getDecodedIDToken,
    getBasicUserInfo,
    refreshAccessToken,
    isAuthenticated,
    getIDToken,
    state: asg,
  } = useAuthContext();

  useIdleTimer({
    timeout,
    promptBeforeIdle,
    throttle: 500,
    onPrompt: () => ui === "active" && setIdlePromptOpen(true),
  });

  const handleContinue = () => setIdlePromptOpen(false);

  const refreshToken = async (): Promise<{ idToken: string }> => {
    try {
      if (await isAuthenticated()) {
        return { idToken: await getIDToken() };
      }
      await refreshAccessToken();
      return { idToken: await getIDToken() };
    } catch (e) {
      await appSignOut();
      throw e;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (asg.isLoading) return;
      if (localStorage.getItem("people-app-state") === "logout") {
        setUI("logout");
        return;
      }

      if (!localStorage.getItem("people-app-redirect-url")) {
        localStorage.setItem(
          "people-app-redirect-url",
          window.location.href.replace(window.location.origin, "")
        );
      }

      if (!asg.isAuthenticated) {
        await signIn();
        return;
      }

      try {
        const [basic, idToken, decoded] = await Promise.all([
          getBasicUserInfo(),
          getIDToken(),
          getDecodedIDToken(),
        ]);
        if (cancelled) return;

        dispatch(
          setUserAuthData({ userInfo: basic, idToken, decodedIdToken: decoded })
        );
        new APIService(idToken, refreshToken);
        await dispatch(getUserInfo()).unwrap();
        await dispatch(loadPrivileges()).unwrap();

        if (!cancelled) setUI("active");
      } catch (err: unknown) {
        console.error("Failed to logging in :", err);

        const status = (err as any)?.response?.status ?? (err as any)?.status;
        if (status === 401 || status === 403) {
          if (!cancelled) {
            localStorage.removeItem("people-app-state");
            await signIn();
          }
          return;
        }

        try {
          const stillAuth = await isAuthenticated();
          if (!stillAuth) {
            await signIn();
            return;
          }
        } catch {
          await signIn();
          return;
        }

        if (!cancelled) setUI("error");
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    asg.isAuthenticated,
    asg.isLoading,
    signIn,
    dispatch,
    getBasicUserInfo,
    getIDToken,
    getDecodedIDToken,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (ui === "active" && !asg.isAuthenticated) {
      signIn();
    }
  }, [ui, asg.isAuthenticated, signIn]);

  const appSignOut = async () => {
    setUI("loading");
    localStorage.setItem("people-app-state", "logout");
    await signOut();
    setUI("logout");
  };

  const appSignIn = () => {
    localStorage.setItem("people-app-state", "active");
    window.location.reload();
  };

  if (ui === "loading") {
    if (!asg.isAuthenticated && !asg.isLoading) {
      return null;
    }
    return <PreLoader isLoading={true} message={auth.statusMessage || ""} />;
  }

  if (ui === "logout") {
    return <StatusWithAction action={appSignIn} />;
  }

  if (ui === "error") {
    const msg =
      userInfo.errorMessage ||
      auth.statusMessage ||
      "You are not authorized to access this application.";
    return <ErrorHandler message={msg} />;
  }

  return (
    <>
      <Dialog
        open={idlePromptOpen}
        onClose={handleContinue}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Are you still there?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            It looks like you've been inactive for a while. Would you like to
            continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleContinue}>Continue</Button>
          <Button onClick={() => appSignOut()}>Logout</Button>
        </DialogActions>
      </Dialog>

      <AuthContext.Provider value={{ appSignIn, appSignOut }}>
        <SecureApp>{children}</SecureApp>
      </AuthContext.Provider>
    </>
  );
};

const useAppAuthContext = (): AuthContextType => useContext(AuthContext);

export { useAppAuthContext };

export default AppAuthProvider;
