# Upgrade to Westbury Church Hub V6.0.0

V6.0 is an application release. It does not require rerunning `first-deploy.ps1` or redeploying the Azure foundation.

1. Preserve the repository `.git` directory and repository settings/secrets.
2. Replace the working tree with the V6.0 full package.
3. Commit and push to `main`.
4. GitHub Actions runs dependency audit, tests, syntax checks, image build/push and Container Apps deployment.
5. Deployment health validation uses `/readyz`.
6. Close/reopen the PWA/browser once so cache `v600` is active.

The application will automatically create the `SecurityThrottle` table in the existing Storage Account through `ensureStorage()`.
