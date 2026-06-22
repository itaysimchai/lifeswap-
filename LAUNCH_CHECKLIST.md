# LifeSwap — Launch Checklist

Things to do before this becomes a real, money-handling, publicly-launched product.
Grouped by goal. The two you specifically asked about (real payments, real email) are
sections **A** and **B**.

---

## A. Accept real money (Payments — Stripe + PayPal)

Currently "Pay now" is **simulated** in `bookService` (`src/lib/actions.ts`) — no charge.

**Important design change for real money:** today we create the booking *then* "pay".
With real payments the order must flip — **payment first, booking created only after the
payment provider confirms** (via webhook), so nobody gets a confirmed booking without paying.

- [ ] Create a **Stripe** account; get publishable + secret API keys (test, then live).
- [ ] Create a **PayPal Business** account; get client ID + secret.
- [ ] Decide the money model: who gets paid, platform fee/commission, currency, taxes/VAT,
      refunds. If you pay providers out, you likely need **Stripe Connect** (onboarding,
      KYC, payouts).
- [ ] Build a **server checkout** (Stripe Checkout Session / Payment Intents; PayPal Orders
      create+capture). On Netlify this is a Next.js route handler or a Firebase Cloud Function.
- [ ] Add **webhooks** (Stripe + PayPal) that, on a confirmed payment, create the booking as
      `confirmed`, open the chat, and queue the emails — server-side with the Admin SDK.
- [ ] Replace the simulated step in `bookService` with "start checkout"; move booking creation
      to the webhook.
- [ ] Store a payment record (provider, amount, status, payment id) per booking.
- [ ] Tighten `serviceRequests` rules so clients can no longer self-create `confirmed`
      bookings (only the server/webhook should).

## B. Actually send emails (real email provider)

Currently booking emails are **queued** into the `mail` collection (Trigger Email format) but
**not delivered**. Content + calendar links are built in `src/lib/email.ts`.

- [ ] Pick a provider: **SendGrid**, **Mailgun**, **Resend**, or SMTP.
- [ ] Install the Firebase **"Trigger Email" extension** (`firestore-send-email`) and point it
      at that provider — it auto-sends every doc written to `mail`. (Or send via the provider's
      API from a Cloud Function.)
- [ ] Set up a **sending domain** with SPF / DKIM / DMARC for deliverability (or you'll land in
      spam). Set From + Reply-To addresses.
- [ ] **Move email enqueue server-side** (Cloud Function triggered on booking create) so
      clients can't send arbitrary mail, then lock the `mail` rule to server-only.
- [ ] (Optional) attach a real `.ics` file to the emails in addition to the calendar links —
      some clients prefer an attachment.

## C. Finish the app (remaining pages) — ✅ DONE (2026-06-18)

- [x] **`my-services`** — providers create/edit/remove services, set price, availability
      (dates/times), and optional LinkedIn (`ServiceFormDialog`).
- [x] **`profile`** — reads/writes `users/{uid}` (display name, photo URL, provider status).
- [x] **`admin/applications`** — wired to `useApplications` + `reviewApplication` (tabs).
- [x] **`admin/users`** — wired to `useUsers` + `setUserBlocked`; **blocking is enforced in
      `firestore.rules`** (a blocked user can't book/message/publish/apply — verified).
- [x] Fixed the stale `serviceSchema` in `validations.ts` (was checklist item G).

## D. Go live (deployment)

- [ ] Create a **real Firebase project**; enable Auth providers (Email/Password + Google).
- [ ] Fill real `NEXT_PUBLIC_FIREBASE_*` in Netlify env; set
      `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`.
- [x] Add Netlify config (`netlify.toml` + `@netlify/plugin-nextjs`). ← done; deploy steps in `DEPLOY.md`.
- [ ] **Deploy security rules** to the real project: `firebase deploy --only firestore:rules`.
- [ ] Follow **`DEPLOY.md`** for the full go-live walkthrough (Firebase project, env, Netlify, admin).
- [ ] Add your Netlify domain to Firebase Auth **authorized domains**.
- [ ] Run `npm run seed` against the real project only if you want demo data (usually not in prod).

## E. Security & reliability hardening

- [ ] **Firestore composite indexes** — we avoid them now by sorting client-side; if you add
      `where + orderBy` queries, create `firestore.indexes.json` and deploy.
- [ ] Enable **Firebase App Check** (blocks bots/abuse of your Firestore + functions).
- [ ] Move privileged writes (mail, payment confirmation) to **Cloud Functions / Admin SDK**.
- [ ] Add **rate limiting / abuse protection** on bookings and email.
- [ ] Consider **admin via custom claims** instead of reading the user doc in rules.
- [ ] Set up **backups** and a basic monitoring/alerting story.

## F. Product gaps worth planning

- [ ] **Cancellation & refund** flow (what happens to the booking, chat, calendar, money).
- [ ] **Time zones** — availability, booking times, and calendar links are currently naive
      local time; store/display per the user's timezone.
- [ ] **Configurable session duration** (calendar links hardcode 60 min in `src/lib/email.ts`).
- [ ] **Double-booking prevention** — two customers can currently book the same slot; add slot
      locking / availability decrement.
- [ ] **Reschedule** flow beyond "message the host."
- [ ] **Provider photos** (`providerPhotoURL` on services) — cards show initials only today.
- [ ] **Reviews/ratings** (was in the original concept; cut during the rebuild).
- [ ] **In-app notifications** for new bookings/messages.

## G. Cleanup / tech debt

- [ ] **Trim `src/lib/validations.ts`** — the `serviceSchema` is stale (fields don't match the
      `Service` model) and there are dead schemas (booking/review/report/availability/host).
- [x] **Removed the duplicate root `package-lock.json`** — the workspace-root build warning
      is gone (verified with a clean `npm run build`).
- [ ] Add **Terms / Privacy** pages (real businesses need them; footer no longer links to stubs).
- [ ] Remove the now-unused `respondToRequest` in `actions.ts` if the no-approval flow stays.
