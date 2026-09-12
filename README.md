# Westbury Church Hub V5.0.0

**Westbury-only edition — by Exonuvia.** Single-church Azure deployment.

## V5.0 major change

Chat Hub now uses the **Deterministic Conversational Engine (DCE)** as its primary interpretation layer. DCE compiles Spanish, English and Spanglish language into canonical command frames before authorization and execution. It uses no generative AI.

Key properties:

- compositional speech-act + operation + domain/resource parsing instead of phrase-only matching
- structured temporal, service and ministry-role slots
- structured conversational follow-up context
- conservative typo correction with protected vocabulary
- generic query plans for auditability and future application reuse
- Church Hub-specific domain pack separated from the generic engine
- all writes remain permission-gated, module-gated and confirmation-controlled
- legacy resolver retained only as a compatibility fallback

See `RELEASE-NOTES-V5.0.0.md`, `docs/DCE-V5.0.md`, and `docs/V5.0-UPGRADE.md`.

# Church Hub V2.4

Mobile-first church scheduling PWA designed for Azure Container Apps + Azure Blob/Table Storage.

This repository intentionally stays on **vanilla HTML/CSS/JavaScript** for V2. React/Vite can be evaluated later without changing the Azure API/data model.

## V2.4 highlights

- A program is only **Ready** when all positions are filled **and every Cantos assignment has saved song selections**.
- Admins can deliberately override normal eligibility and assign any active member; the override is confirmed and audited.
- Announcements display inline; PDF/JPEG/PNG attachments are optional supporting downloads, with JPEG/PNG previewed inline.
- Petitions can be Public or Private (Private is the default).
- Proactive unavailability is a prominent action on Home.
- Major visual refresh with a warm Westbury-inspired light theme and cleaner mobile program editing.

See `RELEASE-NOTES-V2.4.0.md` for details.

## What V2 changes

- Azure Container Apps web API/PWA with public HTTPS ingress.
- Azure Container Apps scheduled job maintains the current week + next two weeks.
- Azure Table Storage stores people, services, program templates, assignments, history, content metadata, songs and sessions.
- Azure Blob Storage stores uploaded files privately; the app authorizes downloads.
- Managed Identity is used by the app for Storage and ACR. Storage account keys are disabled in production.
- Opaque HttpOnly session cookies and `scrypt` password hashing replace the legacy Netlify/localStorage authentication model.
- Member access is additive (`members`, `worship`) and Admin Console access is a separate permission.
- Only the Church Administrator can grant/revoke admin access or see Advanced scheduling settings/audit.
- Scheduler V2 applies hard ministry/availability rules **before** fairness scoring.
- Proactive unavailability never reduces reliability. Only a replacement requested during the service's current church week receives the small reliability adjustment.
- Replacement assignment is automatic. There is no accept/decline workflow.
- Admin History is append-only and records assignment, replacement, unavailability and completion activity.
- Service Templates replace the old Sessions/Groups terminology. Multiple visible program items can share one assignment unit.

## Westbury seed included

The repository includes the migrated Westbury member eligibility/availability data already supplied during design. Password hashes from the old Netlify app are **not** included.

Default services:

- Sunday Class — 9:30 AM
- Sunday Worship — 11:00 AM
- Wednesday Class — 7:00 PM

Sunday Worship includes two visible `Cantos` items. Linked items can reuse the same volunteer without counting as another fairness commitment:

- `Canto de invitación` -> first `Cantos`
- `Canto de la cena` -> second `Cantos`
- `Canto de la ofrenda` -> second `Cantos`

Legacy `Sermón` is normalized to **Meditación**. Legacy `Oración Pastoral` is normalized to **Peticiones**.

The Westbury seed now includes the supplied live Netlify `songLibrary`: **216 songs (0–215)**. The legacy export stored the hymn number in `title` and the display title across `number`/`key` for some comma-containing names; V2 normalizes these into `number` + `title` while preserving the original fields in `legacySource`.

## Azure resources created

`infra/main.bicep` creates:

- 1 StorageV2 account, Standard LRS
- Private Blob containers: `attachments`, `imports`, `backups`
- Azure Tables for app data
- Basic Azure Container Registry
- User-assigned Managed Identity
- RBAC for Blob/Table data and ACR image pull
- Azure Container Apps managed environment
- Public HTTPS Container App (`external: true`)
- Scheduled Container Apps Job

The production infrastructure defaults to `minReplicas=1` so Home and Chat Hub stay responsive during normal use, with burst scaling up to six replicas.

## First Azure deployment (Windows / PowerShell)

Prerequisites:

1. Azure CLI installed.
2. An Azure subscription where your account can create resources and role assignments.
3. Git is optional for the first deployment; GitHub Desktop is used after the repository is published.

From the repository folder:

```powershell
az login

.\scripts\first-deploy.ps1 `
  -ResourceGroup "rg-church-scheduler-v2" `
  -Location "centralus" `
  -NamePrefix "westburyapp" `
  -ChurchId "westbury" `
  -InitialOwnerUsername "robertogonzalez" `
  -MinReplicas 1
```

The script:

1. Creates/deploys the Azure resources from Bicep.
2. Builds the initial image in ACR.
3. Updates the web Container App and scheduled job to that image.
4. Starts one scheduler run.
5. Prints the HTTPS app URL and a one-time bootstrap code.

Open the URL and use the bootstrap code to create/promote the first **Church Administrator** and set a new password.

> Do not commit the bootstrap code or passwords to GitHub.

## GitHub Desktop deployment flow

After the first Azure deployment:

1. Create an empty GitHub repository.
2. In GitHub Desktop, **Add Existing Repository** and select this project folder.
3. Publish/push the repository to GitHub.
4. Configure Azure/GitHub OIDC once:

