# Westbury Church Scheduler v3.4.2

## Fix
- Fixed the Admin portal back button so it reliably returns an administrator to the regular member application.
- Removed the inline `onclick` handler and bound the action in the external admin JavaScript, which is compatible with the application Content Security Policy.
- Bumped the service-worker cache version so mobile/PWA clients receive the corrected Admin shell and JavaScript promptly after deployment.

No commercial Ministra billing or multi-tenant onboarding functionality is included in this Westbury-only release.
