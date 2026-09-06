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
26+ with Xcode 26+), and keeps one Capacitor web view alive across tab changes.
`mobile/native-tabs.ts` connects route selection, unread badges, and the resolved
web theme to the native controller. The Account tab opens the existing account
sheet. Native navigation hides during web dialogs and keyboard presentation.
Browser/Android builds and older iOS binaries without the plugin use web tabs.

This change requires a new native build, not just a web reload. Before release,
compile with Xcode 26+ or the EAS build workflow and check on a device:

- Sign in/out; switch Home, Explore, Messages, and Account without losing state.
- Open service links and account/admin routes; confirm the selected tab follows.
- Open Account and booking/report dialogs; confirm tabs cannot intercept touches.
- Focus/dismiss the chat keyboard, rotate, and scroll to the last content row.
- Check unread badges, both themes, VoiceOver, and Reduce Transparency.
- Verify glass over scrolling content on iOS 26+ and standard tabs on older iOS.

Native compilation and device appearance must be verified separately from
`npm run check`, `npm run build`, and `npm run verify:ios`.
