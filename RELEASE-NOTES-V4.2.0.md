# Westbury Church Hub V4.2.0 — Operational Intelligence

V4.2.0 deepens the deterministic Chat Hub and closes several operational gaps in member imports, announcements, follow-up tasks, and Events RSVP. It remains modular, bilingual, mobile-first, auditable, and compatible with the V4.1 Azure/GitHub deployment model.

## Exact-state member imports

- Member spreadsheets can now declare an authoritative snapshot with `AssignmentEligibilityMode=explicit`.
- When the snapshot columns are present, import **replaces** Ministries, Services, and AssignmentEligibility instead of only adding values.
- Empty values are meaningful in snapshot mode and can remove stale worship eligibility.
- The custom XLSX parser now supports namespace-prefixed XLSX XML and self-closing empty cells, so exported/generated workbooks keep columns aligned.
- The package includes `imports/Westbury-Members-Updated-From-Handwritten-Lists.xlsx`, ready for the updated importer.

## Announcements

- Announcement creation now includes dedicated **Event date** and **Start time** fields in addition to address.
- Member views display the announcement activity date/time when provided.
- Chat Hub can use structured announcement date/time/location data when answering questions.

## Follow-up tasks

- Tasks now require an assignee when created from the admin workflow.
- Assigned members receive a Tasks destination in the member app when Follow-up is enabled.
- Home surfaces a personal task summary.
- Members can move their own tasks through supported states and mark them complete.
- Admin views show the assigned member, due date, notes, and status actions.

## Events and RSVP

- RSVP records persist the member name in addition to member ID.
- Event API responses include the current member's registration state.
- Members see a clear **Registered** state after RSVP and after returning to the app.
- Members can cancel their own RSVP.
- Admin event views show registered member names.
- Event reports include `RegisteredNames`.

## Chat Hub V4.2

Chat Hub remains deterministic: no generative AI model is used. V4.2 adds a much larger intent/concept vocabulary, typo normalization, conversational state, question/request classification, role-aware command routing, and additional read/write workflows.

Supported examples include:

- “¿Qué me toca?” / “When do I serve?”
- “¿Quién va a predicar este domingo?”
- “¿Quién tiene Cantos / Vigilancia / Comunión?”
- “¿Cuántos anuncios hay hoy?”
- “¿Qué anuncios hay esta semana?”
- “¿Dónde es la próxima confraternidad?”
- “¿A qué eventos estoy registrado?”
- “¿Qué tareas tengo?” / “Marca mi tarea completada.”
- pickup-code recovery and child status for the authenticated family only
- replacement and unavailability flows
- public prayer-request lookup

Administrator conversations additionally support program readiness, missing-song review, member search, bulletin upload, announcement creation, event creation, task assignment, pending-task review, and module-state queries. Administrative writes retain confirmation and authorization boundaries.

### Voice input

- The visible microphone remains press-and-hold.
- Final transcripts are normalized before deterministic intent resolution.
- Chat Hub infers whether speech is a question or request and adds terminal punctuation when the speech provider omits it.
- Question/request classification influences intent scoring but never bypasses permissions or confirmation rules.

## Security and stability

- Chat Hub remains an optional server-enforced module.
- Existing application authorization and module checks remain authoritative.
- Sensitive Children Care data remains scoped to the authenticated family/authorized caregiver flow.
- Administrative actions remain audited and use existing application services rather than browser-side storage access.
- No new Azure resource type is required beyond the V4.1 infrastructure baseline.

## Validation

- JavaScript syntax checks pass.
- 96 automated tests pass, including V4.2 tests for deterministic program questions, announcement counting/listing, RSVP persistence, tasks, announcement date/time, voice punctuation, exact-state imports, and real packaged-workbook parsing.
