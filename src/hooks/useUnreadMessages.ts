"use client";

import { useMemo } from "react";
import { isUnread } from "@/lib/chat";
import { useChats } from "./useChats";

/**
 * True when the user has at least one conversation with an unread *received*
 * message. Drives the red notification dot. Realtime via the existing chats
 * subscription, and shares `isUnread` with the conversation list so the badge
 * and the list rows can never disagree about what unread means.
 */
export function useUnreadMessages(uid: string | undefined): boolean {
  const { data: chats } = useChats(uid);
  return useMemo(
    () => (uid ? chats.some((chat) => isUnread(chat, uid)) : false),
    [chats, uid]
  );
}
