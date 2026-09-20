# Westbury Church Hub V6.3.0 — Native iOS TestFlight QA

Use this flow to test the native iOS build on a physical iPhone before App Review.

1. Deploy V6.3.0 to Azure first.
2. On the Mac, in the V6.3.0 project folder:
   - `npm install --include=dev`
   - `npx cap sync ios`
   - `npx cap open ios`
3. In Xcode select TARGETS > App > General.
   - Version: `6.3.0`
   - Build: increment to a number higher than the previous upload (for example `2`).
4. Confirm TARGETS > App > Signing & Capabilities:
   - Team: your paid Apple Developer team
   - Bundle ID: `com.exonuvia.westburychurchscheduler`
   - Automatically manage signing: ON
   - Push Notifications capability present
5. Select `Any iOS Device (arm64)` / generic iOS device and run Product > Archive.
6. In Organizer select the new archive, then Distribute App > App Store Connect > Upload.
7. Wait until the build finishes processing in App Store Connect > TestFlight.
8. In TestFlight create or reuse an Internal Testing group, add your Apple ID as a tester, and add the V6.3.0 build to that group.
9. On the physical iPhone install Apple's TestFlight app, sign in with the tester Apple ID, and install Westbury Church Hub V6.3.0.
10. Test the native build from the installed app icon, not Safari.

## Physical-device QA checklist
- Cold launch from fully closed state
- Login and logout
- Home rendering and navigation
- Schedule: all program cards start collapsed; expand/collapse multiple programs
- Personal assignments and replacement request
- Song selection flow for a Cantos assignment
- Events / RSVP
- Church news / bulletin
- Prayer requests
- Children / caregiver areas when authorized
- Chat Hub read-only and allowed action flows
- English / Spanish switch
- Light / dark theme
- Push notification permission and registration
- Profile contact edits and password change
- Support and Privacy Policy links
- Delete Account flow with a disposable non-owner test account
- Background, foreground, lock-screen, and terminated push behavior
- Relaunch after network interruption
- Rotate device and return to portrait

## App Review recording
Record on the physical iPhone. Start with the app closed, launch it from the icon, then demonstrate login and the normal member flow. Include account deletion using a disposable review/test account if the build supports account creation. Do not expose real child pickup codes, private prayer requests, passwords, or other sensitive data.
