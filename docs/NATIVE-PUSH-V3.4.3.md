# Native Android Push - V3.4.3

Westbury Church Scheduler V3.4.3 adds Firebase Cloud Messaging (FCM) for the Android Capacitor app.

## Files intentionally NOT included

`android/app/google-services.json` and the Firebase service-account JSON are not committed or packaged. Use the Westbury Firebase files you downloaded.

## After deploying V3.4.3

1. Keep `android/app/google-services.json` in your local Android project.
2. In Firebase Console > Project settings > Service accounts, generate a private key JSON for the backend.
3. Run from PowerShell:

```powershell
.\scripts\configure-firebase-push.ps1 `
  -ServiceAccountJson "C:\path\to\firebase-service-account.json" `
  -FirebaseProjectId "YOUR_FIREBASE_PROJECT_ID"
```

Defaults target resource group `rg-church-scheduler-v2`, Container App `westburyapp-web`, and scheduler job `westburyapp-scheduler`. Override those parameters if your Azure names differ.

4. Deploy/push V3.4.3 to Azure.
5. From the repo root run `npx cap sync android`, then run the Android app.
6. Sign in and allow notification permission when Android prompts.
7. Open Admin > Settings > Communications. Native push should show Configured.
8. Select your member, choose Push, and send a test.

Device registrations are stored in the Azure Table `PushDevices`. Push attempts are written to `NotificationLogs`.
