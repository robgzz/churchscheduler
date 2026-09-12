# Westbury Church Hub V5.1.0

## Roster import and account automation
- Fixed the administrator browser upload path by restoring one canonical `fileToDataUrl()` implementation.
- CSV/XLSX roster import remains deterministic and supports two formats:
  1. recommended matrix columns `Service - Ministry/Assignment` marked X/Yes/1; this automatically creates services, ministries, templates, member profiles and assignment eligibility;
  2. exact-state exports containing `Ministries`, `Services`, `AssignmentEligibility`, and `AssignmentEligibilityMode=explicit`.
- New members and existing profiles without an account are provisioned automatically.
- Username rule is first initial + surname (`rgonzalez`), then numeric collision suffixes (`rgonzalez2`, `rgonzalez3`).
- Existing accounts and passwords are never overwritten by roster import.
- Initial roster/access-request password is `welcome`; `mustChangePassword=true`, and the replacement password must be at least 10 characters.

## Member access request approval
- Approving a member access request now provisions the account immediately.
- If the request has an email address and ACS Email is configured, credentials are sent automatically.
- Email delivery failure does not roll back an otherwise successful account creation; the admin receives a clear status.

## Rolling worship programs
- The three-week program view is now rolling, not anchored to the beginning of a week.
- The current Sunday remains visible through 6:59 PM church local time.
- At 7:00 PM Sunday, the view advances to the next three-week horizon.
- The scheduled Container App job now runs every 15 minutes instead of every minute; schedule generation remains idempotent and the application-timezone cutoff handles daylight-saving changes.

## Commercial foundation
The import/account services are isolated from Westbury-specific UI so the same deterministic roster pipeline can be reused by the commercial first-run church wizard. The commercial wizard itself is not enabled in this single-church Westbury build.

## Session and Chat Hub consistency
- Default member session lifetime is 365 days so members normally stay signed in unless they explicitly log out, while server-side revocation and logout controls remain available.
- Chat Hub member creation uses the same canonical account provisioning rule as roster import and access-request approval: first initial + surname, numeric collision suffixes, initial password `welcome`, and forced 10-character password change on first sign-in.
