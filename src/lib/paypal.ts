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
