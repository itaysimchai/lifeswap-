# LifeSwap iOS

Read **START-HERE.md** for the TestFlight steps and remaining release requirements.

This is a Capacitor 8 iOS app with locally bundled React screens adapted from
`itaysimchai/lifeswap-` (a5cd96325f9e22bbaba76b4973ddb2792ce1dad6).
The original GitHub repository and deployed Sites app were not modified by this
mobile build. No paid Apple services were created or purchased.

The mobile adapter is under `mobile/`: React Router replaces Next routing, the
Capacitor HTTP transport forwards only supported booking/cancellation operations,
and Capacitor Browser opens external checkout links. Firebase JS Auth and
Firestore retain the existing accounts and permissions. Public web configuration
is in `src/lib/public-config.ts`; no server or signing secrets are included.

Commands:

```sh
npm ci
npm run check
npm test
npm run build
npx cap sync ios
npx cap open ios
```

Node 22+ is required; use Xcode 26+ on a Mac to compile. `ios/App/App.xcodeproj`
is the generated native project. The app identifier is a proposed value and
must match your registered Apple app. Signing team is intentionally unset.

The included built assets are useful for inspecting the package. Always run
`npm run ios:sync` after changing source before archiving with Xcode.

### Native iOS navigation

The iOS scene hosts `LifeSwapTabController` in `ios/App/App/NativeTabs.swift`.
It uses Apple's standard `UITabBarController` appearance (Liquid Glass on iOS
26+ with Xcode 26+). One Capacitor web view is parented to that controller for
the lifetime of the app - the four child view controllers are empty and exist
only to carry tab items, so selecting a tab never detaches the web view.
`mobile/native-tabs.ts` connects route selection, unread badges, and the resolved
web theme to the native controller. Every tab is a destination: Account goes to
Profile & Settings, which is where signing out and becoming a provider live.
Native navigation hides during web dialogs and keyboard presentation, and the
chat composer lifts by `--keyboard-inset` so the keyboard never covers it.
Browser/Android builds and older iOS binaries without the plugin use web tabs.

This change requires a new native build, not just a web reload. Before release,
compile with Xcode 26+ or the EAS build workflow and check on a device:

- Sign in/out; switch Home, Explore, Messages, and Account without losing state,
  and watch for a blank frame or flicker at the moment the tab changes.
- Open service links and account/admin routes; confirm the selected tab follows.
- Open a conversation: the back chevron returns to the list, the title shows the
  other person, and typing lifts the composer clear of the keyboard.
- Open booking/report dialogs; confirm tabs hide and cannot intercept touches.
- Focus/dismiss the chat keyboard, rotate, and scroll to the last content row.
- Check unread badges, both themes, VoiceOver, and Reduce Transparency.
- Verify glass over scrolling content on iOS 26+ and standard tabs on older iOS.

### Push notifications

Remote push goes straight to APNs. The device token comes from
`@capacitor/push-notifications`, and `functions/src/apns.ts` signs its own ES256
JWT with a .p8 key, so the native project needs neither the Firebase iOS SDK nor
`GoogleService-Info.plist`. `ios/App/App/App.entitlements` carries
`aps-environment` and is wired into both build configurations.

Before push can work, all of which require a paid Apple Developer account:

1. Enable the Push Notifications capability on the App ID for
   `com.itaysimchai.lifeswap`, and regenerate the provisioning profile.
2. Create an APNs Auth Key (.p8) and note its Key ID and your Team ID.
3. Set the function secrets and config:

   ```sh
   firebase functions:secrets:set APNS_KEY      # paste the .p8 contents
   firebase functions:secrets:set APNS_KEY_ID
   firebase functions:secrets:set APNS_TEAM_ID
   # APNS_BUNDLE_ID and APNS_PRODUCTION go in functions/.env
   ```

   `APNS_PRODUCTION=true` selects Apple's production host - required for
   TestFlight and App Store builds, wrong for a development build.
4. Upgrade the Firebase project to the Blaze plan (Cloud Functions requires it)
   and `npm --prefix functions run deploy`.
5. Deploy the Storage rules that gate avatar uploads:
   `firebase deploy --only storage`.

Until steps 1-4 are done the Settings toggle will fail with a registration
error, which it reports inline rather than silently pretending to be on.

Native compilation and device appearance must be verified separately from
`npm run check`, `npm run build`, and `npm run verify:ios`.
