# Church Scheduler V3.3.0

## New church tenant onboarding

- Church Administrator-only bulk import area for member/service/assignment matrices.
- CSV, XLS and XLSX member imports.
- Each member is one row; columns use `Service or Activity - Assignment` and checked cells establish exact eligibility.
- Missing services/activities, ministries, templates and assignment definitions are created automatically.
- Exact assignment-slot eligibility is enforced for imported members so eligibility for Songs 1 does not automatically imply Songs 2.
- Weekday/time are inferred from service names when practical; ambiguous imported schedules are flagged for review.
- Downloadable CSV and Excel templates are included in the Admin UI.

## Song library portability

- Song library can be exported to CSV or Excel.
- Church Administrator can upload CSV/XLS/XLSX song lists.
- Required/recognized columns: Number, Title Spanish, Title English, Active.
- Existing song numbers are updated and new numbers are added.

## Song leader convenience

- Historical song-selection sets continue to show both song numbers and song titles.
- Same-service duplicate-song protection remains enforced in both the UI and backend.

## Audit

- Existing audit exports to CSV, Excel and PDF remain available.
