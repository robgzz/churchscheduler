# Church Scheduler V2.4.0 — Security Hardening

Security-focused release built on V2.3.0.

- Login throttling by IP and username/IP combination.
- Bootstrap endpoint throttling.
- Same-origin checks for state-changing browser requests.
- Per-session CSRF tokens required for authenticated POST/PUT/PATCH/DELETE requests.
- Server-bound tenant id; browser-supplied X-Church-Id is ignored.
- Content Security Policy, HSTS in production, referrer and permissions policies.
- Session revocation after password changes plus sign-out-all-devices endpoint.
- Password minimum increased to 12 characters for new/reset credentials.
- Security audit events for login failures/success, password changes, owner bootstrap and all-device logout.
- Safer attachment response headers and filename sanitization.
- Existing Managed Identity, private blob authorization, secure HttpOnly cookies, OIDC deployment, and server-side authorization remain in place.

No system can be guaranteed unhackable. This release materially reduces common web attack surface while preserving the V2.3 user experience.
