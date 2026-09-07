# Security Guide — V2.4.0

V2.4 hardens the existing Azure/PWA architecture. No internet-facing application can be guaranteed unhackable; this release reduces common attack paths and improves containment/auditability.

## Added in V2.4
- Login throttling by IP and username/IP.
- Bootstrap throttling.
- Per-session CSRF tokens for authenticated writes.
- Same-origin enforcement for browser writes.
- Server-bound church identifier; `X-Church-Id` from browsers is ignored.
- CSP, HSTS (production), frame blocking, no-referrer and restrictive Permissions-Policy.
- All-device session revocation after password changes, account disable, password reset/provision, and admin-access changes.
- Minimum 12-character new/reset passwords.
- Security audit events in History.
- File signature checks for uploaded PDF/JPG/PNG and logo PNG/JPG/WEBP.
- Safer attachment response headers.
- Weekly GitHub dependency audit workflow.

## Existing protections retained
- scrypt password hashing.
- Secure, HttpOnly, SameSite session cookie.
- Opaque session tokens; token hashes stored server-side.
- Azure Managed Identity for Storage.
- Anonymous Blob access disabled.
- ACR admin credentials disabled.
- GitHub OIDC deployment with no long-lived Azure client secret.
- Server-side authorization for member/admin/owner operations.

## Operational recommendations
- Keep Azure and npm dependencies patched.
- Keep the GitHub repository private unless you intentionally choose otherwise.
- Restrict Azure subscription/resource-group permissions to people who need them.
- Review `security.*` events in History when troubleshooting suspicious activity.
- This Westbury edition is server-bound to the Westbury church identifier; do not reuse this deployment for another church.
