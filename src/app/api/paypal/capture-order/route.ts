/**
 * POST /api/paypal/capture-order
 *   { orderId, serviceId, date, time, requesterId, providerId }
 * Captures the PayPal order, verifies it really completed and that the captured
 * amount covers the service price (read server-side), then creates the confirmed
 * booking. Idempotent on the order id via createConfirmedBooking.
 */
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { createConfirmedBooking } from "@/lib/serverBooking";
import { paypalAccessToken, paypalBase } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    orderId?: string;
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

  const { orderId, serviceId, date, time, requesterId, providerId } = body;
  if (!orderId || !serviceId || !date || !time || !requesterId || !providerId) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  // 1) Capture the money, then CHECK PayPal says it completed.
  const token = await paypalAccessToken();
  const capRes = await fetch(
    `${paypalBase()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    }
  );
  const cap = await capRes.json();
  if (!capRes.ok || cap?.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
  }
  const paid = Number(
    cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0
  );

  // 2) Look up names/emails/price server-side — never trust the browser.
  const [reqSnap, provSnap, svcSnap] = await Promise.all([
    adminDb.doc(`users/${requesterId}`).get(),
    adminDb.doc(`users/${providerId}`).get(),
    adminDb.doc(`services/${serviceId}`).get(),
  ]);
  const dbPrice = Number(svcSnap.data()?.price) || 0;
  if (paid + 1e-9 < dbPrice) {
    return NextResponse.json({ error: "Amount mismatch." }, { status: 402 });
  }

  // 3) Only now create the booking (claim slot, open chat, send emails).
  try {
    const result = await createConfirmedBooking({
      serviceId,
      serviceTitle: (svcSnap.data()?.title as string) ?? "Service",
      requesterId,
      requesterName: (reqSnap.data()?.displayName as string) ?? "",
      requesterEmail: (reqSnap.data()?.email as string) ?? "",
      providerId,
      providerName: (provSnap.data()?.displayName as string) ?? "Provider",
      providerEmail: (provSnap.data()?.email as string) ?? null,
      date,
      time,
      price: paid,
      paymentMethod: "paypal",
      paymentRef: orderId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not confirm booking." },
      { status: 402 }
    );
  }
}
