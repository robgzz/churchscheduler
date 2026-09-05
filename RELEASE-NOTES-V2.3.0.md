# Church Scheduler V2.3.0

V2.3 is a UI clarity and church-community workflow release. It preserves the Azure Container Apps + Azure Table/Blob architecture and the deterministic Smart Fair V2 scheduler.

## Program readiness

A program is now **Ready only when**:

1. every assignment unit is filled, and
2. every assigned `Cantos` unit has at least one saved song selection.

Admin and member program cards distinguish Ready, open assignments, and missing song selections.

## Admin manual override

Smart Fair remains strict and never automatically schedules a volunteer outside normal eligibility. Admins now have an explicit **Manual assignment override** option that can select any active member. Overrides require confirmation when the person is outside normal eligibility and are written to History as `assignment.admin_override`.

## Announcements and attachments

Announcement text is displayed inline. JPEG/PNG attachments can preview inline and all supported attachments remain available to view/download. New uploads are limited to PDF, JPEG, and PNG (8 MB maximum).

## Public/private petitions

Petitions default to **Private** (admins only). A member may deliberately choose **Public**, which makes the request visible in the community Petitions feed to church members.

## Proactive unavailability

Worship members now have a prominent Availability action near the top of Home. Entering proactive unavailability continues to have **no reliability penalty**.

## Visual redesign

The light theme now uses a warm, contemporary palette inspired by Westbury's branding, while still respecting each church's configured accent color. Home has a stronger branded welcome, cards have reduced visual noise, program editing uses compact overflow controls, navigation floats cleanly above the mobile safe area, and content/petition views use modern feed-style layouts.

## Validation

- 25 automated tests passing
- JavaScript syntax validation passing
- Existing V2.2 deterministic scheduling tests retained
