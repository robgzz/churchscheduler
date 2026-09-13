# Westbury Church Hub V5.6.0

## DCE 3.0 — Goal Arbitration and Diagnostic Reasoning

V5.6 is a deterministic Chat Hub intelligence release. It targets the concrete conversational failures observed in the V5.5 transcript rather than adding a larger flat phrase list.

### Goal arbitration and context safety
- A pending workflow no longer has absolute priority over an explicit new request.
- Expected-slot replies are validated against the slot type before they continue a workflow.
- Unrelated requests suspend the prior goal instead of being swallowed by it.
- Suspended goals can be resumed, while completed or unrelated goals remain separate.
- Turn arbitration is retained in structured conversation context for deterministic tracing.

### More precise semantic frames
- Self/possessive language such as `mis`, `me toca`, `tengo`, `my`, and `mine` resolves to the authenticated member instead of a generic program query.
- Question projection is separated from resource detection: WHO, WHAT, WHERE, WHEN, HOW and WHY influence the requested output instead of merely contributing phrase score.
- DCE frames now expose component confidence for speech act, operation, domain, resource, subject, time and entity resolution.
- HOW-TO, HELP, EXPLAIN and WHY are first-class speech acts.

### Songs intelligence
- `¿Quién falta escoger cantos?` resolves to missing song selections rather than the caller's song-selection workflow.
- `¿Cuáles son mis cantos?` and `Dime los cantos que escogí` show the member's saved selections.
- `¿Ya están elegidos mis cantos?` reports status without automatically entering edit mode.
- Bare `Cantos` can expose deterministic affordances such as selected songs, missing selections, history, search and selection instead of assuming a library search.
- Missing-song administrator results include member, date, service and assignment context.

### Church-domain ontology
Natural Westbury terminology maps to canonical program roles. Examples include:
- `predicar`, `sermón`, `mensaje` -> Meditación
- `cantar`, `dirigir cantos` -> Cantos
- `Cena del Señor`, `cena`, `comunión` -> Cena y Ofrenda
- `orar`, `oración final` -> the appropriate prayer/closing role when context supports it

The engine also resolves `domingo pasado` / `last Sunday` to a concrete date so historical program questions can query prior programs instead of only future ones.

### Capability graph and diagnostics
- Chat Hub has a declarative capability graph for supported actions around Songs, Worship and Members.
- Program readiness diagnostics use a structured rule trace to explain open positions or missing song selections.
- Member eligibility diagnostics can identify active status, service availability and service-specific ministry eligibility.
- Response planning can answer the requested projection first while preserving a path to the full program or next permitted action.

### Compatibility and infrastructure
- Existing DCE/Chat Hub handlers, procedures, permissions and confirmation policies remain in place.
- No generative AI is added.
- No new Azure resource, table, container or bootstrap step is required.
