"use client";

import { useMemo } from "react";
import { useChats } from "./useChats";

/**
 * True when the user has at least one conversation with an unread *received*
 * message — i.e. the last message was sent by someone else and arrived after
 * the user last opened that chat. Drives the red notification dot. Realtime via
 * the existing chats subscription.
 */
export function useUnreadMessages(uid: string | undefined): boolean {
  const { data: chats } = useChats(uid);

  return useMemo(() => {
    if (!uid) return false;
    return chats.some((c) => {
      if (!c.lastSenderId || c.lastSenderId === uid) return false; // sent by me / unknown
      const last = c.lastMessageAt?.toMillis() ?? 0;
      const read = c.lastRead?.[uid]?.toMillis() ?? 0;
      return last > read;
    });
  }, [chats, uid]);
}
