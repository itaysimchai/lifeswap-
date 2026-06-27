# Turning on real payments (Stripe + PayPal)

Right now "Pay now" is **simulated** — no money moves. In `src/lib/actions.ts`,
`bookService()` has this line:

```ts
// --- Simulated payment success (replace with real Stripe/PayPal) ---------
const paymentSucceeded = true;
```

This guide replaces that fake success with a **real, verified** charge.

> **The golden rule:** never let the browser decide whether a payment happened.
> A user can edit anything the browser sends. The *server* must ask Stripe/PayPal
> "was this really paid?" and only then create the booking. Everything below is
> built around that rule.

**Estimated time:** ~3–6 hours of focused work, plus account-approval waiting
time (Stripe/PayPal can take a few hours to a couple of days to verify a
business).

**Jargon, defined once:**
- **API key / secret key** — a password your server uses to talk to Stripe/PayPal.
  The *secret* key must NEVER appear in the browser; it lives only in server env vars.
- **Publishable key** — a non-secret key that's safe to use in the browser.
- **Webhook** — Stripe/PayPal calling *your* server to say "this payment is done."
  It's the most reliable signal because it arrives even if the user closes the tab.
- **Sandbox / test mode** — a fake-money environment for testing before going live.

---

## 0. The architecture change (read this first)

Today the booking is written **from the browser** (`bookService` runs client-side
and writes straight to Firestore). For real money that's not safe, so we move the
"create the booking" step to the **server**, where we can verify the payment.

New flow:

```
Browser (BookingDialog)
   │  1. user picks date/time + Card or PayPal
   ▼
Server API route  ──►  Stripe/PayPal  (create a payment for $price)
   │  2. returns a checkout URL (Stripe) or order id (PayPal)
   ▼
User pays on Stripe/PayPal
   │
   ▼
Server verifies the payment is REALLY paid
   │  3. only now:
   ▼
Server writes the booking with the Firebase Admin SDK
   (booking = "confirmed", claim slot, open chat, send emails)
```

The good news: steps 2–3 reuse the exact logic already in `bookService`. We just
move it to a server file and call it *after* verification.

---

## 1. Shared server setup (do this once, before Stripe or PayPal)

### 1a. Install the SDKs

From the `lifeswap/` folder:

```bash
npm install stripe @paypal/paypal-server-sdk
```

(`firebase-admin` and `resend` are already installed.)

### 1b. Create a Firebase Admin helper

The Admin SDK runs on the server and **bypasses Firestore security rules** (it's
trusted), so it can write the booking after payment. Create
`src/lib/firebaseAdmin.ts`:

```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Reuse one app instance across hot-reloads / serverless invocations.
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key arrives with literal "\n" — turn them into real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

export const adminDb = getFirestore(app);
```

To get those three values: Firebase console → **Project settings → Service
accounts → Generate new private key**. It downloads a JSON file containing
`project_id`, `client_email`, and `private_key`. You'll paste them into env vars
(Section 5). **This JSON is a master key to your database — never commit it.**

### 1c. Move booking-creation to the server

Create `src/lib/serverBooking.ts` — this is the verified-payment version of what
`bookService` does today, using `adminDb`:

