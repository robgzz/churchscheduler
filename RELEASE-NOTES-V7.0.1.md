# Westbury Church Hub v7.0.1

## Purpose
Reliability patch for the v7.0.0 release based on live Westbury testing.

## Fixed
- Administrator console now executes its bootstrap initialization instead of remaining on “Loading administration…”.
- Children Care parent alerts now create an in-app Church Hub notification in addition to enabled email/SMS/native-push channels.
- Logged-in clients poll the in-app notification center every 10 seconds; urgent Children Care alerts surface immediately as an in-app toast and update the notification badge.
- Schedule/program screen uses progressive disclosure: the three nearest service programs are expanded by default; later programs remain collapsed and can be expanded individually.

## Email deliverability note
v7.0.1 does not claim that SPF/DKIM/DMARC alone can force inbox placement. Azure Communication Services acceptance and authentication are separate from recipient spam filtering and sender/domain reputation. The application continues using the configured verified ACS sender address.

## Compatibility
No Azure resource or storage migration is required from v7.0.0.
