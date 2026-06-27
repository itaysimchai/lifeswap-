/**
 * Stripe server helper. Holds the one Stripe client and the single source of
 * truth for "turn a paid checkout session into a booking" — used by BOTH the
 * success page (so it works in local dev with no webhook) and the webhook (so
 * it still works if the user closes the tab). Both are safe to run because
 * createConfirmedBooking is idempotent on the session id.
 */
import Stripe from "stripe";
import { adminDb } from "./firebaseAdmin";
import {
  createConfirmedBooking,
  type BookingResult,
} from "./serverBooking";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export interface FulfilledBooking extends BookingResult {
  serviceTitle: string;
  providerName: string;
  date: string;
  time: string;
  price: number;
}

/**
 * Verify a Checkout Session really got paid, then create the booking.
 * Throws if the session isn't paid. Idempotent (see serverBooking).
 */
export async function fulfillStripeSession(
  sessionId: string
): Promise<FulfilledBooking> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // The golden rule: the SERVER asks Stripe whether it was paid — we never
  // trust the browser for this.
  if (session.payment_status !== "paid") {
    throw new Error("This payment has not been completed.");
  }

  const m = session.metadata ?? {};
  const { serviceId, date, time, requesterId, providerId } = m;
  if (!serviceId || !date || !time || !requesterId || !providerId) {
    throw new Error("Payment is missing booking details.");
  }

  // Look up names/emails/title server-side — never trust the browser for these.
  const [reqSnap, provSnap, svcSnap] = await Promise.all([
    adminDb.doc(`users/${requesterId}`).get(),
    adminDb.doc(`users/${providerId}`).get(),
    adminDb.doc(`services/${serviceId}`).get(),
  ]);

  const serviceTitle = (svcSnap.data()?.title as string) ?? "Service";
  const providerName = (provSnap.data()?.displayName as string) ?? "Provider";
  // The amount Stripe actually charged (in cents) — the real source of truth.
  const price = (session.amount_total ?? 0) / 100;

  const result = await createConfirmedBooking({
    serviceId,
    serviceTitle,
    requesterId,
    requesterName: (reqSnap.data()?.displayName as string) ?? "",
    requesterEmail: (reqSnap.data()?.email as string) ?? "",
    providerId,
    providerName,
    providerEmail: (provSnap.data()?.email as string) ?? null,
    date,
    time,
    price,
    paymentMethod: "stripe",
    paymentRef: session.id,
  });

  return { ...result, serviceTitle, providerName, date, time, price };
}
