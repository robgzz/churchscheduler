# Church Scheduler V3.1.0

## Member UX and bilingual consistency
- Completed missing Spanish availability strings so the selected locale is respected.
- Church name in the mobile header wraps instead of truncating with ellipsis.
- Replacement confirmation uses an in-app modal (no browser hostname banner) and neutral wording.
- Announcement/bulletin attachment cards show a generic Download action instead of exposing the uploaded filename.
- Scheduled absence is moved to the top of Profile and remains prominent on Home.
- Members can update optional phone/email and are prompted once per login session when contact data is missing.
- Login includes a Request member access form with first name, last name, optional phone and optional email.

## Tenant isolation and branding
- Removed the Westbury logo as a runtime fallback from member/admin UI.
- Seed profiles refuse to run when the seed church ID does not exactly match DEFAULT_CHURCH_ID.
- Notification copy uses the current church profile name instead of hardcoded Westbury branding.
- Static PWA icons are generic Church Scheduler icons; church-specific logos are stored in the church profile.

## Announcement communications
- SMS announcements remain text-only.
- Announcement emails include formatted text, address/map link, and an inline responsive image when an image was uploaded.
- Set PUBLIC_APP_URL to the public HTTPS origin so email clients can load announcement images.
