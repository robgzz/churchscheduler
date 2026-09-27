# Westbury Church Hub V6.5.0 — Smart Fair and independent weeks

Base: V6.4.1. The People/Events `song` fix, the 226-song anthology and optional welcome-password change remain intact.

## Independent scheduling controls
- Admin > Schedule: three independent bilingual buttons with their exact server-side date ranges: current, next, following week. Home shortcut now opens these controls rather than scheduling all weeks with one click.
- Each button requires confirmation, then **recalculates only that selected week**. The API requires `weekOffset` 0, 1, or 2; it rejects unspecific all-week requests.
- Chat Hub admin schedule generation offers the same three choices and confirmation.
- Weekly background scheduler still fills missing slots across the rolling three weeks; it does not overwrite populated assignments.
- After Sunday 7 PM America/Chicago rollover, weeks run Monday–Sunday so upcoming Wednesday and Sunday services remain in scope.

## Smart Fair fixes
- Tracks each volunteer's completed participation by ministry for the last 365 days and recent overall workload for 84 days.
- Counts upcoming committed assignments, including the other two weeks, and updates counts after every new selection. Volunteers with fewer completed + planned turns in the target ministry are considered first; the configured weighted point model breaks participation ties.
- Schedules all services chronologically within the selected week, prioritizes the most constrained slots, and checks remaining-slot coverage so fairness cannot needlessly leave a fillable slot open.
- Maintains hard eligibility: active profile, enabled ministry/service and optional specific assignment permissions, unavailability, same-day restrictions and no duplicate role in the same program.
- Regeneration protects locked programs, individually locked/manual assignments, and selected songs; it does not rewrite earlier calendar dates. Reports numbers created, reassigned, unfilled, unchanged and protected. An audit event records each administrator-driven generation.

## Deployment and limitations
- This release has unit/regression and syntax validation; it has **not** been deployed or exercised against live church data in Azure. Preview the new rotation and review any protected exceptions after deployment.
- Existing manually locked, song-selected, or locked programs intentionally remain even if a different assignment scores higher. An unfilled role may remain when no eligible member exists or fixed assignments constrain coverage.
- For passwords, keeping shared default `welcome` is the church's requested temporary configuration; administrators should use individual passwords.

## Validation
- `npm run lint:syntax`
- `npm test` (206 passing at build time)
