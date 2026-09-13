# V6 Security and Stability Baseline

V6 preserves Westbury's low-friction onboarding requirements while strengthening the controls around them.

## Authentication/session controls

- Existing scrypt password hashing remains unchanged.
- 10-character normal password minimum remains unchanged by product decision.
- `welcome` remains a temporary first-login credential and `mustChangePassword` remains enforced by the existing account flow.
- Session tokens remain cryptographically random and only token hashes are stored.
- Production cookie name uses the `__Host-` prefix.
- Session state now has both absolute expiration and a 60-day default idle expiration.
- Password/access changes continue to revoke sessions.

## Request protection

- Existing CSRF tokens and origin checks remain.
- Cross-site browser mutation requests with `Sec-Fetch-Site: cross-site` are rejected before routing.
- CSP, HSTS, frame protection, referrer policy and permissions policy remain active.

## Distributed login abuse protection

The existing in-memory rate limiters remain as low-cost request controls. V6 also records failed-login throttle state in the existing Azure Table Storage account so limits survive container restarts and are shared across replicas.

## DCE safety boundary

Language interpretation never grants authority. Protected writes continue through server authorization and existing domain services. Capability metadata now classifies operation risk so confirmation/authorization policy can remain independent from semantic confidence.

## Stability

- `/readyz` validates storage before a deployment is considered healthy.
- Container shutdown drains active HTTP requests on SIGTERM/SIGINT.
- Version reporting comes from one source.
- No new Azure service dependency is introduced.
