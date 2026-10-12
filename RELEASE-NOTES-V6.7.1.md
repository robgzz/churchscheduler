# Westbury Church Hub V6.7.1

## Deployment lockfile hotfix

V6.7.1 preserves Smart Fair V3 from V6.7.0 and fixes the GitHub deployment failure caused by an out-of-sync `package-lock.json`.

### Changes

- GitHub deployment now refreshes the lockfile from the pinned `package.json` before the clean install.
- The deployment still uses `npm ci` after synchronization, so the tested dependency graph is the same graph used by the remainder of that workflow run.
- Security workflow now performs the same lock synchronization and clean installation before `npm audit`, tests, and syntax validation.
- Node 22 remains the required runtime.
- Smart Fair V3, October fairness baseline, protected Oct. 14 Wednesday program, and protected Oct. 18 Sunday Class program are unchanged.

### Why this release exists

V6.7.0 intentionally switched deployments from `npm install` to `npm ci`. That correctly detected that dependency versions in `package.json` had been updated without regenerating all corresponding package entries in `package-lock.json`. V6.7.1 repairs that deployment path without weakening the security audit or reverting the scheduler changes.
