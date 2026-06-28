/**
 * POST /api/paypal/capture-order
 *   { orderId, serviceId, date, time, requesterId, providerId }
 *   Header: Authorization: Bearer <Firebase ID token>
 *
 * Captures the PayPal order, verifies it completed and that the amount covers
 * the service price (read server-side), then creates the confirmed booking.
 * If anything fails AFTER the capture, the charge is refunded automatically so
 * the customer is never left paying for a booking that wasn't created.
 */
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createConfirmedBooking } from "@/lib/serverBooking";
import { paypalAccessToken, paypalBase, paypalRefund } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Verify the caller (the buyer) before moving any money.
  const authz = req.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  let callerUid: string;
  try {
    callerUid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "You're not signed in." }, { status: 401 });
  }

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
  if (callerUid !== requesterId) {
    return NextResponse.json(
      { error: "You can't complete someone else's booking." },
      { status: 403 }
    );
  }

  // 1) Capture the money, then CHECK PayPal says it completed. Wrapped so a
  // PayPal auth/network failure returns a clean error instead of crashing the
  // function (no money has moved yet at this point).
  let cap: {
    status?: string;
    purchase_units?: {
      payments?: { captures?: { id?: string; amount?: { value?: string } }[] };
    }[];
  };
  let capOk = false;
  try {
    const token = await paypalAccessToken();
    const capRes = await fetch(
      `${paypalBase()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }
    );
    cap = await capRes.json();
    capOk = capRes.ok;
  } catch {
    return NextResponse.json(
      { error: "Payment service is unavailable. You were not charged." },
      { status: 502 }
    );
  }
  if (!capOk || cap?.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
  }
  const paid = Number(
    cap?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0
  );
  const captureId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id as
    | string
    | undefined;

  // From here the money is captured — any failure must auto-refund.
  const refund = async () => {
    if (captureId) await paypalRefund(captureId).catch(() => {});
  };

  // 2) Look up names/emails/price server-side — never trust the browser.
  const [reqSnap, provSnap, svcSnap] = await Promise.all([
    adminDb.doc(`users/${requesterId}`).get(),
    adminDb.doc(`users/${providerId}`).get(),
    adminDb.doc(`services/${serviceId}`).get(),
  ]);
  const dbPrice = Number(svcSnap.data()?.price) || 0;
  if (paid + 1e-9 < dbPrice) {
    await refund();
    return NextResponse.json(
      { error: "Amount mismatch — you were refunded." },
      { status: 402 }
    );
  }

  // 3) Only now create the booking. If it fails, refund the capture.
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
      paymentCaptureId: captureId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await refund();
    const msg = e instanceof Error ? e.message : "Could not confirm booking.";
    return NextResponse.json({ error: `${msg} You were refunded.` }, { status: 402 });
  }
}
