/**
 * POST /api/webhooks/stripe
 * Stripe calls THIS to tell us a payment finished — the most reliable signal,
 * because it arrives even if the user closes the tab before the success page
 * loads. It's a backup to the success-page confirm; both create the booking
 * idempotently, so running both is safe.
 *
 * Security: we verify Stripe's signature on the RAW body. Without this, anyone
 * could POST a fake "paid" event. That's why we read req.text() (not .json()).
 */
import { NextResponse } from "next/server";
import { stripe, fulfillStripeSession } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    );
  }

  const body = await req.text(); // raw body required for signature check
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Bad signature: ${e instanceof Error ? e.message : ""}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillStripeSession(session.id);
    } catch (e) {
      // Log but still 200 so Stripe doesn't retry forever on a permanent error
      // (e.g. slot taken → flagged for refund inside createConfirmedBooking).
      console.error("Webhook fulfilment failed:", e);
    }
  }

  return NextResponse.json({ received: true });
}
