# Westbury Church Hub V3.5.0

## Brand
- Frontend product name changed from **Westbury Church Scheduler** to **Westbury Church Hub**.
- Scheduling remains a module inside the broader Hub. Backend/Azure resource names remain unchanged for stability.

## Notifications
- Successful push/email/SMS attempts now write structured server logs in addition to `NotificationLogs`.
- Push logs include device count, Firebase success/failure counts, message IDs, and FCM errors.
- Preference-disabled/no-contact attempts are recorded as `skipped` instead of disappearing silently.
- Member profiles have independent **Text notifications** and **Email notifications** switches; phone/email values remain stored when disabled.
- Song submission alerts and replacement alerts are routed only to the currently designated Responsible / Program Administrator, using SMS + native push + in-app notification.

## Leadership Reports
- New Reports module for leadership with date-range previews and exports.
- Reports: Leadership Overview; Worship & Scheduling; Communications; Announcements & Bulletins; Visitors; Prayer Petition Activity; Children's Check-in & Pickup.
- Exports: `.xlsx`, `.csv`, and `.pdf`. PDF and XLSX use church letterhead/logo where available; CSV includes branded metadata and logo URL because CSV cannot embed images.
- Private petition content is withheld from broad report output.

## Children's Check-in / Pickup
- New `Children` and `ChildCheckIns` tables are created automatically by storage initialization.
- Members can opt in from Home/Profile, add children and ages, and independently choose SMS/email/push for children's notifications.
- Only enrolled families see the children's operational module.
- Check-in generates a six-digit pickup code and sends family notifications.
- Pickup validates the code for member self-service; administrators can confirm release from the Admin children's module.
- Check-in/pickup activity is included in the audit/history stream and leadership reports.

## Android
- This release does **not** add or change native Android plugins, permissions, package ID, Firebase JSON, or Android manifests.
- With the existing Capacitor `server.url` architecture, V3.5.0 can be deployed to Azure without rebuilding the Android package.
