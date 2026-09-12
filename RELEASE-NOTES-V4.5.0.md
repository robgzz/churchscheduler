# Westbury Church Hub V4.5.0

## Fixes and improvements

- Chat Hub admin actions that open **People** now switch from the member shell to `/admin/?tab=people`; the admin console reads deep-link tabs on load.
- Admin startup is now wrapped by a classic resilient loader that reports module/runtime failures instead of leaving a blank page. Admin HTML contains an immediate loading state, and all admin assets are cache-busted to V4.5.
- Password minimum is standardized at **10 characters** across setup, reset/provision, and member password changes. Chat Hub auto-generated temporary passwords are readable 10-character values in the pattern `Luna4827!m` and still force a password change at first sign-in.
- Chat Hub now answers **“¿Quién da la clase del miércoles?” / “Who teaches Wednesday class?”** with teachers and dates for the **next three Wednesday classes**, rather than only returning a program button.
- Health/readiness version advanced to 4.5.0.

No new Azure resources or storage tables are required compared with V4.4.0.
