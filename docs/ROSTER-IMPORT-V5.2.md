# Roster Import V5.2

## Recommended Westbury upload

Use `imports/Westbury-Members-Final-Upload.xlsx`.

The first worksheet is the upload source. The importer reads these canonical columns:

- `Full Name`
- `Email`
- `Phone`
- `Active`
- `Ministries`
- `Services`
- `AssignmentEligibility`
- `AssignmentEligibilityMode`
- `Admin`
- `ChurchAdministrator`

With `AssignmentEligibilityMode=explicit`, the uploaded ministry/service/assignment state is authoritative for that member.

## Administrator capability

`Admin=Yes` grants Admin Console access. Accepted truthy values are `Yes`, `Sí`, `X`, `1`, `True`, and `✓`.

When the Admin column is present, a false/blank Admin value removes ordinary administrator access for non-owner members. The existing Church Administrator always remains an administrator.

The importer synchronizes the same authorization flags to existing login accounts without changing their password hashes. Sessions are revoked only when an existing account's authorization state changes.

## Church Administrator

Spreadsheet import cannot create or transfer the Church Administrator role. `ChurchAdministrator=Yes` is accepted only for the member who is already the Church Administrator. This rule prevents accidental ownership escalation through a roster file.

## Accounts

New members receive deterministic usernames (first initial + surname, followed by `2`, `3`, etc. if needed) and initial password `welcome`. Existing accounts are preserved and passwords are never reset by roster import.
