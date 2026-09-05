# LifeSwap iOS — first TestFlight build candidate

This package contains the mobile source, a generated Xcode project, and bundled
web assets. It is not a signed IPA and has not been uploaded to TestFlight.
The iOS binary must still be compiled and tested with Xcode.

## What you can test

- Sign in with an existing LifeSwap email/password account; register and reset passwords.
- Browse and filter services, open provider details, and manage your profile.
- Book free sessions, view sessions, and message providers through the existing backend.
- Open paid checkout in an in-app Safari browser. Sign in there with the same account
  and choose the date/time on the website. Return using Done; sessions and messages
  load from the shared Firebase data.
- Existing provider and admin screens, subject to the user's existing permissions.
- iPhone bottom tabs, safe-area spacing, local interface/fonts, and offline notices.

The app uses the real `lifeswap-cd713` Firebase project and the existing
`https://lifeswapp.netlify.app` booking backend. Actions in this build affect live
LifeSwap records. No seed scripts or test bookings were run during preparation.

## Install and open on a Mac

You need Node.js 22 or newer, Xcode 26 or newer, and an Apple Developer Program
membership for TestFlight distribution. Windows alone cannot compile an iOS
archive; use a Mac or an authorized macOS build runner.

1. Extract this ZIP on the Mac.
2. Open Terminal in the extracted `LifeSwap-iOS` folder.
3. Run `npm ci`, then `npm run ios:sync`.
4. Open `ios/App/App.xcodeproj`. Wait for Swift packages to resolve.
5. Select the App target → Signing & Capabilities. Choose your Apple Developer team
   and enable Automatically manage signing.
6. The proposed bundle identifier is `com.itaysimchai.lifeswap`. Register it in
   your account or change it to an available identifier you control. If you change
   it, update both `capacitor.config.json` and the Xcode target.
7. Select an iPhone simulator, then a connected iPhone, and run the checks below.

Alternatively, run `bash scripts/prepare-ios.command` on the Mac to install,
rebuild, sync, and open Xcode.

## Upload to TestFlight

1. Create an iOS app named LifeSwap in App Store Connect using the same bundle ID.
2. In Xcode, select the App scheme and Any iOS Device (arm64).
3. Confirm Version 1.0 and Build 1; increment the build number for later uploads.
4. Product → Archive. In Organizer choose Distribute App → App Store Connect → Upload.
5. Complete Apple's signing, validation, and export-compliance questions truthfully.
6. Wait for Apple to process the build, then open App Store Connect → TestFlight.
7. Start with an internal test group. External testing requires Apple's beta review
   and complete beta information, including a working review account.

No Apple account password, signing certificate, provisioning profile, or API key
is included. Set up signing in your own Apple account; do not put private keys in
this project or send them in chat.

## Checks still required on iPhone

- Email sign-in, sign-out, password reset, and reopening the app after termination.
- Service search, provider details, and large text sizes.
- A controlled free booking and cancellation with authorized test accounts.
- Two-account messaging, keyboard layout, and message updates after backgrounding.
- Paid checkout browser handoff, signing in there, returning to the app, and booking sync.
  Payments use the existing site's configured payment environment; verify it before testing.
- Offline/reconnection, portrait and landscape, and provider/admin role restrictions.
- Xcode Archive validation and the generated privacy report.

## Known release work

- Native Google and Sign in with Apple are not configured. This beta deliberately
  exposes email/password sign-in only. Google-only users need an email/password
  sign-in method configured before using this beta.
- Paid checkout is the existing browser flow, not an embedded PayPal SDK flow.
  Date/time selections in the native dialog do not carry into browser checkout.
- Account creation is inherited, but the existing backend has no self-service
  account-deletion endpoint. Complete a secure in-app deletion flow before
  submitting for external beta/App Store review. Do not delete only Firebase Auth
  while leaving associated profile and personal data behind.
- Verify the existing reporting/moderation flow, user-blocking requirements,
  privacy disclosures, support contact, and age rating before external review.
- Payment rules depend on the service sold and storefront. Confirm that offerings
  are eligible real-time one-to-one services before using the existing payment
  approach; group sessions and digital content need a separate review.

These are submission prerequisites, not claims of Apple approval.

## Verified here

The production web bundle built, TypeScript checks passed, and three URL/backend
policy tests passed. Capacitor generated and synchronized the iOS project.
Plist/XML, icon assets, and packaged file references were checked.
Xcode compilation, device testing, signing, upload, and transactions were not run.

## Official references

- Capacitor iOS: https://capacitorjs.com/docs/ios
- Apple upload steps: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- TestFlight: https://developer.apple.com/testflight/
- Apple review requirements (sections 1.2, 3.1.3, 5.1.1): https://developer.apple.com/app-store/review/guidelines/