```ts
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

export interface ConfirmedBooking {
  serviceId: string;
  serviceTitle: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  providerId: string;
  providerName: string;
  date: string;        // "yyyy-mm-dd"
  time: string;        // "HH:mm"
  price: number;
  paymentMethod: "stripe" | "paypal";
  paymentRef: string;  // Stripe session id / PayPal order id (for your records)
}

function chatIdFor(a: string, b: string, requestId: string) {
  const [x, y] = [a, b].sort();
  return `${x}_${y}_${requestId}`;
}

/** Write the booking ONLY after payment is verified. Idempotent on slot id. */
export async function createConfirmedBooking(b: ConfirmedBooking) {
  if (b.providerId === b.requesterId) throw new Error("Cannot book your own service.");

  // Claim the 1-hour slot. Deterministic id => a second booking of the same
  // slot fails, preventing double-booking.
  const slotId = `${b.serviceId}_${b.date}_${b.time.replace(":", "")}`;
  const slotRef = adminDb.collection("bookedSlots").doc(slotId);
  const slotSnap = await slotRef.get();
  if (slotSnap.exists) throw new Error("That time was just booked.");
  await slotRef.set({
    serviceId: b.serviceId,
    providerId: b.providerId,
    date: b.date,
    time: b.time,
    createdAt: FieldValue.serverTimestamp(),
  });

  const bookingRef = await adminDb.collection("serviceRequests").add({
    serviceId: b.serviceId,
    serviceTitle: b.serviceTitle,
    requesterId: b.requesterId,
    requesterName: b.requesterName,
    providerId: b.providerId,
    providerName: b.providerName,
    scheduledDate: b.date,
    scheduledTime: b.time,
    price: b.price,
    paymentMethod: b.paymentMethod,
    paymentStatus: "paid",
    paymentRef: b.paymentRef,
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Open the chat immediately (same behaviour as the simulated flow).
  const chatId = chatIdFor(b.requesterId, b.providerId, bookingRef.id);
  const opener = `Hi! I booked "${b.serviceTitle}" for ${b.date} at ${b.time}.`;
  await adminDb.collection("chats").doc(chatId).set(
    {
      participantIds: [b.requesterId, b.providerId],
      participantNames: { [b.requesterId]: b.requesterName, [b.providerId]: b.providerName },
      serviceId: b.serviceId,
      serviceTitle: b.serviceTitle,
      lastMessage: opener,
      lastMessageAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await adminDb.collection("chats").doc(chatId).collection("messages").add({
    senderId: b.requesterId,
    text: opener,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { bookingId: bookingRef.id, chatId };
}
```

> Emails: after `createConfirmedBooking`, call your existing
> `POST /api/send-booking-emails` route with the booking details (it already
> works via Resend). Keep it best-effort so a mail hiccup never undoes a paid booking.

---

## 2. Stripe (cards)

### 2a. Create the account & get keys
1. Sign up at <https://dashboard.stripe.com>. Stay in **Test mode** (toggle, top right).
2. **Developers → API keys** → copy the **Publishable key** (`pk_test_…`) and
   **Secret key** (`sk_test_…`).

### 2b. Server route: start the checkout
We'll use **Stripe Checkout** — Stripe hosts the card form, which is the simplest
and safest option (you never touch raw card numbers). Create
`src/app/api/checkout/stripe/route.ts`:

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { serviceId, serviceTitle, price, date, time, requesterId, providerId } =
    await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: serviceTitle },
          unit_amount: Math.round(price * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    // We re-read these in the webhook to build the booking. Never trust the
    // browser for the amount — Stripe tells us what was actually paid.
    metadata: { serviceId, date, time, requesterId, providerId, serviceTitle },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/success?sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
```

### 2c. Webhook: write the booking when payment completes
Create `src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { createConfirmedBooking } from "@/lib/serverBooking";

export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text(); // raw body required for signature check
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const m = s.metadata!;
    // Look up the names/emails server-side (don't trust the browser).
    const [reqSnap, provSnap, svcSnap] = await Promise.all([
      adminDb.doc(`users/${m.requesterId}`).get(),
      adminDb.doc(`users/${m.providerId}`).get(),
      adminDb.doc(`services/${m.serviceId}`).get(),
    ]);
    await createConfirmedBooking({
      serviceId: m.serviceId,
      serviceTitle: m.serviceTitle,
      requesterId: m.requesterId,
      requesterName: reqSnap.data()?.displayName ?? "",
      requesterEmail: reqSnap.data()?.email ?? "",
      providerId: m.providerId,
      providerName: provSnap.data()?.displayName ?? "",
      date: m.date,
      time: m.time,
      price: (s.amount_total ?? 0) / 100, // the amount Stripe actually charged
      paymentMethod: "stripe",
      paymentRef: s.id,
    });
  }

  return NextResponse.json({ received: true });
}
```

### 2d. Register the webhook with Stripe
- **Local testing:** install the Stripe CLI, then
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. It prints a
  `whsec_…` value → that's your `STRIPE_WEBHOOK_SECRET` for local dev.
- **Production:** Stripe Dashboard → **Developers → Webhooks → Add endpoint** →
  URL `https://your-site.netlify.app/api/webhooks/stripe`, event
  `checkout.session.completed`. Copy the signing secret (`whsec_…`) into Netlify.

