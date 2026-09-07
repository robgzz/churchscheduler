# Church Scheduler V3.4.0

## Reliability
- Automatic one-time CSRF token recovery and retry in member and admin clients.
- Container Apps web tier defaults to one warm replica, up to six replicas, 0.5 CPU / 1 GiB, and startup/liveness/readiness probes.
- Deployment retains dependency/security checks; runtime stability improvements focus on session recovery, warm replicas, probes, and burst scaling.
- Health endpoint reports V3.4.0.

## Member access requests
- Admin inbox now supports Accept and Reject.
- Accept creates or updates a member profile from the submitted name, email and phone and links the request to that member.
- Reject records the review state. Both actions are audited.

## Member exports
- People can be exported to CSV, Excel-compatible XML, or PDF.
- Export includes contact information, status, groups, ministries, services, assignment eligibility and unavailability.

## Audit
- Audit exports include service date/time, service, assignment label/key, ministry, participation status, scheduler score, original/current/previous/new member, replacement indicators, songs, source, reason, and raw event details.
- Admin audit view now presents operational history instead of only scheduler-decision cards.
