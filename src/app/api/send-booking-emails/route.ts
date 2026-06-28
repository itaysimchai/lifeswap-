import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildCustomerEmail,
  buildProviderEmail,
  buildCancellationCustomerEmail,
  buildCancellationProviderEmail,
  type BookingDetails,
  type CancellationDetails,
} from "@/lib/email";

export const runtime = "nodejs";

// In Resend test mode (no verified domain) you can only send FROM onboarding@resend.dev
// and TO your own account email. Set EMAIL_FROM to a verified domain to email anyone.
const FROM = process.env.EMAIL_FROM || "LifeSwap <onboarding@resend.dev>";

type Payload = BookingDetails & {
  kind?: "booking" | "cancellation";
  refundAmount?: number;
  cancelledByHost?: boolean;
};

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  // No key configured (e.g. local dev) → soft no-op so a booking never breaks.
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "RESEND_API_KEY not set" });
  }

  let d: Payload;
  try {
    d = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!d?.serviceTitle) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  const cancellation = d.kind === "cancellation";
  const cancel: CancellationDetails = {
    ...d,
    refundAmount: d.refundAmount ?? 0,
    cancelledByHost: !!d.cancelledByHost,
  };
  const customerEmail = cancellation
    ? buildCancellationCustomerEmail(cancel)
    : buildCustomerEmail(d);
  const providerEmail = cancellation
    ? buildCancellationProviderEmail(cancel)
    : buildProviderEmail(d);

  const resend = new Resend(apiKey);
  const results: Record<string, string> = {};

  try {
    if (d.requesterEmail) {
      const r = await resend.emails.send({
        from: FROM,
        to: d.requesterEmail,
        subject: customerEmail.subject,
        html: customerEmail.html,
      });
      results.customer = r.error ? `error: ${r.error.message}` : "sent";
    }
    if (d.providerEmail) {
      const r = await resend.emails.send({
        from: FROM,
        to: d.providerEmail,
        subject: providerEmail.subject,
        html: providerEmail.html,
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
