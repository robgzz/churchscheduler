# Westbury Church Hub V6.6.3

Security dependency remediation release.

## Changes
- Updates `compression` to 1.8.2.
- Updates `firebase-admin` to 14.5.0 (Node 22+ supported).
- Updates `@azure/identity` to 4.13.3 and `@azure/communication-email` to 1.1.0.
- Adds dependency overrides for patched `@grpc/grpc-js`, `proxy-addr`, `brace-expansion`, and `uuid` transitive dependency lines reported by GitHub `npm audit`.
- Keeps compatible brace-expansion major versions for older minimatch consumers instead of globally forcing a breaking major.
- Aligns GitHub Actions to Node 22, matching the production Docker image, to reduce environment drift.
- Application behavior from V6.6.2 is unchanged.