### 2e. Test cards
In test mode use card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
More: <https://stripe.com/docs/testing>.

---

## 3. PayPal

### 3a. Create the account & get keys
1. Create a **Business** account at <https://www.paypal.com>, then go to the
   **Developer Dashboard**: <https://developer.paypal.com/dashboard/>.
2. Under **Apps & Credentials**, stay on **Sandbox** (test). Create an app and copy
   the **Client ID** and **Secret**.
3. Sandbox also gives you fake buyer/seller logins (under **Sandbox → Accounts**)
   to test with.

### 3b. Browser: the PayPal buttons (stays inside the modal)
PayPal renders its own buttons; you don't handle card data. In `BookingDialog`,
when the user chooses PayPal, render the buttons with the JS SDK:

```tsx
// load once, with your PUBLIC client id
<script src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`} />
```

The buttons call two server routes (next), `createOrder` then `onApprove`.

### 3c. Server: create the order
`src/app/api/paypal/create-order/route.ts`:

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const BASE = "https://api-m.sandbox.paypal.com"; // live: https://api-m.paypal.com

async function token() {
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return (await r.json()).access_token as string;
}

export async function POST(req: Request) {
  const { price } = await req.json();
  const r = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: price.toFixed(2) } }],
    }),
  });
  const order = await r.json();
  return NextResponse.json({ id: order.id });
}
```

### 3d. Server: capture + verify + write the booking
`src/app/api/paypal/capture-order/route.ts`:

```ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { createConfirmedBooking } from "@/lib/serverBooking";
// reuse the token() helper from create-order (export it from a shared file)

export async function POST(req: Request) {
  const { orderId, serviceId, date, time, requesterId, providerId } = await req.json();

  // Capture the money, then CHECK the result says "COMPLETED".
  const cap = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
  }).then((r) => r.json());

  if (cap.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }
  const paid = Number(cap.purchase_units[0].payments.captures[0].amount.value);

  const [reqSnap, provSnap, svcSnap] = await Promise.all([
    adminDb.doc(`users/${requesterId}`).get(),
    adminDb.doc(`users/${providerId}`).get(),
    adminDb.doc(`services/${serviceId}`).get(),
  ]);

  // IMPORTANT: trust the price from your own DB, not the browser.
  if (paid < (svcSnap.data()?.price ?? 0)) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 402 });
  }

  const { chatId } = await createConfirmedBooking({
    serviceId,
    serviceTitle: svcSnap.data()?.title ?? "",
    requesterId,
    requesterName: reqSnap.data()?.displayName ?? "",
    requesterEmail: reqSnap.data()?.email ?? "",
    providerId,
    providerName: provSnap.data()?.displayName ?? "",
    date,
    time,
    price: paid,
    paymentMethod: "paypal",
    paymentRef: orderId,
  });

  return NextResponse.json({ ok: true, chatId });
}
```

---

## 4. Lock down Firestore (critical)

Once the server creates bookings, **stop the browser from creating them** — otherwise
someone could still write a "paid" booking without paying. In `firestore.rules`:

```
match /serviceRequests/{requestId} {
  allow read: if signedIn()
    && (resource.data.requesterId == uid() || resource.data.providerId == uid());
  allow create: if false;   // server (Admin SDK) only — see PAYMENTS.md
  allow update: if signedIn()
    && (resource.data.providerId == uid() || resource.data.requesterId == uid());
}

match /bookedSlots/{slotId} {
  allow read: if signedIn();
  allow create: if false;   // server only
  allow update: if false;
  allow delete: if isAdmin();
}
```

