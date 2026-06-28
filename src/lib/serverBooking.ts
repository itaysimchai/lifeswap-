/**
 * Server-side booking creation. This runs only on the server, after PayPal has
 * confirmed a paid booking or after the server has validated a free booking.
 * It writes with the Admin SDK (which bypasses security rules): claim slot,
 * create the "confirmed" booking, open the chat, send emails.
 *
 * It is IDEMPOTENT on `paymentRef` (PayPal order id / server free-booking id):
 * calling it twice for the same payment returns the first result instead of
 * creating a second booking.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { computeRefund, sessionStart } from "./cancellation";
import { paypalRefund, paypalCaptureIdForOrder } from "./paypal";
import { sendServerBookingEmail } from "./serverEmail";

const SESSION_MINUTES = 60;
const SLOT_LOCK_MINUTES = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export interface ConfirmedBooking {
  serviceId: string;
  serviceTitle: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  providerId: string;
  providerName: string;
  providerEmail: string | null;
  date: string; // "yyyy-mm-dd"
  time: string; // "HH:mm"
  price: number;
  paymentMethod: "paypal" | "free";
  paymentRef: string; // PayPal order id / server-generated free booking id
  paymentCaptureId?: string | null; // PayPal capture id, needed to refund
}

export interface BookingResult {
  bookingId: string;
  chatId: string;
}

/** Same deterministic id as actions.ts so both sides compute one chat per booking. */
function chatIdFor(a: string, b: string, requestId: string): string {
  const [x, y] = [a, b].sort();
  return `${x}_${y}_${requestId}`;
}

function toMinutes(time: string): number | null {
  if (!TIME_RE.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  const total = h * 60 + m;
  return total + SESSION_MINUTES <= 24 * 60 ? total : null;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
}

function fallbackAvailability(count = 6): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const d = new Date();
  for (let i = 1; Object.keys(map).length < count; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    map[day.toISOString().slice(0, 10)] = ["09:00", "10:30", "13:00", "15:30"];
  }
  return map;
}

function availabilityFor(
  service: FirebaseFirestore.DocumentData,
  date: string
): string[] {
  const availability = service.availability as Record<string, string[]> | undefined;
  const map =
    availability && Object.keys(availability).length > 0
      ? availability
      : fallbackAvailability();
  const times = map[date];
  return Array.isArray(times) ? times : [];
}

export function validateBookableSlot(
  service: FirebaseFirestore.DocumentData,
  date: string | undefined,
  time: string | undefined
): string | null {
  if (!date || !time || !DATE_RE.test(date) || !TIME_RE.test(time)) {
    return "Choose a valid date and time.";
  }
  if (service.status !== "active") {
    return "This service is not available for booking.";
  }
  const minutes = toMinutes(time);
  if (minutes === null) {
    return "Choose a valid one-hour time slot.";
  }
  const start = sessionStart(date, time);
  if (!start || start.getTime() <= Date.now()) {
    return "Choose a future time slot.";
  }
  if (!availabilityFor(service, date).includes(time)) {
    return "That time is not offered by this provider.";
  }
  return null;
}

function slotIdFor(serviceId: string, date: string, time: string): string {
  return `${serviceId}_${date}_${time.replace(":", "")}`;
}

function slotLockIds(serviceId: string, date: string, time: string): string[] {
  const start = toMinutes(time);
  if (start === null) throw new Error("Choose a valid one-hour time slot.");
  const ids: string[] = [];
  for (let offset = 0; offset < SESSION_MINUTES; offset += SLOT_LOCK_MINUTES) {
    ids.push(`${serviceId}_${date}_${fromMinutes(start + offset)}`);
  }
  return ids;
}

export async function assertSlotAvailable(
  serviceId: string,
  date: string,
  time: string
): Promise<void> {
  const refs = slotLockIds(serviceId, date, time).map((id) =>
    adminDb.collection("slotLocks").doc(id)
  );
  const snaps = await adminDb.getAll(...refs);
  if (snaps.some((snap) => snap.exists)) {
    throw new Error("That time was just booked. Please choose another slot.");
  }
}

