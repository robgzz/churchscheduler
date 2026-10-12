# Westbury Church Hub V6.7.0

## Smart Fair V3 — whole-person rotation fairness

V6.7.0 replaces ministry-first rotation ranking with a layered whole-person fairness model. Eligibility and coverage remain hard requirements, but the scheduler now strongly prefers volunteers who have had more rest across *all* services and assignments.

### Fairness order

For eligible volunteers, Smart Fair V3 now evaluates:

1. same-day workload (avoid a second service when another eligible person is free)
2. whether the person served the same service during the prior 7 days
3. total nearby workload (prior 7 days + protected next 7 days)
4. total service workload during the prior 28 days
5. protected future workload during the next 28 days
6. recent workload in the exact ministry
7. overall days of rest
8. longer-term role load and the existing weighted score as tie breakers

This prevents a versatile brother from being selected repeatedly simply because each assignment uses a different ministry counter. Cantos A + Invitación and Cantos B + Cena + Ofrenda remain single assignment units for fairness purposes.

Maximum program coverage still outranks fairness. If using the fairest candidate would leave a later position uncovered, the coverage-aware selector can choose the next fair candidate who preserves full coverage.

## October 2026 live cutover

Westbury began operational use of the scheduler in October, so V6.7.0 sets `fairnessBaselineDate` to **2026-10-01**. September assignments do not influence the V3 cutover rotation.

A one-time, idempotent migration runs on the first V6.7.0 startup:

- **Preserves unchanged:** Wednesday Class **2026-10-14**.
- **Preserves unchanged:** Sunday Class **2026-10-18**.
- **Rebalances beginning with:** Sunday Worship **2026-10-18 at 11:00 a.m.**.
- Continues chronologically through the remainder of the current three-week horizon.
- Existing administrator-locked assignments and assignments that already contain selected songs remain protected.
- Past October assignments are converted to completed status before the rebalance so Oct. 4 and Oct. 11 service history can influence fairness.
- The migration writes `scheduler.fairness_rebalanced` to the audit history and stores a completion marker so a restart cannot repeat the migration.

## Multi-week regeneration correctness

The V3 rebalance removes all replaceable assignments in the requested three-week scope from the in-memory planning context *before* selecting the first replacement. This prevents stale assignments from Oct. 25 / Nov. 1 from biasing the Oct. 18 decisions. Programs are then rebuilt chronologically, so every new selection becomes workload for the next decision.

The existing three independent administrator generation buttons are retained.

## Audit export correction

The attached `church-audit-2026-10-12.csv` contains 5,000 records, but its event timestamps only span Sep. 5–11 and its latest service date is Sep. 23. The old export fetched the first 5,000 Azure Table rows before sorting them, which can omit newer October history.

V6.7.0 keeps the normal history API bounded, but audit exports perform a larger bounded scan before sorting and returning the requested rows. This makes recent activity visible in exports instead of preferentially returning the oldest rows.

## Deployment hardening

- Application version synchronized to 6.7.0.
- GitHub and Docker continue to use Node 22.
- GitHub dependency installation now uses `npm ci` rather than `npm install` for lockfile-deterministic builds.
- Docker production dependency installation also uses `npm ci --omit=dev`.
- V6.6.3 dependency security pins and overrides remain intact.

## Verification

- 238 Node tests pass (including Smart Fair V3 rotation, consecutive-service, future-spacing, October-baseline, migration-preservation and audit-export tests).
- 226 authoritative hymns synchronized.
- JavaScript syntax validation passes across `src/` and `public/assets/`.
