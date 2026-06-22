# Going live — step-by-step

This turns LifeSwap from a local emulator demo into a real, public site on a real
Firebase project + Netlify. You'll need two free accounts: **Firebase** (Google)
and **Netlify**. Everything in the codebase is already prepared.

Estimated time: ~30–45 minutes.

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** → name it (e.g. `lifeswap`).
2. In the project, open **Build → Authentication → Get started** → **Sign-in method** →
   enable **Email/Password** (and **Google** if you want Google sign-in).
3. Open **Build → Firestore Database → Create database** → start in **production mode** →
   pick a region close to your users.
4. Open **Project settings (gear) → General → Your apps → Web app (</>)** → register an
   app. Copy the `firebaseConfig` values — you'll paste them into Netlify in step 4.

## 2. Deploy the security rules

The real database needs the rules from `firestore.rules` (without them, Firestore
denies everything in production mode). From the `lifeswap/` folder:

```bash
npx firebase login                 # opens a browser to sign in
npx firebase use --add             # pick the project you just created; alias "default"
npx firebase deploy --only firestore:rules
```

(Optional, recommended) In the Firebase console, add the **"Trigger Email"** extension
and the **booking/report emails** in the `mail` collection will actually send — see
`LAUNCH_CHECKLIST.md` section B. Password-reset emails already work without it.

## 3. (Optional) seed demo data into the real project

Only if you want sample users/services in production (usually you don't):

```bash
# point the seed at the real project instead of the emulator
FIRESTORE_EMULATOR_HOST= FIREBASE_AUTH_EMULATOR_HOST= \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id> npm run seed
```

## 4. Deploy to Netlify

1. Push this code to a Git repo (GitHub/GitLab) — or use the Netlify CLI from `lifeswap/`.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   - **Base directory:** `lifeswap`  (only if you imported the parent `LifeSwap/` folder)
   - Build command and plugin come from `netlify.toml` automatically.
3. **Site settings → Environment variables** → add the six values from step 1, plus the
   flags (see the list below).
4. **Deploy.** When it's live, copy your Netlify URL.

## 5. Final wiring

1. **Authorized domain:** Firebase console → Authentication → Settings →
   **Authorized domains** → add your Netlify domain (so login works there).
2. **App URL:** set `NEXT_PUBLIC_APP_URL` to your Netlify URL (re-deploy after).
3. **Make yourself admin:** in Firestore, open your `users/{uid}` doc and set
   `role: "admin"` so you can reach the admin panel.

---

## Environment variables (Netlify)

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
```

These `NEXT_PUBLIC_*` Firebase values are **not secrets** — they're meant to ship in the
client. The real security boundary is the deployed `firestore.rules`.

## Not yet wired (see LAUNCH_CHECKLIST.md)

- **Real payments** (Stripe/PayPal) — "Pay now" is still simulated.
- **Email delivery** — booking/report emails queue into `mail` but need the Trigger
  Email extension to actually send.
