import { NextResponse } from "next/server";
import { sendServerBookingEmail } from "@/lib/serverEmail";
import type { BookingDetails } from "@/lib/email";

export const runtime = "nodejs";

type Payload = BookingDetails & {
  kind?: "booking" | "cancellation";
  refundAmount?: number;
  cancelledByHost?: boolean;
};

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const supplied = req.headers.get("x-lifeswap-internal-secret");
  if (!secret || supplied !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload?.serviceTitle) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  try {
    await sendServerBookingEmail(payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "send failed",
    });
  }
}
