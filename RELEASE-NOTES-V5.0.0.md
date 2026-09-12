# Westbury Church Hub V5.0.0

## Major release: Deterministic Conversational Engine (DCE)

V5.0 replaces Chat Hub's phrase-first interpretation path with a compositional deterministic engine while preserving every existing server-side permission, module gate, business rule, confirmation workflow, and application service.

### DCE architecture

The new generic engine under `src/dce/` compiles natural language into a canonical command frame:

`text/voice -> normalization -> speech act -> operation -> domain/resource -> slots/entities -> temporal scope -> context -> command frame -> intent adapter -> authorization -> handler`

The generic engine is application-neutral. Church-specific language and capability mapping lives in `src/chatHub/domainPack.js`, making the core suitable as the foundation for future Exonuvia application adapters.

### Canonical command frames

Frames contain:
- speech act: query, command, navigation, confirmation, rejection, correction, cancellation, follow-up
- canonical operation: get, list, count, exists, search, history, create, delete, cancel, complete, register, upload, generate, enable, disable, request, open, etc.
- domain and resource
- subject scope
- service/role filters
- temporal scope and next-occurrence count
- requested projection such as person/date/location/count
- deterministic confidence/evidence

### Conversational context

Short follow-ups can inherit the prior structured frame rather than re-parsing old chat text. For example:

- `¿Quién predica este domingo?`
- `¿Y la próxima semana?`

The second turn retains the worship/meditation context and changes only the temporal scope.

### Bilingual and Spanglish composition

Spanish, English and Spanglish surface forms map into the same canonical operations and Church Hub resources. The engine no longer requires every complete sentence variation to be listed as a phrase.

Examples validated in regression tests include:
- `who predica este Sunday?`
- `who has cantos este domingo?`
- `show me los anuncios`
- `create un miembro`
- `enable prayer`

### Safer normalization

Global fuzzy correction was replaced with a conservative policy:
- exact canonical vocabulary first
- explicit known typo map second
- restricted one-edit correction only for long tokens with a clear winner
- protected high-value words that are never fuzzily rewritten

This prevents failures such as `cantar -> cuántas` while still recognizing common misspellings such as `confrqternidad`.

### Capability registry and query planning

`src/chatHub/capabilityRegistry.js` centralizes module/risk metadata for all supported Chat Hub operations.

`src/dce/queryPlanner.js` produces an auditable plan from each frame, including source, filters, projection, aggregate, limit, and whether the operation mutates state.

### Program queries

Program queries can use DCE-extracted role/service/time slots. Requests such as `¿Quién da la clase los próximos 3 miércoles?` return the requested number of matching upcoming assignments.

### Security model unchanged

Natural-language understanding does not grant authority. Every resolved command still passes through authentication, tenant/church scope, server-side authorization, module state, business rules, and existing confirmation flows. No generative AI, LLM, embeddings, vector database, or external model API is included.

### Compatibility

The legacy phrase resolver remains as a compatibility fallback for older supported wording while V5 DCE becomes the primary interpretation path. Existing Chat Hub handlers and application services remain authoritative for execution.

### Deployment

V5.0.0 adds no Azure resources or tables. Upgrade through the normal GitHub Actions application deployment. No bootstrap or `first-deploy.ps1` infrastructure reconciliation is required for an existing V4.6 deployment.
