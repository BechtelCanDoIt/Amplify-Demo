// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

export type LeaveType =
  | "casual"
  | "sick"
  | "annual"
  | "lieu"
  | "maternity"
  | "paternity";

export type PeriodType =
  | "one"
  | "multiple"
  | "half";

export type VehicleType = "CAR" | "MOTORCYCLE";

export type VehicleStatus = "ACTIVE" | "INACTIVE";

export interface LeavePayload {
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  periodType: PeriodType;
  isMorningLeave?: boolean;
  comment?: string;
  isPublicComment?: boolean;
  emailRecipients?: string[];
}

export interface ChatUser {
  googleUserId: string;
  displayName: string;
  email: string;
  spaceName: string;
  // The Chat thread the user's message was sent in (e.g. "spaces/AAA/threads/BBB").
  // Used to anchor the bot's async-reply messages so they appear in-thread instead
  // of in the space's main section. Undefined only if the webhook payload omits it.
  threadName?: string;
}

export interface UserToken {
  googleUserId: string;
  wso2Email: string;
  accessToken: string;
  idToken?: string;       // JWT with email + groups claims — used as Bearer for Choreo APIs
  refreshToken?: string;
  expiresAt: Date;
}

// The Chat API Space resource, as far as Novera reads it. `type` is the
// legacy field ("DM" / "ROOM"); spaceType and singleUserBotDm replace it.
export interface ChatSpace {
  name: string;
  type?: string;
  spaceType?: string;
  singleUserBotDm?: boolean;
}

// Google Workspace Add-on event format (HTTP endpoint)
export interface GoogleChatEvent {
  commonEventObject: {
    userLocale: string;
    hostApp: string;
    platform: string;
  };
  chat: {
    user: {
      name: string;
      displayName: string;
      email: string;
      type: string;
    };
    eventTime: string;
    // The space the interaction happened in.
    space?: ChatSpace;
    // Present for MESSAGE events
    messagePayload?: {
      space: ChatSpace;
      message: {
        name: string;
        sender: {
          name: string;
          displayName: string;
          email: string;
        };
        text?: string;
        slashCommand?: {
          commandId: string;
        };
        argumentText?: string;
        // Present on every message — top-level messages get their own auto-created
        // thread, replies-in-thread carry their parent thread's name. Mirroring it
        // back on outbound messages is what keeps the bot reply anchored.
        thread?: {
          name: string;
        };
        // User-uploaded files / images / Drive references attached to the
        // message. The bot has no attachment-handling tools, so we reject
        // image uploads explicitly at the webhook layer (see src/index.ts).
        attachment?: Array<{
          name?: string;
          contentName?: string;
          contentType?: string;
          source?: string;
        }>;
      };
      configCompleteRedirectUri?: string;
    };
    // Present for ADDED_TO_SPACE events
    addedToSpacePayload?: {
      space: ChatSpace;
    };
    // Present for REMOVED_FROM_SPACE events (removed or uninstalled)
    removedFromSpacePayload?: {
      space: ChatSpace;
    };
  };
}
