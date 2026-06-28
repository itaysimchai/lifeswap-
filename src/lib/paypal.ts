/**
 * PayPal REST helper (server-only). Talks to the sandbox or live API depending
 * on PAYPAL_ENV ("sandbox" default, "live" for production). Uses raw fetch — no
 * SDK needed. The secret never leaves the server.
 */
const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalBase(): string {
  return BASE;
}

/** Get an OAuth access token from PayPal using the client id + secret. */
export async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured.");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}).`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal did not return an access token.");
  return data.access_token;
}

/** Look up the capture id for an order (needed to issue a refund). */
export async function paypalCaptureIdForOrder(
  orderId: string
): Promise<string | undefined> {
  const token = await paypalAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data?.purchase_units?.[0]?.payments?.captures?.[0]?.id as string | undefined;
}

/**
 * Refund a capture. Pass `amountUSD` (e.g. "40.00") for a partial refund; omit
 * it for a full refund. Throws if PayPal rejects it.
 */
export async function paypalRefund(captureId: string, amountUSD?: string): Promise<void> {
  const token = await paypalAccessToken();
  const res = await fetch(`${BASE}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: amountUSD
      ? JSON.stringify({ amount: { value: amountUSD, currency_code: "USD" } })
      : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `PayPal refund failed (${res.status}).`);
  }
}
