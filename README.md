# LifeSwap

LifeSwap is a Firebase-backed marketplace for booking knowledge-based sessions:
mentoring, coaching, teaching, and expert help. It runs on Next.js and Netlify,
uses Firebase Auth/Firestore for identity and data, and supports PayPal for paid
bookings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.9 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Components | Radix UI + CVA |
| Auth | Firebase Auth |
| Database | Cloud Firestore |
| Server trust | Firebase Admin SDK |
| Payments | PayPal Orders/Captures |
| Email | Resend |
| Deploy | Netlify + `@netlify/plugin-nextjs` |

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

For local Firebase testing:

```bash
npm run emulators
npm run seed
```

## Required Production Env

Set these in Netlify:

- `NEXT_PUBLIC_FIREBASE_*` web app config values
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`
- `NEXT_PUBLIC_APP_URL=https://your-site.netlify.app`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `PAYPAL_ENV=sandbox` or `live`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `INTERNAL_API_SECRET`

See [DEPLOY.md](./DEPLOY.md) for the go-live walkthrough.

## Important Flows

- Paid booking: browser asks `/api/paypal/create-order`, PayPal confirms payment,
  then `/api/paypal/capture-order` creates the booking server-side.
- Free booking: browser calls `/api/bookings/free`; the server validates the user,
  service, slot, and creates the booking.
- Slot locking: server writes `bookedSlots` for display and `slotLocks` for
  overlap prevention.
- Emails: booking/cancellation emails are sent server-side through Resend.
- Firestore rules: clients cannot create bookings, payments, slot locks, or mail.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run emulators
npm run seed
```

## Notes

Firestore rules must be deployed before production use:

```bash
npx firebase deploy --only firestore:rules
```

Make your own account admin by setting `users/{uid}.role` to `admin` in Firestore.
