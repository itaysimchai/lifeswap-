import type { Timestamp } from "firebase/firestore";
import type { Chat } from "./types";

export function chatInitials(name: string | undefined) {
  return (
    (name ?? "?")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Time for a list row: clock today, date before that. */
export function formatChatTime(ts: Timestamp | null | undefined) {
  if (!ts) return "";
  const d = ts.toDate();
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Full timestamp for a message bubble. */
export function formatMessageTime(ts: Timestamp | null | undefined) {
  if (!ts) return "";
  return ts.toDate().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** The other participant's display name for a chat. */
export function otherName(chat: Chat, uid: string) {
  const otherId = chat.participantIds.find((id) => id !== uid) ?? uid;
  return chat.participantNames?.[otherId] ?? "Conversation";
}

/**
 * A chat is unread when the last message arrived after this user last read it
 * and was not sent by this user. The single definition - the tab badge and the
 * conversation list both call it, so they cannot drift apart.
 */
export function isUnread(chat: Chat, uid: string) {
  // An unknown sender is treated as read: without knowing who sent it, marking
  // it unread would light the tab badge for the user's own messages.
  if (!chat.lastSenderId || chat.lastSenderId === uid) return false;
  const last = chat.lastMessageAt?.toMillis() ?? 0;
  const read = chat.lastRead?.[uid]?.toMillis() ?? 0;
  return last > read;
}
