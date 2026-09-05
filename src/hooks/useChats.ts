"use client";

import {
  collection,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Chat, Message } from "@/lib/types";
import { useCollectionData } from "./useCollectionData";

/** Conversations the signed-in user participates in, most recent first. */
export function useChats(uid: string | undefined) {
  return useCollectionData<Chat>(
    () =>
      uid
        ? query(
            collection(db, "chats"),
            where("participantIds", "array-contains", uid)
          )
        : null,
    [uid],
    (a, b) =>
      (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0)
  );
}

/** Live message thread for a chat (oldest first — a single-field index). */
export function useMessages(chatId: string | undefined) {
  return useCollectionData<Message>(
    () =>
      chatId
        ? query(
            collection(db, "chats", chatId, "messages"),
            orderBy("createdAt", "asc")
          )
        : null,
    [chatId]
  );
}
