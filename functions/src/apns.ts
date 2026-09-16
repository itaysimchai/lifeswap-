import * as http2 from "http2";
import * as crypto from "crypto";

/**
 * Minimal APNs HTTP/2 provider.
 *
 * Apple's token-based auth wants an ES256 JWT signed with a .p8 key, which is
 * about thirty lines of crypto - cheaper than pulling in Firebase Cloud
 * Messaging, which would additionally require the Firebase iOS SDK and a
 * GoogleService-Info.plist inside the native project just to reach the same
 * APNs endpoint. Direct is fewer moving parts.
 *
 * Configure with (firebase functions:secrets:set / .env):
 *   APNS_KEY_ID      10-character Key ID of the .p8
 *   APNS_TEAM_ID     10-character Apple Developer Team ID
 *   APNS_BUNDLE_ID   com.itaysimchai.lifeswap
 *   APNS_KEY         contents of AuthKey_XXXXXXXXXX.p8, newlines included
 *   APNS_PRODUCTION  "true" once the build is signed for distribution
 */

const HOST_DEV = "https://api.sandbox.push.apple.com";
const HOST_PROD = "https://api.push.apple.com";

/** Apple rejects tokens older than an hour; refreshing hourly is the norm. */
const TOKEN_TTL_MS = 50 * 60 * 1000;

let cachedToken: { value: string; expires: number } | null = null;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it before deploying push.`);
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function providerToken(): string {
  const now = Date.now();
  if (cachedToken && cachedToken.expires > now) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: "ES256", kid: env("APNS_KEY_ID") }));
  const claims = base64url(
    JSON.stringify({ iss: env("APNS_TEAM_ID"), iat: Math.floor(now / 1000) })
  );
  const signature = crypto
    .createSign("SHA256")
    .update(`${header}.${claims}`)
    .sign({ key: env("APNS_KEY").replace(/\\n/g, "\n"), dsaEncoding: "ieee-p1363" });

  const value = `${header}.${claims}.${base64url(signature)}`;
  cachedToken = { value, expires: now + TOKEN_TTL_MS };
  return value;
}

export interface Alert {
  title: string;
  body: string;
  /** In-app route to open when the notification is tapped. */
  route?: string;
  badge?: number;
  threadId?: string;
}

export interface SendResult {
  token: string;
  status: number;
  /** True when Apple says this token is dead and the caller should delete it. */
  expired: boolean;
  reason?: string;
}

/**
 * Sends one alert to many device tokens over a single HTTP/2 connection -
 * APNs is explicit that reconnecting per notification is the wrong shape.
 */
export async function sendAlert(tokens: string[], alert: Alert): Promise<SendResult[]> {
  if (tokens.length === 0) return [];

  const host = process.env.APNS_PRODUCTION === "true" ? HOST_PROD : HOST_DEV;
  const jwt = providerToken();
  const bundleId = env("APNS_BUNDLE_ID");
  const payload = JSON.stringify({
    aps: {
      alert: { title: alert.title, body: alert.body },
      sound: "default",
      ...(alert.badge === undefined ? {} : { badge: alert.badge }),
      ...(alert.threadId ? { "thread-id": alert.threadId } : {}),
    },
    ...(alert.route ? { route: alert.route } : {}),
  });

  const client = http2.connect(host);
  client.on("error", () => {});

  try {
    return await Promise.all(
      tokens.map(
        (token) =>
          new Promise<SendResult>((resolve) => {
            const request = client.request({
              ":method": "POST",
              ":path": `/3/device/${token}`,
              "apns-topic": bundleId,
              "apns-push-type": "alert",
              "apns-priority": "10",
              authorization: `bearer ${jwt}`,
            });
            let status = 0;
            let body = "";
            request.on("response", (headers) => {
              status = Number(headers[":status"] ?? 0);
            });
            request.setEncoding("utf8");
            request.on("data", (chunk) => (body += chunk));
            request.on("error", () =>
              resolve({ token, status: 0, expired: false, reason: "network" })
            );
            request.on("end", () => {
              let reason: string | undefined;
              try {
                reason = body ? (JSON.parse(body).reason as string) : undefined;
              } catch {
                reason = body || undefined;
              }
              // 410 Gone, and 400/BadDeviceToken, both mean: stop sending here.
              const expired =
                status === 410 || reason === "BadDeviceToken" || reason === "Unregistered";
              resolve({ token, status, expired, reason });
            });
            request.end(payload);
          })
      )
    );
  } finally {
    client.close();
  }
}