```powershell
.\scripts\configure-github-oidc.ps1 `
  -ResourceGroup "rg-church-scheduler-v2" `
  -GitHubOwner "YOUR_GITHUB_ORG_OR_USER" `
  -GitHubRepo "YOUR_REPOSITORY_NAME"
```

5. The script prints seven repository secret values. In GitHub go to **Settings > Secrets and variables > Actions** and add them.
6. From then on, commit and **Push origin** in GitHub Desktop. `.github/workflows/deploy.yml` tests, builds, pushes and deploys V2 automatically.

GitHub authentication uses Entra workload identity federation/OIDC. No long-lived Azure client secret is required.

## Local development

The app supports an Azure Storage connection string for local development. Azurite is convenient if you already use it:

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Environment variables are read by the process/container. The repository does not automatically parse `.env`; use your shell, VS Code launch settings, Docker Compose, or another local env loader if desired.

## Important data model

See:

- `docs/ARCHITECTURE.md`
- `docs/SCHEDULER-V2.md`
- `docs/MIGRATION.md`
- `docs/DEPLOYMENT.md`

## Security notes

- Storage containers have no anonymous access.
- Shared-key authorization is disabled on the Azure Storage account deployed by Bicep.
- App-to-Storage and app-to-ACR access use Managed Identity/RBAC.
- Admin and Church Administrator permissions are enforced server-side, not only hidden in the UI.
- The legacy Netlify password salts/hashes are intentionally not migrated.
- The PWA is publicly reachable, but private functions/data require authenticated authorization.

## Future items intentionally not included in this V2 infrastructure

- React/Vite conversion
- Azure Communication Services email/SMS resources and carrier registration
- Apple App Store / Google Play wrappers
- Custom domain/certificate automation

The API/data architecture is designed so those can be added later.

### V2.1.0 UI note

The Admin **Content** area now includes a dedicated **Songs** tab with search, add, edit, and active/inactive management for the migrated hymn library. This release does not require any Azure infrastructure changes.

### V2.1.0 redeploy note

V2.1.0 keeps the V2.1.0 Songs UI and improves `scripts/first-deploy.ps1` so the same first-deploy command can be safely rerun for application updates. It builds a uniquely tagged container image and avoids temporarily resetting an existing app/job to the placeholder images during Bicep reconciliation.

## V2.1 mobile experience updates

- Full English/Spanish UI with a one-tap language switch in both member and Admin experiences.
- Light/Dark theme button in the header plus System/Light/Dark preferences in Profile.
- Cantos volunteers can select multiple hymns from the church song library for each assigned Cantos unit; saved selections appear in the live program immediately.
- Church branding is data-driven. Admins can set the church name, upload a logo to Azure Blob Storage, and choose an accent color. Westbury is seeded with the supplied Westbury Church of Christ logo.
- Any signed-in church member can view the generated program and share it with native mobile sharing, WhatsApp, or SMS text.
- V2.1 seed migration upgrades existing Azure V2 data in place to bilingual labels and branding without deleting members, schedules, history, or songs.

Automated Azure Communication Services SMS/email notifications are **not** enabled in V2.1; the SMS capability above is user-initiated program sharing through the phone's messaging app.

## V2.2 mobile UX and performance update

V2.2 keeps the existing Vanilla JS PWA and Azure data model while improving clarity and burst performance:

- A warmer, more modern mobile visual system driven by each church's configured accent color.
- Large month/day tiles on member assignments and program cards so the service date is difficult to miss.
- Worship-member assignment cards explicitly call out **Your assignment / Tu asignación**. Cantos assignments receive a distinct music treatment and clearly show whether song selections are still needed.
- The Cantos picker is now a full-height mobile picker: only the song list scrolls. Search, All/Selected filters, selected count, Cancel and Save remain reachable at all times.
- Short-lived browser caching avoids duplicate assignment/program requests while moving between Home and Schedule.
- Server-side in-memory read-through caching reduces repeated Azure Table reads for church settings, services, ministries, templates, songs and member profiles; writes invalidate the relevant table cache.
- HTTP compression is enabled for larger API/static responses.
- The PWA shell uses cache-first refresh for static assets and network-first navigation so repeat opens feel faster while deployments still refresh the cache version.
- Bicep's default Container Apps burst ceiling is increased from 2 to 4 replicas. `minReplicas` remains 0 by default for low idle cost.

The expected church size of 200+ members remains modest for this architecture. The optimization focus is short usage bursts around service times rather than high continuous traffic.

Azure Communication Services automated SMS/email is still intentionally **not provisioned in V2.2**. Native Share, WhatsApp, and user-initiated SMS sharing remain available.

## V3.0 Azure Communication Services

V3.0 includes an optional, modular ACS deployment for Email and SMS. The app remains fully functional if communications are disabled.

Configured email sender after DNS verification: `WestburyChurchofChrist@exonuvia.com`.

Start with:

```powershell
.\scripts\deploy-communications.ps1
.\scripts\acs-status.ps1
```

Add the exact Azure-provided DNS records to `exonuvia.com`. After Domain, SPF, DKIM and DKIM2 are verified:

```powershell
.\scripts\enable-acs.ps1
```

For SMS, acquire and verify an SMS-capable toll-free number in the Azure Communication Services portal, then:

```powershell
.\scripts\enable-acs.ps1 -EnableSms -SmsFromNumber "+1XXXXXXXXXX"
```

See `docs/AZURE-COMMUNICATION-SERVICES-V3.0.md` for the complete staged procedure.

## V3.2 additions
See `RELEASE-NOTES-V3.3.0.md` for Program Admin on Duty, operational notifications, song-selection history, and same-service song de-duplication.
