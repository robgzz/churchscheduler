# Westbury Church Hub V6.3.0

## Apple review readiness
- Added self-service **Delete Account** flow for signed-in non-owner accounts.
- Requires the current password plus two explicit confirmations.
- Reuses deterministic member-deletion safety checks: Church Administrator protection, program-admin handoff protection, active child handoff protection, future assignment release, task cleanup, session revocation, and audit history.
- Added public **Support** and **Privacy Policy** links in Profile.

## Schedule readability
- All worship-program cards now start **collapsed**.
- The date, service name/time, readiness state, and missing-song status remain visible at a glance.
- Members expand only the program they want to read.
- Share controls and assignment details remain inside the expanded card.

## Native iOS QA
- V6.3.0 remains compatible with the existing Capacitor iOS workflow.
- After deployment, run `npm install --include=dev`, `npx cap sync ios`, open Xcode, set Version 6.3.0 and increment Build, Archive, upload, then test the uploaded build on a physical iPhone through TestFlight Internal Testing before App Review.
