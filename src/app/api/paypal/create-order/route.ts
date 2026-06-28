/**
 * POST /api/paypal/create-order  { serviceId, requesterId, providerId }
 * Creates a PayPal order for a booking and returns its id. The PRICE is read
 * from the service doc on the server, so the browser can't tamper with the
 * amount charged.
 */
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { paypalAccessToken, paypalBase } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.PAYPAL_CLIENT_ID) {
    return NextResponse.json({ error: "PayPal is not configured." }, { status: 500 });
  }

  let body: { serviceId?: string; requesterId?: string; providerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { serviceId, requesterId, providerId } = body;
  if (!serviceId || !requesterId || !providerId) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }
  if (requesterId === providerId) {
    return NextResponse.json(
      { error: "You cannot book your own service." },
      { status: 400 }
    );
  }

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

  try {
    const token = await paypalAccessToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: price.toFixed(2) },
            description: (svc.title as string) ?? "LifeSwap session",
          },
        ],
      }),
    });

    const order = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !order.id) {
      return NextResponse.json(
        { error: order?.message ?? "Could not create PayPal order." },
        { status: 502 }
      );
    }
    return NextResponse.json({ id: order.id });
  } catch (e) {
    // PayPal auth/network failure — return a clean error instead of crashing.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payment service is unavailable." },
      { status: 502 }
    );
  }
}
