/**
 * POST /api/checkout/stripe/confirm  { sid: "<checkout session id>" }
 * Called by the booking success page after Stripe redirects back. It verifies
 * the session is really paid and creates the booking (idempotently), then
 * returns the details to show a confirmation. This is what makes the flow work
 * in local dev without the Stripe CLI / webhook.
 */
import { NextResponse } from "next/server";
import { fulfillStripeSession } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let sid: string | undefined;
  try {
    sid = (await req.json())?.sid;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!sid) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  try {
    const booking = await fulfillStripeSession(sid);
    return NextResponse.json({ ok: true, ...booking });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not confirm payment." },
      { status: 402 }
    );
  }
}
