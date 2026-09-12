# Chat Hub V4.3 deterministic conversation architecture

Chat Hub is a deterministic conversational interface over Church Hub application services. It is not a generative chatbot and it does not bypass normal permissions.

## Resolution pipeline
1. Normalize language and bounded misspellings against known vocabulary.
2. Classify question vs request/command.
3. Detect concepts such as member, program, prayer, event, RSVP, task, announcement, Children Care, dates, and administrative actions.
4. Score known intents using phrases + concepts + context + user role.
5. Reject unauthorized intents even when correctly recognized.
6. Enforce module state server-side.
7. Ask a clarification when scores are ambiguous.
8. Collect missing slots through a short deterministic state machine.
9. Confirm mutations according to risk.
10. Execute through server-side repositories/services and audit sensitive administrative changes.

## Primary intent families
- `assignments.*`, `program.query`, `replacement.*`, `availability.*`
- `songs.search`, `songs.history`
- `announcements.*`, `bulletins.latest`
- `events.*`
- `tasks.*`
- `prayer.*`
- `children.*`
- `profile.mine`, `notifications.mine`, `hub.upcomingSummary`
- `admin.program*`, `admin.member*`, `admin.bulletin*`, `admin.announcement*`, `admin.event*`, `admin.task*`, `admin.prayer*`, `admin.visitors*`, `admin.modules*`

## Safety rules
- Read access is filtered by existing identity and module permissions.
- Admin commands require admin capability; module mutation requires Church Administrator capability.
- Sensitive Children Care codes are not written to audit logs.
- Child release itself remains a caregiver action; Chat Hub can prepare/recover verification but cannot remotely release the child.
- Admin writes use explicit confirmation before execution.
- Low-confidence text never silently becomes a write operation.
- Unknown-request logs redact messages likely to contain prayer, Children Care, phone, email, code, or password data.

## Extending Chat Hub
Add new functionality as a domain intent in `src/chatHub/catalog.js`, vocabulary/concepts in `normalize.js` / `resolver.js`, and a server-side handler in `handlers.js`. Do not put data-layer writes in the browser. Keep intent outputs stable so more language variations can be added without changing business rules.
