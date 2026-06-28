/**
 * POST /api/cancel-booking  { bookingId }
 * Header: Authorization: Bearer <Firebase ID token>
 *
 * Cancels a confirmed booking and refunds per the cancellation policy. The
 * caller's identity is verified server-side (you can only cancel a booking you
 * are part of), the PayPal refund is issued here (secret never touches the
 * browser), the slot is freed, and the chat is notified.
 */
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { processCancellation } from "@/lib/serverBooking";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "You're not signed in." }, { status: 401 });
  }

  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Your session is invalid." }, { status: 401 });
  }

  let body: { bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  try {
    const result = await processCancellation(body.bookingId, callerUid);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not cancel the session." },
      { status: 400 }
    );
  }
}
