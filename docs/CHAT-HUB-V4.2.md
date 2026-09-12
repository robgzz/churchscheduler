# Chat Hub V4.2 deterministic conversation architecture

Chat Hub is an optional Church Hub module. It converts natural member/admin language into known intents, entities, contextual slots and authorized application commands. It does not generate free-form business facts.

## Processing pipeline

1. Normalize language, accents, filler words and bounded typos.
2. Detect question vs request/command.
3. Score known phrases and semantic concept groups.
4. Resolve dates, service references, people and conversation context.
5. If confidence is insufficient, ask a deterministic clarification instead of guessing.
6. Apply module state and authorization.
7. For writes, collect missing slots and require confirmation where appropriate.
8. Call the existing Church Hub service/data layer.
9. Build a bilingual response from verified application data.

## Important principles

- Chat Hub never expands the signed-in user's permissions.
- Member questions read only information the member is allowed to see.
- Admin write commands remain role-protected and auditable.
- Children pickup codes can only be recovered for the authenticated family and are not stored in chat state/log text.
- The browser does not receive direct Azure Table credentials.
- If the deterministic engine is unsure, it asks a clarifying question rather than inventing an answer.

## V4.2 domain coverage

- Assignments and three-week personal schedule
- Worship program/person-role questions
- Replacement and unavailability
- Song history
- Announcements: count, list, details, date/time/location
- Events and personal RSVP state
- Follow-up tasks
- Public prayer requests
- Children Care status, pickup request and pickup-code recovery
- Admin program readiness / missing songs
- Admin member search
- Admin bulletin upload
- Admin announcement/event/task creation
- Admin pending-task and module-state queries

The intent catalog and concept dictionaries are intentionally modular so additional Church Hub domains can be added without changing the core resolver.
