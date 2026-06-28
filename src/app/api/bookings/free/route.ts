/**
 * POST /api/bookings/free  { serviceId, date, time }
 * Creates a confirmed booking for a free service. This keeps free sessions on
 * the same server-side slot-locking path as paid PayPal bookings.
 */
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  assertSlotAvailable,
  createConfirmedBooking,
  validateBookableSlot,
} from "@/lib/serverBooking";

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

  let body: { serviceId?: string; date?: string; time?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { serviceId, date, time } = body;
  if (!serviceId || !date || !time) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  const [reqSnap, svcSnap] = await Promise.all([
    adminDb.doc(`users/${callerUid}`).get(),
    adminDb.doc(`services/${serviceId}`).get(),
  ]);
  const requester = reqSnap.data();
  if (!requester || requester.isBlocked === true) {
    return NextResponse.json({ error: "You can't book right now." }, { status: 403 });
  }
  if (!svcSnap.exists) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const svc = svcSnap.data()!;
  const providerId = svc.providerId as string | undefined;
  if (!providerId) {
    return NextResponse.json({ error: "Service is missing provider details." }, { status: 400 });
  }
  if (callerUid === providerId) {
    return NextResponse.json(
      { error: "You cannot book your own service." },
      { status: 400 }
    );
  }

  const price = Number(svc.price) || 0;
  if (price > 0) {
    return NextResponse.json({ error: "Use PayPal to book this service." }, { status: 400 });
  }

  const slotError = validateBookableSlot(svc, date, time);
  if (slotError) {
    return NextResponse.json({ error: slotError }, { status: 400 });
  }

  try {
    await assertSlotAvailable(serviceId, date, time);
    const provSnap = await adminDb.doc(`users/${providerId}`).get();
    const result = await createConfirmedBooking({
      serviceId,
      serviceTitle: (svc.title as string) ?? "Service",
      requesterId: callerUid,
      requesterName: (requester.displayName as string) ?? "",
      requesterEmail: (requester.email as string) ?? "",
      providerId,
      providerName: (provSnap.data()?.displayName as string) ?? (svc.providerName as string) ?? "Provider",
      providerEmail: (provSnap.data()?.email as string) ?? null,
      date,
      time,
      price: 0,
      paymentMethod: "free",
      paymentRef: `free_${callerUid}_${serviceId}_${date}_${time.replace(":", "")}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not confirm booking." },
      { status: 400 }
    );
  }
}
