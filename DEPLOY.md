# Deploying LifeSwap on Netlify

This app is designed to stay on Netlify. Next.js route handlers run as Netlify
Functions through `@netlify/plugin-nextjs`.

## 1. Firebase

1. Create a Firebase project.
2. Enable Authentication providers: Email/Password and optionally Google.
3. Create a Firestore database in production mode.
4. Register a Web App and copy the Firebase web config values.
5. Create a service-account private key for the Admin SDK.

Deploy rules from this folder:

```bash
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore:rules
```

## 2. Netlify

Import the repo in Netlify.

- Base directory: `lifeswap` if Netlify is connected to the parent repo.
- Build command: `npm run build`
- Node version is set in `netlify.toml`.

Set environment variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_WEBHOOK_ID=...

RESEND_API_KEY=...
EMAIL_FROM="LifeSwap <hello@your-domain.com>"
INTERNAL_API_SECRET=generate-a-long-random-value
```

After the first deploy:

1. Add the Netlify domain in Firebase Auth authorized domains.
2. Set `NEXT_PUBLIC_APP_URL` to the final Netlify URL and redeploy.
3. Set your own Firestore user doc to `role: "admin"`.
4. Test one free booking and one PayPal sandbox booking.

## Local Emulator

```bash
npm run emulators
npm run seed
npm run dev
```

Use `.env.local` with Firebase web values and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.
