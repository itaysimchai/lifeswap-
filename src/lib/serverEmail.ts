import { Resend } from "resend";
import {
  buildCancellationCustomerEmail,
  buildCancellationProviderEmail,
  buildCustomerEmail,
  buildProviderEmail,
  type BookingDetails,
  type CancellationDetails,
} from "./email";

const FROM = process.env.EMAIL_FROM || "LifeSwap <onboarding@resend.dev>";

type EmailPayload = BookingDetails & {
  kind?: "booking" | "cancellation";
  refundAmount?: number;
  cancelledByHost?: boolean;
};

export async function sendServerBookingEmail(d: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

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
  const sends: Promise<unknown>[] = [];

  if (d.requesterEmail) {
    sends.push(
      resend.emails.send({
        from: FROM,
        to: d.requesterEmail,
        subject: customerEmail.subject,
        html: customerEmail.html,
      })
    );
  }
  if (d.providerEmail) {
    sends.push(
      resend.emails.send({
        from: FROM,
        to: d.providerEmail,
        subject: providerEmail.subject,
        html: providerEmail.html,
      })
    );
  }

  await Promise.all(sends);
}