Deploy the rules: `npx firebase deploy --only firestore:rules`.
(The Admin SDK ignores these rules, so the server still works.)

---

## 5. Environment variables

**Local** — add to `lifeswap/.env` (never commit real secrets):

```
# Firebase Admin (from the service-account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe (test)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal (sandbox)
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
```

**Netlify** — add the same keys under **Site settings → Environment variables**,
but with **live** values once you go live (Section 7). `NEXT_PUBLIC_APP_URL` must
already be your real Netlify URL (it's used for Stripe's success/cancel redirects).

> The `FIREBASE_PRIVATE_KEY` is multi-line. Paste it wrapped in double quotes with
> the `\n` characters intact, exactly as in the JSON. The helper in
> `firebaseAdmin.ts` converts them back to real newlines.

---

## 6. Wire the BookingDialog

In `src/components/booking/BookingDialog.tsx`, replace the call to `bookService`:

- **Card chosen →** `POST /api/checkout/stripe` with the booking details, then
  `window.location.href = data.url` (redirect to Stripe). After paying, Stripe
  sends the user to `/booking/success`, and the webhook creates the booking. Build
  a small `src/app/booking/success/page.tsx` that shows the existing "Booking
  confirmed" screen and a link to Messages.
- **PayPal chosen →** render the PayPal buttons; their `createOrder` calls
  `/api/paypal/create-order` and `onApprove` calls `/api/paypal/capture-order`.
  On success, show the same confirmation screen (you already have it in the dialog).

Then delete the simulated block in `bookService` (or keep `bookService` only for
local/dev with a `NEXT_PUBLIC_USE_FAKE_PAYMENTS` flag — handy for testing the rest
of the app without real money).

---

## 7. Going live

1. **Stripe:** finish **Activate account** (business details, bank account). Switch
   the dashboard to **Live mode**, copy the live `sk_live_…` / `pk_live_…`, create a
   **live** webhook endpoint, and put the live keys in Netlify.
2. **PayPal:** switch the app to **Live** credentials and change `BASE` to
   `https://api-m.paypal.com`. Use your live Client ID/Secret in Netlify.
3. Redeploy (push to `main`).
4. Do one **real** small booking with a real card to confirm money lands in your
   Stripe/PayPal balance and the booking + chat appear.

---

## 8. Money & legal notes (don't skip)

- **Fees:** roughly **2.9% + $0.30** per charge on both Stripe and PayPal (varies by
  country). A $40 session nets you ~$38.5.
- **Payouts to providers:** the code above sends 100% to *your* account. If you need
  to pay providers their share automatically, that's **Stripe Connect** (a bigger
  project) — otherwise you pay them out manually.
- **Refunds/cancellations:** decide a policy. Refunds are a dashboard click (or an
  API call) and you'll likely want a "cancel booking" feature that also frees the
  `bookedSlots` doc.
- **Taxes & terms:** selling services online may require updated Terms/Privacy and
  tax handling. You already have `/terms` and `/privacy` pages to update.

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Webhook 400 "Bad signature" | Wrong `STRIPE_WEBHOOK_SECRET`, or the body was parsed before the signature check (must use `req.text()`). |
| Booking never appears after paying | Webhook not reaching the server — check the URL and that the event type is `checkout.session.completed`. |
| `FIREBASE_PRIVATE_KEY` errors | Newlines not converted — keep the `.replace(/\\n/g, "\n")` and wrap the value in quotes. |
| "Missing permissions" writing the booking | You're using the client SDK, not `adminDb`. Server writes must use `firebaseAdmin.ts`. |
| Money works but amount is wrong | You trusted the price from the browser. Always read `price` from the `services` doc / the amount the provider returns. |

---

### Want me to build it instead of just guiding?
I can implement all of this for you (the Admin helper, both providers' API routes,
the rules lockdown, and the BookingDialog rewiring). You'd still need to create the
Stripe/PayPal accounts and paste the keys — those require your identity and bank
details. Say the word and I'll wire it up, starting with **Stripe** (simplest) or
**PayPal**, your call.
```
