# Westbury Church Hub V6.1.0

V6.1.0 is a reliability, administration, communications, and performance release built on the V6 DCE 4.0 foundation.

## Communications root-cause fix

The Azure Communication Services resource and verified sender can work correctly while the Container App still reports `ACS email is disabled` if the app revision does not have the ACS endpoint/sender/enablement environment variables. The production workflow now discovers the existing `${namePrefix}-acs` Communication Services resource on every deployment and injects:

- `ACS_ENDPOINT`
- `ACS_EMAIL_SENDER=WestburyChurchofChrist@exonuvia.com`
- `ACS_EMAIL_ENABLED=true`

into both the web Container App and scheduler job when ACS is present.

The Communications admin screen also exposes whether the app revision actually has email enabled/configured instead of only showing an empty sender.

Administrator alerts now include email in addition to SMS/push when the administrator has email notifications enabled.

## Editable administration

Published announcements and bulletins now have an **Edit / Editar** action. Administrators can change bilingual title/body, announcement date/time/address, visibility, and attachments. Existing attachments can be replaced or removed. Announcement edits do not re-notify the church unless the administrator explicitly selects the notification option.

Events and follow-up tasks now support create/edit/delete from the administrative UI and API. Existing editable areas (member profiles, schedules, songs, services, templates, church profile, modules, and advanced settings) remain editable. Audit/security history remains intentionally immutable.

## Member profile deletion

Administrators can delete a member profile with explicit confirmation. The deletion service protects operational integrity:

- Church Administrator cannot be deleted.
- An administrator cannot delete their own signed-in profile.
- The current responsible Program Administrator must be changed first.
- Active child-care handoffs block deletion.
- Future/current non-completed worship assignments are reopened rather than left pointing to a deleted member.
- Active follow-up tasks assigned to the member are cancelled/unassigned.
- Sign-in sessions and the member's user account are removed.
- Historical assignment/audit records are preserved.
- The deletion is recorded in audit/security history.

Chat Hub also exposes `admin.memberDelete` as a privileged, confirmation-required DCE capability.

## Performance

The admin Content screen no longer downloads content, visitors, petitions, and the entire song library on every tab load. It fetches only the data required by the active tab.

The member client now uses short-lived caches for notification badge and Home task lookups, and startup avoids a redundant public-bootstrap request.

HTTP compression remains enabled for payloads over 1 KB.

## Azure health and deployment

- Production deployment validates `/readyz`, not only process liveness.
- Azure Container Apps Readiness probe now targets `/readyz` while Startup/Liveness remain `/healthz`.
- No new Azure service is required for V6.1.0.

## Roster companion file

`imports/Westbury-Members-Participation-Corrected.xlsx` is included as the latest exact-state participation workbook prepared from the three handwritten ministry lists and the approved exceptions.

## Validation

- 179 / 179 automated tests passing
- full JavaScript syntax validation passing
