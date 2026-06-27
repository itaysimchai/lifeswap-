/**
 * POST /api/checkout/stripe
 * Starts a Stripe Checkout session for a booking and returns the hosted
 * checkout URL. The browser sends only IDs + the chosen slot; the PRICE is read
 * from the service doc here, so a user can't tamper with what they're charged.
 */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 500 }
    );
  }

  let body: {
    serviceId?: string;
    date?: string;
    time?: string;
    requesterId?: string;
    providerId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { serviceId, date, time, requesterId, providerId } = body;
  if (!serviceId || !date || !time || !requesterId || !providerId) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }
  if (requesterId === providerId) {
    return NextResponse.json(
      { error: "You cannot book your own service." },
      { status: 400 }
    );
  }

  // Read the real price + title from Firestore — never trust the browser.
  const svcSnap = await adminDb.doc(`services/${serviceId}`).get();
  if (!svcSnap.exists) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  const svc = svcSnap.data()!;
  const price = Number(svc.price) || 0;
  if (price <= 0) {
    return NextResponse.json(
      { error: "This service is free — no payment needed." },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: svc.title as string },
          unit_amount: Math.round(price * 100), // Stripe works in cents
        },
        quantity: 1,
      },
    ],
    // We re-read these on the way back to build the booking. (No price here —
    // the booking uses the amount Stripe actually charged.)
    metadata: { serviceId, date, time, requesterId, providerId },
    success_url: `${base}/booking/success?sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
