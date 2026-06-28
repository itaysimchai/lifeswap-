# LifeSwap Launch Checklist

## Payments

- [ ] Create a PayPal Business account.
- [ ] Use sandbox credentials first: `PAYPAL_ENV=sandbox`.
- [ ] Add `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
- [ ] Create a PayPal webhook and set `PAYPAL_WEBHOOK_ID`.
- [ ] Test a paid booking end to end in sandbox.
- [ ] Test cancellation/refund before going live.
- [ ] Switch to live credentials only after sandbox bookings and refunds work.

## Firebase

- [ ] Create production Firebase project.
- [ ] Enable Auth providers.
- [ ] Create Firestore database.
- [ ] Deploy `firestore.rules`.
- [ ] Add Netlify domain to Firebase Auth authorized domains.
- [ ] Set your account `role` to `admin`.

## Email

- [ ] Create a Resend account.
- [ ] Verify a sending domain.
- [ ] Set `RESEND_API_KEY`.
- [ ] Set `EMAIL_FROM` to the verified sender.
- [ ] Set `INTERNAL_API_SECRET` so the legacy email route remains internal-only.
- [ ] Confirm booking and cancellation emails arrive.

## Security

- [x] Paid bookings are PayPal-only and created server-side.
- [x] Free bookings are created server-side.
- [x] Clients cannot write bookings, payments, slot locks, or mail docs.
- [x] Users cannot unblock themselves in Firestore rules.
- [x] PayPal routes derive requester/provider/price from server state.
- [ ] Enable Firebase App Check.
- [ ] Add monitoring/alerts for failed payments and `needs_refund` payment docs.
- [ ] Set up Firestore backups.

## Product Follow-Ups

- [ ] Provider payout model and tax handling.
- [ ] Time-zone aware availability.
- [ ] Reschedule flow.
- [ ] Reviews/ratings.
- [ ] In-app notifications.
