# Westbury Church Hub V6.0.0

## DCE 4.0 / Domain Intelligence Engine

V6.0 moves Chat Hub away from an intent-first architecture and establishes a reusable deterministic domain-intelligence core. Westbury remains the first domain pack and continues to use the existing service handlers for authoritative reads and writes.

### Core intelligence additions

- Typed domain schema registry for Church, Member, Account, Service, Service Occurrence, Ministry, Program, Assignment, Song, Task, Event, Prayer Request, Child, Publication, Module, Notification and Visitor.
- Typed relationship registry including assigned-to, eligible-for, available-for, selected-for, responsible-for, registered-for, has-task and parent-of.
- Canonical semantic fields added to DCE frames: predicate, semantic roles, scope, polarity, desired state and result type.
- Generic query algebra with scan/filter/project/aggregate/sort/limit/compare operators.
- Typed discourse model with salience, focus and expected-response metadata.
- Comprehensive Church Hub capability registry across worship, songs, publications, events, tasks, prayer, children, members, reports, communications, audit, modules, profile, notifications and visitors.
- Risk metadata separates read, sensitive read, self-write, admin-write and privileged-write capabilities.
- Proof-style rule traces for readiness and assignment eligibility.
- Capability-driven Help output rather than a fixed phrase-only help paragraph.
- DCE response payloads now expose the canonical predicate, semantic roles, scope, result type, capability risk and query plan for deterministic diagnostics/testing.

### Security and stability hardening

The usability decisions already approved remain unchanged: Westbury keeps the practical 10-character password policy and familiar `welcome` first-login workflow with forced password change.

V6.0 adds:

- Production `__Host-westbury_session` cookie naming while retaining a development-compatible cookie name locally.
- Idle session expiration in addition to the existing absolute lifetime.
- Persistent Azure Table-backed login throttling shared across Container App replicas, in addition to existing in-process request throttling.
- `Sec-Fetch-Site` cross-site write blocking as defense in depth around CSRF/origin checks.
- One canonical application/DCE version source used by health/readiness/startup reporting.
- Graceful SIGTERM/SIGINT HTTP draining for Container Apps revision changes.
- Deployment validation now calls `/readyz`, which verifies storage availability, instead of only `/healthz`.
- Direct dependency versions are pinned instead of using semver range prefixes.
- Production deployment runs a high-severity npm audit before tests/build.

### Azure impact

No new Azure service is required. V6.0 uses one additional table, `SecurityThrottle`, in the existing Storage Account. `ensureStorage()` creates it automatically. No Bicep/bootstrap rerun is required for a normal upgrade.

### Validation

- 170 automated tests pass.
- JavaScript syntax validation passes across server and browser assets.
