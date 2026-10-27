// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Keeps agent_dm_spaces current from webhook events, so a notification reaches
// everyone who has added Novera, connected or not.

import { recordDmSpace, removeDmSpace } from "../db/dmSpaces";
import { ChatSpace, GoogleChatEvent } from "../types";

// Only a DM with exactly one person, never a group space, which can include guests.
export function isDirectMessage(space: ChatSpace | undefined): space is ChatSpace {
  if (!space?.name) return false;
  if (space.singleUserBotDm !== undefined) return space.singleUserBotDm;
  return space.spaceType === "DIRECT_MESSAGE" || space.type === "DM";
}

export async function trackDmSpace(event: GoogleChatEvent): Promise<void> {
  const chat = event.chat;
  if (!chat) return;

  const removed = chat.removedFromSpacePayload?.space;
  if (removed?.name) {
    await removeDmSpace(removed.name);
    return;
  }

  const space = chat.addedToSpacePayload?.space ?? chat.messagePayload?.space;
  if (!isDirectMessage(space)) return;
  await recordDmSpace(space.name, {
    googleUserId: chat.user?.name,
    displayName: chat.user?.displayName,
    email: chat.user?.email,
  });
}
