# Westbury Church Hub V6.4.1 — People profile repair / optional passwords

Built on the uploaded V6.4.0 package. All 226 imported hymn titles and Markdown lyrics, including distinct 203a/203b and 223a/223b, are unchanged.

## Fixes
- **Admin → People**: remove an inadvertently inserted song-Markdown field from the member-profile form. That field referenced an undefined `song` variable, causing `Can't find variable: song` when opening a member. The intended hymn editor in Admin → Content → Songs remains unchanged.
- **Admin → Events**: remove the same accidentally inserted hymn field from its event form, preventing a second undefined `song` failure.
- **Password policy**: new and bulk-provisioned accounts keep the initial password `welcome` with no mandatory change. Existing users whose `mustChangePassword` flag is still true are no longer redirected or prompted to change it. Users can voluntarily choose a new password of at least 10 characters in Profile → Security, retaining verification of their existing password and reauthentication after changing it.
- **Provision/resets**: Admin account resets no longer set a mandatory-change flag. Chat Hub account-creation responses and credential emails now correctly state that changing the password is optional.
- **Cache**: bump client module URLs and PWA shell to V6.4.1 to avoid stale browser files after deployment.

## Deployment and security notes
- Deploy this ZIP using your existing GitHub Actions / Azure Container Apps workflow; it has **not** been deployed to your Azure environment from this chat.
- The uploaded archive contained an Apple `.p8` private signing/auth key in the project root. For safety, this deliverable does **not** redistribute that secret. Keep it in secure CI secret storage if it is required by the iOS process; consider rotating the uploaded key if its exposure was unintended.
- Retaining shared default password `welcome` is at your request, but shared defaults are weaker than individual passwords, especially for privileged accounts. Keep rate limiting enabled; set unique stronger passwords for administrator accounts.

## Validation
- Full `node --test` suite and `npm run lint:syntax` should pass; tests include regression coverage preventing the stray People and Events field and confirming voluntary password changes.
