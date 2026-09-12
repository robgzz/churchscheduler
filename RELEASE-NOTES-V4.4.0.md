# Westbury Church Hub V4.4.0

## Reliability

### Administrator Console blank-screen fix
V4.4 corrects two independent failure paths that could leave the administrator page with only its static header:

1. `requireAdmin` now recognizes `member.churchAdministrator === true`, matching the owner policy used elsewhere in the app.
2. Admin/app JavaScript and HTML use no-store/cache-busted loading. The service worker treats JavaScript and `/admin/` as network-first so a new `admin.js` cannot be paired with an old cached `i18n.js` module.

The admin bootstrap also shows a visible retry/error card instead of failing into a blank body.

## Member lifecycle behavior

- Events remain visible through the event date and disappear after 11:59 PM in the church timezone.
- Assigned tasks remain visible through their due date and disappear after 11:59 PM in the church timezone.
- Event and task records are not destroyed by this presentation expiry; reports retain the final status.
- Members may cancel an RSVP or task before expiration.
- Members may hide an event or task from their own screen without deleting leadership/reporting history.
- Members may delete their own prayer requests at any time. Public prayer requests still age out of current/community lists after 14 days.

## Church News

The Church tab is redesigned as a news destination:

- **Weekly Bulletin** appears first and displays only the newest published bulletin.
- **Announcements / Church News** appears as a separate feed below it.
- Bulletin and announcement attachments remain authorized through the existing content/download flow.

## Mobile navigation

The bottom navigation is explicitly non-compressing and horizontally scrollable with touch panning, iOS momentum scrolling, and snap behavior. The active destination scrolls into view when navigation is rendered.

## Chat Hub V4.4

The deterministic resolver now combines exact phrases, concepts, action/domain grammar, typo correction, question-vs-request classification, conversation state, role context, module state, and confidence gaps. The intent catalog contains Spanish, English, and common Spanglish forms.

Major member domains include:

- Home/navigation and service times
- Personal assignments and program participants (preaching, Cantos, security, communion, scripture, prayer, classes, etc.)
- Cantos search/history
- Replacement and planned absence
- Profile and notifications
- Weekly bulletin and announcement count/list/details
- Events, RSVP registration/cancellation, and hide-from-screen
- Tasks, completion, cancellation, and hide-from-screen
- Prayer lists, personal petitions, creation, and deletion
- Children Care status, pickup codes, alternate authenticated-parent verification, pickup requests, and caregiver roster status

Authorized administrator domains include:

- Open Admin Console
- Program readiness, Smart Fair generation, and pending Cantos
- Member count/search/create-account workflows
- Bulletin upload and announcement creation
- Event creation and RSVP-name lists
- Visitor/access requests
- Task creation/assignment and pending task review
- Public/private prayer review
- Active Children Care summary
- Report Center capabilities
- Communications status
- Audit activity
- Module status and Church Administrator enable/disable actions

Write operations continue to require authorization and confirmation. Chat Hub never bypasses normal business permissions.

## Security, performance and scalability review

V4.4 preserves:

- Helmet/CSP and HSTS in production
- same-origin validation and CSRF protection for writes
- HttpOnly authenticated sessions
- `scrypt` password hashing
- server-bound church identity
- server-side module and role enforcement
- per-user Chat Hub rate limiting
- no-store API responses
- compression for response payloads
- Table/Blob storage abstractions
- Container Apps min replica 1 and HTTP autoscaling in GitHub deployment
- `/healthz` and `/readyz`
- durable notification queue/history patterns already present in the application

No new Azure resources are required for V4.4.
