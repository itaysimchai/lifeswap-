/**
 * Server-side booking creation — the verified-payment version of `bookService`
 * in actions.ts. This runs ONLY on the server, ONLY after a payment has been
 * confirmed with Stripe/PayPal, and writes with the Admin SDK (which bypasses
 * security rules). It mirrors the simulated flow: claim slot, create the
 * "confirmed" booking, open the chat, send emails.
 *
 * It is IDEMPOTENT on `paymentRef` (the Stripe session id / PayPal order id):
 * calling it twice for the same payment returns the first result instead of
 * creating a second booking. That matters because two things may both try to
 * fulfil one payment — the success page AND the webhook.
 */
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

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
  paymentMethod: "stripe" | "paypal";
  paymentRef: string; // Stripe session id / PayPal order id
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

export async function createConfirmedBooking(
  b: ConfirmedBooking
): Promise<BookingResult> {
  if (b.providerId === b.requesterId) {
    throw new Error("You cannot book your own service.");
  }

  // ---- Idempotency lock --------------------------------------------------
  // `create()` fails if the doc already exists, so it acts as a one-time lock
  // keyed on the payment. The first caller wins and does the work; any later
  // caller (e.g. the webhook arriving after the success page already ran)
  // lands in the catch and returns the already-stored result.
  const payRef = adminDb.collection("payments").doc(b.paymentRef);
  try {
    await payRef.create({
      paymentMethod: b.paymentMethod,
      status: "processing",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    const snap = await payRef.get();
    const data = snap.data();
    if (data?.bookingId && data?.chatId) {
      return { bookingId: data.bookingId, chatId: data.chatId };
    }
    // Extremely rare: the winner is mid-write. Treat as "in progress".
    throw new Error("This payment is already being processed.");
  }

  // Claim the 1-hour slot. Deterministic id => a second booking of the same
  // slot can't be created, which prevents double-booking.
  const slotId = `${b.serviceId}_${b.date}_${b.time.replace(":", "")}`;
  try {
    await adminDb.collection("bookedSlots").doc(slotId).create({
      serviceId: b.serviceId,
      providerId: b.providerId,
      date: b.date,
      time: b.time,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Someone else booked this exact slot in the gap. The charge already went
    // through, so flag it for a refund rather than silently losing the money.
    await payRef.set(
      { status: "needs_refund", reason: "slot_taken" },
      { merge: true }
    );
    throw new Error("That time was just booked. Your payment will be refunded.");
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
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Payment confirmed the meeting → open the chat immediately (same as the
  // simulated flow in actions.ts).
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
    { status: "done", bookingId: bookingRef.id, chatId },
    { merge: true }
  );

  // Confirmation emails — best-effort, never undo a paid booking over a mail
  // hiccup. We call the existing route by absolute URL (it holds the Resend key).
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await fetch(`${base}/api/send-booking-emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceTitle: b.serviceTitle,
        providerName: b.providerName,
        providerEmail: b.providerEmail,
        requesterName: b.requesterName,
        requesterEmail: b.requesterEmail,
        date: b.date,
        time: b.time,
        price: b.price,
      }),
    });
  } catch (e) {
    console.error("Booking emails could not be sent:", e);
  }

  return { bookingId: bookingRef.id, chatId };
}
