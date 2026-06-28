/**
 * POST /api/paypal/capture-order  { orderId }
 * Captures the PayPal order, verifies it matches the server-side pending
 * payment record, then creates the confirmed booking.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createConfirmedBooking } from "@/lib/serverBooking";
import { paypalAccessToken, paypalBase, paypalRefund } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  let callerUid: string;
  try {
    callerUid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "You're not signed in." }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "Missing PayPal order id." }, { status: 400 });
  }

  const payRef = adminDb.collection("payments").doc(orderId);
  let payment: FirebaseFirestore.DocumentData;
  try {
    const claim = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(payRef);
      if (!snap.exists) throw new Error("Payment record not found.");
      const data = snap.data()!;
      if (data.requesterId !== callerUid) {
        throw new Error("You can't complete someone else's booking.");
      }
      if (data.bookingId && data.chatId) {
        return {
          done: { bookingId: data.bookingId as string, chatId: data.chatId as string },
          payment: null,
        };
      }
      if (data.status !== "created") {
        throw new Error("This payment is already being processed.");
      }
      tx.set(
        payRef,
        { status: "capturing", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { done: null, payment: data };
    });
    if (claim.done) {
      return NextResponse.json({ ok: true, ...claim.done });
    }
    if (!claim.payment) throw new Error("Payment record not found.");
    payment = claim.payment;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not process this payment." },
      { status: 409 }
    );
  }

  let cap: {
    status?: string;
    purchase_units?: {
      payments?: { captures?: { id?: string; amount?: { value?: string; currency_code?: string } }[] };
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
    await payRef.set(
      { status: "created", updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    ).catch(() => {});
    return NextResponse.json(
      { error: "Payment service is unavailable. You were not charged." },
      { status: 502 }
    );
  }

  if (!capOk || cap?.status !== "COMPLETED") {
    await payRef.set(
      { status: "created", updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    ).catch(() => {});
    return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
  }

  const capture = cap.purchase_units?.[0]?.payments?.captures?.[0];
  const paid = Number(capture?.amount?.value ?? 0);
  const captureId = capture?.id;
  const refund = async () => {
    if (captureId) await paypalRefund(captureId).catch(() => {});
  };

  const expected = Number(payment.amount) || 0;
  if (paid + 1e-9 < expected || capture?.amount?.currency_code !== "USD") {
    await refund();
    await payRef.set(
      {
        status: "refunded",
        reason: "amount_mismatch",
        paymentCaptureId: captureId ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {});
    return NextResponse.json(
      { error: "Amount mismatch - you were refunded." },
      { status: 402 }
    );
  }

  try {
    const result = await createConfirmedBooking({
      serviceId: payment.serviceId as string,
      serviceTitle: (payment.serviceTitle as string) ?? "Service",
      requesterId: callerUid,
      requesterName: (payment.requesterName as string) ?? "",
      requesterEmail: (payment.requesterEmail as string) ?? "",
      providerId: payment.providerId as string,
      providerName: (payment.providerName as string) ?? "Provider",
      providerEmail: (payment.providerEmail as string) ?? null,
      date: payment.date as string,
      time: payment.time as string,
      price: paid,
      paymentMethod: "paypal",
      paymentRef: orderId,
      paymentCaptureId: captureId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await refund();
    await payRef.set(
      {
        status: captureId ? "refunded" : "needs_refund",
        reason: e instanceof Error ? e.message : "booking_failed",
        paymentCaptureId: captureId ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {});
    const msg = e instanceof Error ? e.message : "Could not confirm booking.";
    return NextResponse.json({ error: `${msg} You were refunded.` }, { status: 402 });
  }
}
