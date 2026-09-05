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
