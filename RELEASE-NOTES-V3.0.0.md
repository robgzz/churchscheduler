# Church Scheduler V3.0.0

## Communications and audit release

- Church Administrator-only Advanced > Communications console with member-targeted Email/SMS tests.
- Displays configured ACS sender email and SMS number plus recent test/send results.
- All ACS sends are recorded in NotificationLogs.
- Durable NotificationQueue prevents duplicate delivery and retries failed sends up to three times.
- Announcements queue email and SMS to active members that have those contact methods (unless explicitly opted out). Only announcement text/address are sent; attachments are never embedded in notifications.
- Worship assignments queue email and SMS 30 minutes after a new assignment becomes visible in the app, plus reminders 3 days and 1 day before service.
- Admins receive SMS alerts for new petitions and visitor forms.
- Announcement activity address field opens Apple Maps on iOS, geo/installed Maps on Android, with Google Maps web fallback.
- Audit export supports CSV, Excel-compatible .xls, and PDF with who/what/when/replacement/reliability/source/detail fields.
- Scheduler job checks communication queue every 5 minutes.
- ACS remains server-side through Managed Identity; no ACS endpoint credential or secret is returned to browsers.
