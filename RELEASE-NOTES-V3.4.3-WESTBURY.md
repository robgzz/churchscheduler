# Westbury Church Scheduler V3.4.3

Native Android push notification release.

- Adds Capacitor Push Notifications registration from the member app.
- Stores device registrations in the new `PushDevices` table.
- Adds Firebase Admin/FCM sending from the Azure backend.
- Adds Push as a third test channel in Admin > Advanced > Communications.
- Queues native push for announcements, worship assignment notifications/reminders, Program Admin alerts, petitions and visitor alerts.
- Logs push attempts in `NotificationLogs`.
- Automatically deactivates invalid/expired FCM tokens.
- Adds `scripts/configure-firebase-push.ps1` so the Firebase service-account credential can be placed into Azure as a secret without committing it to GitHub.
- Android package ID remains `com.exonuvia.westburychurchscheduler`.

The Firebase `google-services.json` file is intentionally not included in this package; use the file downloaded from Firebase for the Westbury Android app.
