# Westbury Church Hub V4.0.0

Major modularity, Children Care safety, reporting, Events, and Follow-up release.

## Highlights

- Central module registry with server-enforced enable/disable controls. Existing modules default on; new Events and Follow-up modules default off.
- Church Administrator module settings UI. Historical data remains stored when a module is disabled. Children Care cannot be disabled while a handoff is active.
- Parent pickup is now a request. A scoped caregiver verifies the six-digit code and records the receiving adult and physical release.
- Hashed pickup codes, local church dates, duplicate active-check-in protection, unresolved stale check-ins, and prompt urgent-alert dispatch.
- Corrected report fields and metrics, report/date validation, CSV formula neutralization, export auditing, and completeness warnings at safety limits.
- Optional Events and RSVP module plus an optional assignable Follow-up task module.
- GitHub deployment remains push-to-main with OIDC, tests, image build/push, app/job updates, and health check.
- Background job default changed from every five minutes to every minute for lower communication latency.

## Upgrade behavior

No destructive data migration is required. Azure Tables are created automatically at startup. Existing churches receive legacy modules enabled by default; Events and Follow-up remain disabled until enabled by a Church Administrator.

Existing active Children Care records from V3.5.1 may contain the old pickup code field. Complete those handoffs using a documented administrative override before relying on the new hashed-code workflow. New records use `pickupCodeHash` in storage.

## Deployment

Replace repository contents, commit, and push to `main`. GitHub Actions deploys the web image and scheduled job. Do not add the infrastructure-only ZIP to the source repository; use it only for Azure provisioning or intentional infrastructure updates.
