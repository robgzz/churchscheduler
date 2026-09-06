# Church Scheduler V2.5.0 — Azure Communications Foundation

V2.5 adds a modular Azure Communication Services (ACS) layer without coupling communications logic to the scheduler.

## Included

- Modular `infra/communications.bicep` for Azure Communication Services and Email Communication Service.
- Custom email domain resource for `exonuvia.com`.
- Sender username configured as `WestburyChurchofChrist`, producing `WestburyChurchofChrist@exonuvia.com` after verification/linking.
- Managed-identity authentication; no ACS connection string or access key is embedded in application settings.
- Separate feature flags for Email and SMS.
- ACS Email and SMS SDK clients isolated under `src/communications/`.
- `NotificationLogs` Azure Table for send metadata/audit outcomes.
- Church Administrator-only communications status and test endpoints.
- PowerShell scripts for staged ACS deployment, DNS verification inspection, and final enablement.
- Existing scheduler, PWA and V2.4 security hardening remain intact.

## Deployment model

ACS custom-domain email is intentionally staged:

1. Deploy ACS/email/domain resources with email sending disabled.
2. Add Azure-provided TXT/SPF/DKIM/DKIM2 records to the DNS hosting `exonuvia.com`.
3. Wait for Azure to report all verification states complete.
4. Re-run the communications deployment with domain linking and email enabled.

SMS phone-number acquisition is not performed by Bicep because it is a billable/regulatory operation. Acquire a US toll-free SMS number in Azure Portal and complete toll-free verification, then pass the number to the supplied enablement script.

The application does not implement an inbound SMS webhook/Event Grid subscription. If Azure offers one-way outbound SMS capability during number acquisition, select it. If the acquired toll-free number supports inbound SMS, the application still ignores replies; carrier/platform opt-out behavior such as STOP must remain available.
