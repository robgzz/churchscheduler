# Westbury Church Hub V4.3.0

V4.3.0 is a reliability, accessibility, Children Care safety, Prayer retention, and major Chat Hub deterministic-intelligence release built on V4.2.0.

## Admin portal reliability
- Fixes Church Administrator detection in the admin client when authority is present on the member profile.
- Fixes the same authority check in Chat Hub policy.
- Bumps browser asset/cache versions so stale V4.2 JavaScript does not remain pinned after deployment.

## Navigation and Home
- Bottom navigation is now horizontally scrollable with touch momentum and scroll snapping when many modules are enabled.
- Fixed-width navigation targets remain large enough for mobile accessibility.
- Home order is now Chat Hub, My Tasks, next assignment/status, then Planned Unavailability.

## Prayer requests
- Prayer requests have a 14-day visibility period.
- Older requests are automatically moved to expired status and removed from the public/current feeds.
- The original petitioner can review their own expired requests and permanently delete them after the two-week period.
- Chat Hub can list current public requests, list the member's own requests, create public/private requests, delete eligible expired requests, and let admins review current private/public requests according to existing authorization.

## Children Care pickup verification
The physical handoff remains caregiver-controlled. V4.3 adds safe recovery when a parent does not have the original pickup code:
1. Original six-digit pickup code.
2. Authenticated parent one-time verification code, valid for five minutes.
3. Caregiver photo-ID fallback requiring explicit confirmation, receiving-adult name, a recorded reason, and audit history. No ID number is stored.

Chat Hub can generate the one-time parent verification code only for a child linked to the signed-in parent's active check-in.

## Chat Hub deterministic intelligence
V4.3 materially expands deterministic language coverage without adding a generative-AI dependency. Intent resolution combines exact/variant phrases, bounded typo correction, domain concepts, question/request classification, account role, active module state, date/service terms, conversation state, and clarification when confidence is insufficient.

### Members can ask or request
- upcoming assignments / what they are serving in
- full worship program and role-specific questions such as who is preaching, leading Songs, Security, Communion, Scripture, prayer, teaching, or welcome
- replacement requests and planned unavailability
- song search and personal song history
- announcement counts, lists, dates, times, addresses, and topic questions
- latest bulletin
- upcoming events, personal RSVP status, RSVP registration and cancellation
- personal tasks and task completion
- current public prayer requests, personal requests, creating a public/private request, and deleting expired personal requests
- profile/contact/ministry/notification-preference summary
- personal notifications/unread count
- Children Care status, pickup request, pickup-code recovery, and one-time parent verification
- a combined seven-day Church Hub summary

### Authorized administrators can additionally
- list/count/search members
- create a member profile through conversation
- optionally provision a login account with unique username and cryptographically generated temporary password requiring password change
- inspect program readiness
- generate the three-week Smart Fair schedule after confirmation
- inspect missing song selections
- upload/publish bulletins
- create announcements including date, time, and address
- create events
- inspect RSVP names for an event
- create and assign follow-up tasks
- inspect pending tasks
- inspect current private/public prayer requests
- inspect new visitors/member-access requests
- inspect module state
- Church Administrator: enable/disable modules through a confirmed command

Administrative writes remain permission-checked and confirmation-gated. Chat Hub does not gain direct browser access to Azure storage and never bypasses existing Church Hub authorization.

## Voice accessibility
- Question/request punctuation is inferred again immediately before sending, not only when speech recognition ends.
- Expanded Spanish question vocabulary prevents common words such as `quién`, `cuál`, `estoy`, `sube`, and `todas` from being incorrectly typo-normalized.
- The microphone no longer stops merely because the finger drifts outside the button while holding on a touch device.
- The microphone button uses touch-action protection for more reliable press-and-hold behavior.

## Member import
V4.2 exact-state member import remains included and supported. The packaged Westbury member workbook can authoritatively replace ministries, service availability, and assignment eligibility rather than only adding eligibility.

## Infrastructure and deployment
V4.3.0 does not require additional Azure resources beyond V4.1/V4.2. Existing production deployments can use the normal GitHub `main` -> GitHub Actions -> Azure Container Apps deployment path. The full package still includes Bicep, deployment scripts, Dockerfile, and GitHub workflow for reproducibility.

## Validation
- Node syntax validation passes for server and browser JavaScript.
- Full automated test suite: 104/104 passing at packaging time.
