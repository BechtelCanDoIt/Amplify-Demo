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

import { Button } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { SecureApp, useAuthContext } from "@asgardeo/auth-react";
import { useIdleTimer } from "react-idle-timer";
import React, { useContext, useEffect, useState } from "react";

import PreLoader from "@component/common/PreLoader";
import StatusWithAction from "@component/ui/StatusWithAction";
import { redirectUrl } from "@config/constant";
import { loadPrivileges, setUserAuthData } from "@slices/authSlice/auth";
import { fetchAppConfig } from "@slices/configSlice/config";
import { RootState, useAppDispatch, useAppSelector } from "@slices/store";
import { getUserInfo } from "@slices/userSlice/user";
import { APIService } from "@utils/apiService";

type AuthContextType = {
  appSignIn: () => void;
  appSignOut: () => void;
};

const AuthContext = React.createContext<AuthContextType>({} as AuthContextType);

const APP_STATE_KEY = "leave-app-state";

const timeout = 1800_000;
const promptBeforeIdle = 4_000;

const AppAuthProvider = (props: { children: React.ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [appState, setAppState] = useState<"logout" | "active" | "loading">("loading");

  const dispatch = useAppDispatch();
  const auth = useAppSelector((state: RootState) => state.auth);

  const onPrompt = () => {
    appState === "active" && setOpen(true);
  };

  const { activate } = useIdleTimer({
    onPrompt,
    timeout,
    promptBeforeIdle,
    throttle: 500,
  });

  const handleContinue = () => {
    setOpen(false);
    activate();
  };

  const {
    signIn,
    signOut,
    getDecodedIDToken,
    getBasicUserInfo,
    refreshAccessToken,
    isAuthenticated,
    getIDToken,
    state,
  } = useAuthContext();

  useEffect(() => {
    const appStatus = localStorage.getItem(APP_STATE_KEY);

    if (!localStorage.getItem(redirectUrl)) {
      localStorage.setItem(redirectUrl, window.location.href.replace(window.location.origin, ""));
    }

    if (appStatus && appStatus === "logout") {
      setAppState("logout");
    } else {
      setAppState("active");
    }
  }, []);

  useEffect(() => {
    if (appState === "active") {
      if (state.isAuthenticated) {
        Promise.all([getBasicUserInfo(), getIDToken(), getDecodedIDToken()]).then(
          async ([userInfo, idToken, decodedIdToken]) => {
            dispatch(
              setUserAuthData({
                userInfo,
                decodedIdToken,
              })
            );
            new APIService(idToken, refreshToken);
          }
        );
      }
    }
  }, [appState, state.isAuthenticated]);

  useEffect(() => {
    if (appState === "active") {
      if (state.isAuthenticated) {
        if (auth.userInfo) {
          dispatch(getUserInfo()).then(() => {
            dispatch(fetchAppConfig());
            dispatch(loadPrivileges());
          });
        }
      } else {
        signIn();
      }
    }
  }, [auth.userInfo]);

  const refreshToken = (): Promise<{ idToken: string }> => {
    return new Promise<{ idToken: string }>(async (resolve) => {
      const userIsAuthenticated = await isAuthenticated();
      if (userIsAuthenticated) {
        resolve({ idToken: await getIDToken() });
      } else {
        refreshAccessToken()
          .then(async () => {
            const idToken = await getIDToken();
            resolve({ idToken });
          })
          .catch(() => {
            appSignOut();
          });
      }
    });
  };

  const appSignOut = async () => {
    setAppState("loading");
    localStorage.setItem(APP_STATE_KEY, "logout");
    await signOut();
    setAppState("logout");
  };

  const appSignIn = async () => {
    setAppState("active");
    localStorage.setItem(APP_STATE_KEY, "active");
  };

  const authContext: AuthContextType = {
    appSignIn,
    appSignOut,
  };

  return (
    <>
      {appState === "loading" ? (
        <PreLoader isLoading message={auth.statusMessage ?? ""} />
      ) : (
        <>
          <Dialog
            open={open}
            onClose={handleContinue}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{"Are you still there?"}</DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                It looks like you've been inactive for a while. Would you like to continue?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleContinue}>Continue</Button>
              <Button onClick={() => appSignOut()}>Logout</Button>
            </DialogActions>
          </Dialog>
          {appState === "active" ? (
            <AuthContext.Provider value={authContext}>
              <SecureApp>{props.children}</SecureApp>
            </AuthContext.Provider>
          ) : (
            <StatusWithAction action={() => appSignIn()} />
          )}
        </>
      )}
    </>
  );
};

const useAppAuthContext = (): AuthContextType => useContext(AuthContext);

export { useAppAuthContext };

export default AppAuthProvider;