export async function createConfirmedBooking(
  b: ConfirmedBooking
): Promise<BookingResult> {
  if (b.providerId === b.requesterId) {
    throw new Error("You cannot book your own service.");
  }

  const payRef = adminDb.collection("payments").doc(b.paymentRef);
  const existing = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(payRef);
    if (!snap.exists) {
      tx.create(payRef, {
        paymentMethod: b.paymentMethod,
        status: "processing",
        amount: b.price,
        requesterId: b.requesterId,
        providerId: b.providerId,
        serviceId: b.serviceId,
        date: b.date,
        time: b.time,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return null;
    }

    const data = snap.data();
    if (data?.bookingId && data?.chatId) {
      return { bookingId: data.bookingId as string, chatId: data.chatId as string };
    }
    if (data?.status === "processing") {
      throw new Error("This payment is already being processed.");
    }
    if (data?.requesterId && data.requesterId !== b.requesterId) {
      throw new Error("This payment belongs to another user.");
    }
    if (data?.serviceId && data.serviceId !== b.serviceId) {
      throw new Error("This payment does not match the selected service.");
    }
    tx.set(
      payRef,
      {
        paymentMethod: b.paymentMethod,
        status: "processing",
        amount: b.price,
        requesterId: b.requesterId,
        providerId: b.providerId,
        serviceId: b.serviceId,
        date: b.date,
        time: b.time,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return null;
  });
  if (existing) return existing;

  // Claim the one-hour slot. We create one display doc plus 30-minute lock docs;
  // overlapping starts (e.g. 10:00 and 10:30) collide on at least one lock.
  const slotId = slotIdFor(b.serviceId, b.date, b.time);
  const slotLocks = slotLockIds(b.serviceId, b.date, b.time);
  try {
    const batch = adminDb.batch();
    batch.create(adminDb.collection("bookedSlots").doc(slotId), {
      serviceId: b.serviceId,
      providerId: b.providerId,
      date: b.date,
      time: b.time,
      createdAt: FieldValue.serverTimestamp(),
    });
    for (const id of slotLocks) {
      batch.create(adminDb.collection("slotLocks").doc(id), {
        serviceId: b.serviceId,
        providerId: b.providerId,
        date: b.date,
        time: b.time,
        bookingPaymentRef: b.paymentRef,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch {
    // Someone else booked this exact slot in the gap. The charge already went
    // through, so flag it for a refund rather than silently losing the money.
    await payRef.set(
      { status: "needs_refund", reason: "slot_taken" },
      { merge: true }
    );
    throw new Error("That time was just booked. Please choose another slot.");
  }

  const bookingRef = await adminDb.collection("serviceRequests").add({
    serviceId: b.serviceId,
    serviceTitle: b.serviceTitle,
    requesterId: b.requesterId,
    requesterName: b.requesterName,
    providerId: b.providerId,
    providerName: b.providerName,
    scheduledDate: b.date,
    scheduledTime: b.time,
    price: b.price,
    paymentMethod: b.paymentMethod,
    paymentStatus: "paid",
    paymentRef: b.paymentRef,
    paymentCaptureId: b.paymentCaptureId ?? null,
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Payment/free validation confirmed the meeting, so open the chat immediately.
  const chatId = chatIdFor(b.requesterId, b.providerId, bookingRef.id);
  const opener = `Hi! I booked "${b.serviceTitle}" for ${b.date} at ${b.time}.`;
  await adminDb.collection("chats").doc(chatId).set(
    {
      participantIds: [b.requesterId, b.providerId],
      participantNames: {
        [b.requesterId]: b.requesterName,
        [b.providerId]: b.providerName,
      },
      serviceId: b.serviceId,
      serviceTitle: b.serviceTitle,
      lastMessage: opener,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastSenderId: b.requesterId,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await adminDb.collection("chats").doc(chatId).collection("messages").add({
    senderId: b.requesterId,
    text: opener,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Record the result so repeat calls are idempotent.
  await payRef.set(
    {
      status: "done",
      bookingId: bookingRef.id,
      chatId,
      paymentCaptureId: b.paymentCaptureId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Confirmation emails: best-effort, never undo a booking over a mail hiccup.
  try {
    await sendServerBookingEmail({
      serviceTitle: b.serviceTitle,
      providerName: b.providerName,
      providerEmail: b.providerEmail,
      requesterName: b.requesterName,
      requesterEmail: b.requesterEmail,
      date: b.date,
      time: b.time,
      price: b.price,
    });
  } catch (e) {
    console.error("Booking emails could not be sent:", e);
  }

  return { bookingId: bookingRef.id, chatId };
}

/**
 * Cancel a confirmed booking and refund per the policy in `cancellation.ts`.
 * Server-only: issues the PayPal refund, frees the slot, and notifies the chat.
 * `callerUid` is the verified id of whoever is cancelling.
 */
export async function processCancellation(
  bookingId: string,
  callerUid: string
): Promise<{ refundAmount: number }> {
  const ref = adminDb.collection("serviceRequests").doc(bookingId);

  // Atomically CLAIM the cancellation (confirmed -> cancelling) so two concurrent
  // requests can't both pass the checks and double-refund.
  const b = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Booking not found.");
    const data = snap.data()!;
    if (callerUid !== data.requesterId && callerUid !== data.providerId) {
      throw new Error("You can't cancel this session.");
    }
    if (data.status !== "confirmed") {
      throw new Error("This session can't be cancelled.");
    }
    const s = sessionStart(data.scheduledDate, data.scheduledTime);
    if (!s || s.getTime() <= Date.now()) {
      throw new Error("This session has already started or passed.");
    }
    tx.update(ref, { status: "cancelling" });
    return data;
  });

  const start = sessionStart(b.scheduledDate, b.scheduledTime);
  const price = Number(b.price) || 0;
  const cancelledByHost = callerUid === b.providerId;
  const { fraction, amount: refundAmount } = computeRefund({ price, cancelledByHost, start });

  // Refund through PayPal (an external call, so it's outside the transaction).
  // If it fails, release the claim so the booking stays valid.
  if (refundAmount > 0 && b.paymentMethod === "paypal") {
    try {
      let captureId: string | undefined = b.paymentCaptureId ?? undefined;
      if (!captureId && b.paymentRef) {
        captureId = await paypalCaptureIdForOrder(b.paymentRef);
      }
      if (!captureId) throw new Error("Couldn't find the payment to refund.");
      await paypalRefund(captureId, fraction < 1 ? refundAmount.toFixed(2) : undefined);
    } catch (e) {
      await ref.update({ status: "confirmed" }).catch(() => {});
      throw e;
    }
  }

  // Finalize cancellation.
  await ref.update({
    status: "cancelled",
    cancelledBy: cancelledByHost ? "host" : "customer",
    cancelledAt: FieldValue.serverTimestamp(),
    refundAmount,
  });

  // Free the slot so it can be booked again.
  if (b.scheduledDate && b.scheduledTime) {
    const batch = adminDb.batch();
    batch.delete(adminDb.collection("bookedSlots").doc(slotIdFor(
      b.serviceId,
      b.scheduledDate,
      b.scheduledTime
    )));
    for (const id of slotLockIds(b.serviceId, b.scheduledDate, b.scheduledTime)) {
      batch.delete(adminDb.collection("slotLocks").doc(id));
    }
    await batch.commit().catch(() => {});
  }

  // Best-effort note in the chat.
  try {
    const chatId = chatIdFor(b.requesterId, b.providerId, bookingId);
    const who = cancelledByHost ? b.providerName : b.requesterName;
    const note =
      refundAmount > 0
        ? `${who} cancelled this session. Refund: $${refundAmount.toFixed(2)}.`
        : `${who} cancelled this session.`;
    await adminDb.collection("chats").doc(chatId).collection("messages").add({
      senderId: callerUid,
      text: note,
      createdAt: FieldValue.serverTimestamp(),
    });
    await adminDb.collection("chats").doc(chatId).set(
      { lastMessage: note, lastMessageAt: FieldValue.serverTimestamp(), lastSenderId: callerUid },
      { merge: true }
    );
  } catch {
    /* best-effort: never fail the cancellation over a notification */
  }

  // Best-effort cancellation emails.
  try {
    const [reqSnap, provSnap] = await Promise.all([
      adminDb.doc(`users/${b.requesterId}`).get(),
      adminDb.doc(`users/${b.providerId}`).get(),
    ]);
    await sendServerBookingEmail({
      kind: "cancellation",
      serviceTitle: b.serviceTitle,
      providerName: b.providerName,
      providerEmail: (provSnap.data()?.email as string) ?? null,
      requesterName: b.requesterName,
      requesterEmail: (reqSnap.data()?.email as string) ?? null,
      date: b.scheduledDate,
      time: b.scheduledTime,
      price,
      refundAmount,
      cancelledByHost,
    });
  } catch (e) {
    console.error("Cancellation emails could not be sent:", e);
  }

  return { refundAmount };
}
