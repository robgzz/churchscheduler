# Westbury Church Hub V7.0.0

**Conversational Operations, Leadership Intelligence & UI Precision**

V7.0.0 is a major product release built on the V6 DCE 4.0 architecture. It keeps the deterministic, auditable Church Hub model while making Chat Hub more complete and conversational, rebuilding reporting around real leadership decisions, and refining the highest-use member/admin surfaces.

## 1. Chat Hub: executable reliability

- Restores missing executable helpers that caused runtime errors for announcement, event, and member-related questions (`announcementsQuery`, `eventsQuery`, `queryTerms`, shared content matching).
- Adds execution-failure containment. Raw JavaScript exceptions are logged with a support reference instead of being shown to members.
- Adds **New chat** and **Resume previous task** controls while preserving suspended workflows.
- Strengthens same-domain goal arbitration so a member-list request can interrupt a pending member edit without losing the pending edit.
- Adds permanent v7 regression tests for the production conversation failures that exposed these gaps.

## 2. Chat Hub: church-language precision

- Separates member **profile**, **administrative authority**, **ministry eligibility**, **scheduled assignment**, and **service history** as distinct questions.
- Adds explicit member-profile queries such as “Perfil de Andrés Trejo” and authority questions such as “¿Luis Betanco es administrador?”.
- Expands enable/disable language: añade/agrega/incluye/habilita/activa/permite and corresponding removal/negative forms.
- Tightens program-role matching so Communion/Cena queries lead with the recorded Communion/Offering assignment rather than linked song lines.
- Improves response semantics: scheduled assignments are described as schedules, not proof that a person actually served.
- Accepts unambiguous slash dates (`9/20/2026`, `20/9/2026`) and asks for clarification when a slash date is genuinely ambiguous (`9/10/2026`).
- Cleans display punctuation in guided event creation while preserving entered values in storage.

## 3. Chat Hub: task and workflow accuracy

- “Do I have tasks?” / “¿Tengo tareas?” now prioritizes actionable open/in-progress work.
- Overdue unfinished tasks remain visible and are no longer lost because their due date passed.
- Completed/cancelled tasks are separated from current actionable work.
- Completion and cancellation timestamps are recorded prospectively for accountability reporting.

## 4. Leadership Intelligence reporting

V7 keeps the detailed report families while introducing three purpose-driven flagship reports:

### Monthly Leadership Overview
Provides a concise executive view of:
- worship/program readiness,
- unresolved and overdue follow-up,
- communications outcomes and failures,
- visitor activity,
- replacement activity,
- Children Care activity/exceptions,
- current attention items and period context.

### Weekly Worship Readiness
Helps worship leaders identify:
- unfilled assignments,
- missing Cantos selections,
- replacement requests,
- ministry-specific readiness gaps,
- assignment distribution and scheduling load.

### Follow-up Accountability
Surfaces:
- open and overdue tasks,
- unassigned work,
- responsible person,
- completion status/timing where recorded,
- status and owner distribution.

### Reporting truthfulness rules
- A scheduled worship assignment is **not** reported as proof a person actually served.
- An RSVP is **not** reported as attendance.
- Provider acceptance of a communication is **not** presented as message readership.
- Visitor contact outcomes are not invented where the app has not recorded them.
- Sensitive prayer/Children Care details remain outside general leadership summaries unless authorized and appropriate.

## 5. Professional PDF, Excel and Report Center presentation

Leadership PDFs now use a consistent Westbury report structure:
- church branding and reporting period,
- executive metric cards,
- leadership findings,
- items needing attention,
- restrained visual bar analysis,
- detailed appendix,
- interpretation notes,
- data-completeness notice when source retrieval limits may truncate results,
- page numbering and clean print-oriented hierarchy.

Excel exports include a styled **Overview** sheet plus a **Detail** sheet with frozen headers and filters. CSV remains available as a record-oriented interchange format.

The Admin Report Center now previews leadership metrics, findings, attention items, visual analysis, supporting records, and methodology before export, with 7/30/90-day period controls.

## 6. UI refinement

- More conversational Chat Hub visual hierarchy with distinct assistant/member bubbles.
- Thinking/loading state during message execution.
- Natural starter prompts and clearer Answer / Guide / Execute framing.
- Voice and attachment input retained.
- Explicit new-conversation control and resumable pending workflow affordance.
- Improved keyboard focus and disabled states.
- Responsive leadership report cards, metric grids, findings, attention panels, and chart previews.
- Overdue task emphasis and collapsible completed/cancelled task history.

## 7. Architecture and security

- DCE remains deterministic; V7 reports DCE version **4.1** to identify the strengthened language/execution layer.
- Existing role, module, CSRF, origin, session and storage authorization boundaries remain authoritative.
- Chat Hub still cannot bypass application permissions.
- Protected writes continue to require the applicable confirmation/authorization flow.
- Heavy PDF/Excel libraries are loaded only when an export is requested rather than eagerly loading with the analytics layer.

## 8. Deployment compatibility

- No new Azure service is required.
- Existing Azure Table/Blob data remains compatible.
- Existing v6.1 deployment scripts and Container Apps topology remain the base.
- Follow-up `completedAt` / `cancelledAt` timestamps are populated prospectively as tasks transition after this release; historical tasks without those fields remain valid.
- Static asset cache version advances to `v700` so clients receive the new UI.

## 9. Validation

V7 adds release regression coverage for the failures observed in real Chat Hub conversations, plus syntax validation across application JavaScript. Export composition is tested structurally in this source package. The source archive does not include installed Node dependencies; production/CI should install declared dependencies before runtime PDF/Excel rendering tests.
