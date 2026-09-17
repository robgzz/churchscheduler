# Westbury Church Hub V6.2.0

V6.2.0 is a reliability and native-iOS readiness release built on V6.1.0 and DCE 4.0.

## Administrator console recovery

V6.1.0 contained a packaging regression: `public/assets/admin.js` defined the canonical `init()` routine but did not invoke it after the module was imported by `admin-loader.js`. The browser therefore stayed on `Cargando administración…` indefinitely without producing an API error. V6.2.0 restores one canonical `init();` bootstrap call and adds a regression test so this cannot silently return.

The accidental Exonuvia OIDC script does not modify Church Hub source files; the observed admin-console symptom is explained by the missing V6.1 client bootstrap call.

## Mobile navigation cleanup

Chat Hub is removed from the bottom icon tray. The floating Chat Hub button and Home Chat card remain available, so mobile users keep the simpler access point without duplicate navigation.

## iOS readiness

- Adds `@capacitor/ios` 8.5.1.
- Changes native token registration from hard-coded Android to the actual Capacitor platform.
- Accepts both `android` and `ios` push devices.
- Adds APNs provider support while preserving FCM for Android.
- Adds APNs environment recovery (production/sandbox token mismatch handling).
- Adds secure Azure configuration script `scripts/configure-apns-push.ps1`.
- Adds `docs/IOS-PACKAGING-V6.2.md`.
- Keeps the existing production `server.url` intentionally for current session/authentication stability during the first native iOS packaging cycle.

## Cache/version

PWA shell and asset query versions are bumped to `v620`.
