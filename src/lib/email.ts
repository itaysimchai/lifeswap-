/**
 * Booking emails. The HTML templates + calendar links are built here (pure, so
 * they're reused by the server route). Delivery goes through the server route
 * `/api/send-booking-emails`, which sends via Resend using a server-only API key.
 */

const APP_NAME = "LifeSwap";
const SESSION_MINUTES = 60;
const BRAND = "#2563eb";

export interface BookingDetails {
  serviceTitle: string;
  providerName: string;
  providerEmail?: string | null;
  requesterName: string;
  requesterEmail?: string | null;
  date: string; // "2026-06-22"
  time: string; // "13:00"
  price: number;
}

function startEnd(date: string, time: string) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + SESSION_MINUTES * 60_000);
  return { start, end };
}

function stampUTC(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarLink(d: BookingDetails): string {
  const { start, end } = startEnd(d.date, d.time);
  const text = encodeURIComponent(`${d.serviceTitle} — ${APP_NAME}`);
  const details = encodeURIComponent(
    `Session with ${d.providerName}, booked on ${APP_NAME}.`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${stampUTC(
    start
  )}/${stampUTC(end)}&details=${details}`;
}

export function outlookCalendarLink(d: BookingDetails): string {
  const { start, end } = startEnd(d.date, d.time);
  const subject = encodeURIComponent(`${d.serviceTitle} — ${APP_NAME}`);
  const body = encodeURIComponent(
    `Session with ${d.providerName}, booked on ${APP_NAME}.`
  );
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&body=${body}&startdt=${start.toISOString()}&enddt=${end.toISOString()}`;
}

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtPrice(p: number): string {
  return p > 0 ? `$${p}` : "Free";
}

function calButtons(d: BookingDetails): string {
  return `<div style="margin-top:4px">
    <a href="${googleCalendarLink(d)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 16px;border-radius:8px;margin:0 8px 8px 0">Add to Google Calendar</a>
    <a href="${outlookCalendarLink(d)}" style="display:inline-block;background:#ffffff;color:#0f172a;text-decoration:none;font-size:14px;font-weight:600;padding:11px 16px;border-radius:8px;border:1px solid #e2e8f0">Add to Outlook</a>
  </div>`;
}

function shell(
  heading: string,
  intro: string,
  rows: [string, string][],
  cta: string
): string {
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;color:#64748b;font-size:14px">${k}</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${v}</td></tr>`
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:540px;margin:0 auto;padding:24px">
    <div style="font-weight:700;font-size:18px;color:${BRAND};margin-bottom:16px">${APP_NAME}</div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">${heading}</h1>
      <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6">${intro}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 22px">${rowsHtml}</table>
      ${cta}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">You're receiving this because of activity on your ${APP_NAME} account.</p>
  </div></body></html>`;
}

export function buildCustomerEmail(d: BookingDetails) {
  const rows: [string, string][] = [
    ["Service", d.serviceTitle],
    ["Provider", d.providerName],
    ["Date", fmtDate(d.date)],
    ["Time", d.time],
    ["Amount paid", fmtPrice(d.price)],
  ];
  return {
    subject: `Your booking is confirmed — ${d.serviceTitle}`,
    html: shell(
      "Your booking is confirmed",
      `You're all set for your session with ${d.providerName}. Add it to your calendar below, and you can message ${d.providerName} anytime in the app.`,
      rows,
      calButtons(d)
    ),
  };
}

export function buildProviderEmail(d: BookingDetails) {
  const rows: [string, string][] = [
    ["Service", d.serviceTitle],
    [
      "Booked by",
      d.requesterName + (d.requesterEmail ? ` (${d.requesterEmail})` : ""),
    ],
    ["Date", fmtDate(d.date)],
    ["Time", d.time],
    ["Amount", fmtPrice(d.price)],
  ];
  return {
    subject: `New session booked — ${d.serviceTitle}`,
    html: shell(
      "You have a new booking",
      `${d.requesterName} just booked your service. Add it to your calendar, and reach out in the app if you need to adjust the time.`,
      rows,
      calButtons(d)
    ),
  };
}

export interface CancellationDetails extends BookingDetails {
  refundAmount: number;
  cancelledByHost: boolean;
}

export function buildCancellationCustomerEmail(d: CancellationDetails) {
  const refunded = d.refundAmount > 0 ? `$${d.refundAmount.toFixed(2)}` : null;
  const rows: [string, string][] = [
    ["Service", d.serviceTitle],
    ["Provider", d.providerName],
    ["Date", fmtDate(d.date)],
    ["Time", d.time],
    ["Refund", refunded ?? "—"],
  ];
  const intro = d.cancelledByHost
    ? `${d.providerName} had to cancel your session.${refunded ? ` You've been fully refunded ${refunded}, on its way back to your PayPal.` : ""}`
    : `Your session has been cancelled.${refunded ? ` A refund of ${refunded} is on its way back to your PayPal.` : ""}`;
  return {
    subject: `Session cancelled — ${d.serviceTitle}`,
    html: shell("Session cancelled", intro, rows, ""),
  };
}

export function buildCancellationProviderEmail(d: CancellationDetails) {
  const rows: [string, string][] = [
    ["Service", d.serviceTitle],
    ["Booked by", d.requesterName],
    ["Date", fmtDate(d.date)],
    ["Time", d.time],
  ];
  const refunded = d.refundAmount > 0 ? `$${d.refundAmount.toFixed(2)}` : null;
  const intro = d.cancelledByHost
    ? `You cancelled this session. ${d.requesterName} has been fully refunded.`
    : `${d.requesterName} cancelled this session.${refunded ? ` They were refunded ${refunded}.` : ""} The time slot is open for booking again.`;
  return {
    subject: `Session cancelled — ${d.serviceTitle}`,
    html: shell("Session cancelled", intro, rows, ""),
  };
}

/**
 * Send the customer + provider booking emails by calling the server route
 * (which holds the Resend API key). Best-effort: callers wrap this in try/catch
 * so a mail hiccup never breaks a booking.
 */
export async function sendBookingEmails(d: BookingDetails): Promise<void> {
  await fetch("/api/send-booking-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  });
}
