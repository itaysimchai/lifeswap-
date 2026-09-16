import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { sendAlert, type Alert } from "./apns";

initializeApp();
const db = getFirestore();

const APNS_KEY = defineSecret("APNS_KEY");
const APNS_KEY_ID = defineSecret("APNS_KEY_ID");
const APNS_TEAM_ID = defineSecret("APNS_TEAM_ID");
const secrets = [APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID];

/**
 * Fans an alert out to every device a user has registered, then prunes the
 * tokens Apple reports as dead. Without that prune the collection only grows -
 * every reinstall and every restored backup leaves a token behind that will
 * never be delivered to again.
 */
async function notify(uid: string, alert: Alert): Promise<void> {
  const snapshot = await db.collection("users").doc(uid).collection("pushTokens").get();
  const tokens = snapshot.docs.map((d) => d.id);
  if (tokens.length === 0) return;

  const results = await sendAlert(tokens, alert);
  const dead = results.filter((r) => r.expired).map((r) => r.token);
  if (dead.length > 0) {
    const batch = db.batch();
    for (const token of dead) {
      batch.delete(db.collection("users").doc(uid).collection("pushTokens").doc(token));
    }
    await batch.commit();
  }

  for (const result of results) {
    if (result.status !== 200 && !result.expired) {
      logger.warn("APNs rejected a notification", {
        uid,
        status: result.status,
        reason: result.reason,
      });
    }
  }
}

/** Truncates message text to something that reads well on a lock screen. */
function preview(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export const onChatMessage = onDocumentCreated(
  { document: "chats/{chatId}/messages/{messageId}", secrets },
  async (event) => {
    const message = event.data?.data();
    if (!message?.senderId || typeof message.text !== "string") return;

    const chat = await db.collection("chats").doc(event.params.chatId).get();
    const participants: string[] = chat.get("participantIds") ?? [];
    const names: Record<string, string> = chat.get("participantNames") ?? {};

    // Everyone in the thread except whoever just typed.
    const recipients = participants.filter((uid) => uid !== message.senderId);
    await Promise.all(
      recipients.map((uid) =>
        notify(uid, {
          title: names[message.senderId] || "New message",
          body: preview(message.text),
          route: "/messages",
          threadId: event.params.chatId,
        })
      )
    );
  }
);

export const onBookingRequest = onDocumentCreated(
  { document: "serviceRequests/{requestId}", secrets },
  async (event) => {
    const request = event.data?.data();
    if (!request?.providerId) return;

    await notify(request.providerId, {
      title: "New booking request",
      body: `${request.requesterName ?? "Someone"} requested ${
        request.serviceTitle ?? "one of your services"
      }.`,
      route: "/home",
    });
  }
);
