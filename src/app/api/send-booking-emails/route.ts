import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildCustomerEmail,
  buildProviderEmail,
  type BookingDetails,
} from "@/lib/email";

export const runtime = "nodejs";

// In Resend test mode (no verified domain) you can only send FROM onboarding@resend.dev
// and TO your own account email. Set EMAIL_FROM to a verified domain to email anyone.
const FROM = process.env.EMAIL_FROM || "LifeSwap <onboarding@resend.dev>";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  // No key configured (e.g. local dev) → soft no-op so a booking never breaks.
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "RESEND_API_KEY not set" });
  }

  let d: BookingDetails;
  try {
    d = (await req.json()) as BookingDetails;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!d?.serviceTitle) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const results: Record<string, string> = {};

  try {
    if (d.requesterEmail) {
      const m = buildCustomerEmail(d);
      const r = await resend.emails.send({
        from: FROM,
        to: d.requesterEmail,
        subject: m.subject,
        html: m.html,
      });
      results.customer = r.error ? `error: ${r.error.message}` : "sent";
    }
    if (d.providerEmail) {
      const m = buildProviderEmail(d);
      const r = await resend.emails.send({
        from: FROM,
        to: d.providerEmail,
        subject: m.subject,
        html: m.html,
      });
      results.provider = r.error ? `error: ${r.error.message}` : "sent";
    }
  } catch (e) {
    // Best-effort: report but don't fail hard.
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "send failed",
    });
  }

  return NextResponse.json({ ok: true, results });
}
