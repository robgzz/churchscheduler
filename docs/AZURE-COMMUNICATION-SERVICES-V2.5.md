# Azure Communication Services — V2.5

V2.5 adds a modular Azure Communication Services (ACS) layer for Email and SMS. The application uses the existing user-assigned managed identity rather than embedding ACS access keys in the container.

## Email sender

Configured custom domain: `exonuvia.com`

Configured sender: `WestburyChurchofChrist@exonuvia.com`

The Bicep template creates:

- `westburyapp-acs` (Azure Communication Services)
- `westburyapp-email` (Email Communication Service)
- the customer-managed domain resource `exonuvia.com`
- sender username `WestburyChurchofChrist`
- a managed-identity RBAC assignment scoped to the ACS resource
- application environment variables for the ACS endpoint and sender

### Important: custom-domain DNS verification cannot be completed by Bicep alone

Azure must verify domain ownership plus SPF and DKIM records in the DNS zone that hosts `exonuvia.com`.

After the first V2.5 infrastructure reconciliation run:

```powershell
.\scripts\acs-status.ps1
```

The script prints the exact verification records returned by Azure. Add those records to the DNS provider for `exonuvia.com`. Wait until Azure shows the domain, SPF, DKIM and DKIM2 as verified.

Only after verification, run:

```powershell
.\scripts\enable-acs.ps1
```

This links the verified custom domain to the ACS resource and enables email in the app.

## SMS / toll-free number

The ACS resource is created by Bicep, but Azure phone-number acquisition is intentionally not automated by this repository because purchasing a number is billable and may require eligibility/regulatory verification.

In Azure Portal:

1. Open `westburyapp-acs`.
2. Open **Phone numbers** > **Get**.
3. Choose United States and a Toll-Free number.
4. If Azure offers the capability selection, choose **one-way outbound SMS**. Do not select voice/inbound capabilities you do not need.
5. Complete toll-free verification under **Regulatory Documents** before relying on production delivery.

When Azure assigns the production number, enable SMS with:

```powershell
.\scripts\enable-acs.ps1 -EnableSms -SmsFromNumber "+1XXXXXXXXXX"
```

The app does not configure an inbound SMS/Event Grid handler. If the purchased number itself supports inbound messaging, the app still ignores replies. Carrier/platform STOP handling must remain available for compliance; do not attempt to bypass opt-out handling.

## App architecture

`src/communications/client.js` owns ACS SDK clients and authentication.

`src/communications/service.js` exposes channel-neutral email/SMS send functions and writes send audit metadata to the `NotificationLogs` Azure Table.

The rest of the app does not instantiate ACS SDK clients directly. This keeps the communications layer replaceable/testable and prevents notification concerns from leaking into the scheduler.

Email and SMS are separately feature-gated by environment variables. Provisioning resources does not automatically send messages.

## Church Administrator test endpoints

After ACS is enabled, the Church Administrator can use:

- `GET /api/owner/communications/status`
- `POST /api/owner/communications/test`

Example JSON for email:

```json
{
  "channel": "email",
  "to": "someone@example.com",
  "subject": "Westbury test",
  "message": "Azure Communication Services email is working."
}
```

Example JSON for SMS:

```json
{
  "channel": "sms",
  "to": "+17135551234",
  "message": "Westbury Church of Christ: SMS test"
}
```

These endpoints remain protected by Church Administrator authentication and the V2.4 CSRF/origin protections.
