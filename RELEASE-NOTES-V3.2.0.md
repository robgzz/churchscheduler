# Church Scheduler V3.2.0

## Program Administrator on Duty
- Church Administrator can choose the active **Program Admin on Duty** under Admin → Advanced.
- Only active administrators can be selected.
- The selected Program Admin receives program-operation alerts for:
  - member proactive unavailability,
  - member replacement requests,
  - program readiness/status transitions across the three-week scheduling window.
- Program status alerts distinguish **Open Assignments**, **Needs Songs**, and **Complete / Ready**.
- Alerts are delivered as an in-app notification and are also queued for SMS and email when the selected administrator has those contact methods enabled.
- Changing the Program Admin is written to HistoryEvents.

## In-app notification center
- Added a notification bell to the signed-in member app.
- Program Admin operational alerts are stored in the new `AppNotifications` table and can be marked read.
- This release's “app notification” is the in-app notification center. Background OS push remains separate from the ACS SMS/email channels.

## Song-selection history
- A song leader can now see up to 12 past song sets for the same:
  - member,
  - church service,
  - Cantos assignment slot (`assignmentKey`).
- A past set can be loaded with one tap and then saved as the current selection.
- Historical sets that conflict with songs already selected by the other song leader in the same service are disabled.

## No duplicate songs within a service
- Backend validation now rejects a song if another distinct Cantos assignment in the same generated service/program already uses it.
- Frontend song picker disables songs already selected by the other song leader and explains why.
- The restriction is scoped to one generated service/program, so the same hymn may still be used in a different service such as Domingo Clase vs Domingo Adoración vs Miércoles Clase.
- Linked visible program rows tied to the same underlying Cantos assignment do not create false duplicate conflicts.

## Validation
- Full automated suite: 44 tests passing.
- JavaScript syntax validation passed for backend and frontend.
