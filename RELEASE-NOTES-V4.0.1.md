# Westbury Church Hub V4.0.1

## Reliability and security-token recovery

- Returns the CSRF token created with every new login session.
- Adds a dedicated no-cache token refresh endpoint and retries a rejected write once.
- Preserves same-origin and CSRF protections for every state-changing request.

## Faster attachments and infrastructure

- Streams announcement and bulletin files from Azure Blob Storage instead of buffering the complete file in application memory.
- Adds browser cache validation, ETags, and a one-day immutable cache for published attachments.
- Scales the web container at 15 concurrent requests, with 1 vCPU and 2 GiB memory per replica.
- Explicitly provisions all Children Care, Events, registration, and Follow-up Azure tables.

## Children Care

- Child check-in succeeds independently of Azure SMS approval.
- Pickup codes are queued for each enabled and available channel: SMS, email, native push, plus a durable in-app notification.
- The caregiver portal reports active counts for Nursery and Toddlers while still restricting child details to assigned caregiver roles.
- A clear access notice explains when another care area has active children, avoiding silent empty screens.
- Adds a warmer nursery visual treatment, care status ribbons, pickup verification actions, and clearer notification-channel indicators.

## Module administration

- Replaces the plain module checkbox list with branded module cards, icons, state descriptions, and accessible switches.
- Fixes the module label/internal-key collision visible in V4.0.0.
