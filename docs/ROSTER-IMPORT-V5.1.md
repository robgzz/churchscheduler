# Deterministic roster onboarding pipeline

The roster importer is intended to be shared between the dedicated Westbury edition and the future commercial Church Hub.

## Recommended commercial roster format
Each row is one member. Identity columns are `Full Name` (or First/Last Name), Email, Phone, and Active. Every additional assignment column is named:

`<Service Name> - <Ministry or Assignment>`

Mark an eligible cell with X, Yes, True, 1, Sí, or ✓. Blank means not eligible.

From these headers the importer deterministically creates missing services, ministries and program-template assignment definitions, then creates/updates the member and builds exact service/ministry eligibility links.

## Exact-state format
An export can be re-imported authoritatively using `Ministries`, `Services`, `AssignmentEligibility` and `AssignmentEligibilityMode=explicit`. This is the format used by the prepared Westbury workbook.

## Account rule
- Preserve existing account if present.
- Otherwise derive username from first initial + surname.
- Resolve collisions with 2, 3, 4... suffixes.
- Initial password `welcome` is hashed with scrypt and marked `mustChangePassword`.
- The first post-login password must be at least 10 characters.

## Safety
Import never resets an existing password. Account provisioning is idempotent. All persisted changes remain scoped to the current church/tenant.
