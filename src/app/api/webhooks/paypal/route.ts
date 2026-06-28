/**
 * POST /api/webhooks/paypal
 * PayPal's server-to-server notifications. We verify the signature (so a forged
 * event can't trigger anything), then act on the ones we care about:
 *   • CUSTOMER.DISPUTE.CREATED  → flag the matching booking as disputed
 *   • PAYMENT.CAPTURE.REFUNDED  → acknowledged (the in-app cancel flow already
 *     records refunds; out-of-band refunds are rare).
 *
 * Set PAYPAL_WEBHOOK_ID (from the PayPal dashboard webhook you create) to enable
 * verification. Until then the endpoint rejects events, which is the safe default.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { paypalAccessToken, paypalBase } from "@/lib/paypal";

export const runtime = "nodejs";

async function verified(req: Request, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const token = await paypalAccessToken();
  const res = await fetch(
    `${paypalBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    }
  );
  const data = await res.json();
  return data?.verification_status === "SUCCESS";
}

export async function POST(req: Request) {
  const raw = await req.text();

  let ok = false;
  try {
    ok = await verified(req, raw);
  } catch {
    ok = false;
  }
  if (!ok) {
    return NextResponse.json({ error: "Unverified webhook." }, { status: 400 });
  }

  let event: { event_type?: string; resource?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    if (event.event_type === "CUSTOMER.DISPUTE.CREATED") {
      const txns = (event.resource?.disputed_transactions as
        | { seller_transaction_id?: string }[]
        | undefined) ?? [];
      const captureId = txns[0]?.seller_transaction_id;
      if (captureId) {
        const q = await adminDb
          .collection("serviceRequests")
          .where("paymentCaptureId", "==", captureId)
          .limit(1)
          .get();
        if (!q.empty) {
          await q.docs[0].ref.set(
            { disputed: true, disputedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        }
      }
    }
  } catch (e) {
    console.error("PayPal webhook handler error:", e);
  }

  return NextResponse.json({ received: true });
}
