# Chat Hub V4.1 architecture

## Design rule
Chat Hub is a conversational interface over Church Hub, not a second business-logic system:

`voice/text -> normalization -> deterministic intent resolver -> entity/context resolution -> clarification -> authorization -> module/data policy -> handler/service -> response`

Chat Hub never grants permissions and never lets browser text select arbitrary database operations.

## Core components
- `normalize.js`: accent/case normalization, filler-word removal, bounded typo correction against a known lexicon.
- `catalog.js`: versioned supported intents, phrases, concept requirements, capabilities and sensitivity.
- `resolver.js`: deterministic weighted matching with confidence and ambiguity detection.
- `session.js`: 30-minute Table-backed context for pending multi-turn workflows.
- `policy.js`: role/capability decisions.
- `engine.js`: module gating, ambiguity handling, unknown-request capture, dispatch and localized response selection.
- `handlers.js`: domain handlers and guarded multi-turn workflows.

## Intent families in V4.1
### Member/read
`hub.upcomingSummary`, `assignments.mine`, `songs.history`, `announcements.query`, `events.query`, `prayer.public`, `children.pickupCode`, `children.status`.

### Member/write
`replacement.request`, `availability.add`, `children.pickupRequest`.

### Administrator
`admin.programStatus`, `admin.pendingSongs`, `admin.memberSearch`, `admin.bulletinUpload`.

## Clarification behavior
When confidence is low or two intents are close, no write is executed. Chat Hub returns recognized concepts and asks the user to choose/clarify. Write actions use explicit workflow state and confirmation where applicable.

## Voice accessibility
The member client exposes a large microphone control. Press-and-hold uses browser SpeechRecognition/WebKit SpeechRecognition where available. Speech recognition only creates text; the deterministic Chat Hub engine processes that text exactly like typed input. Transcript text is shown before sending and is not auto-submitted on release.

## Children Care pickup code policy
A pickup code may be shown only to the authenticated parent/guardian associated with the active check-in. Chat Hub cannot query another family’s code. V4.1 stores the verification hash and, when `CHILD_PICKUP_CODE_ENCRYPTION_KEY` is configured, an AES-256-GCM encrypted recoverable representation. Legacy active check-ins without it are rotated to a new code when recovered. Every view/rotation is audited without logging the plaintext code. Physical release still requires the caregiver verification workflow.

## Performance
Chat Hub uses bounded lookups, 30-minute lightweight session context, no external AI calls, and no persistent transcript. It remains independent of the existing navigation; disabling or failing Chat Hub does not prevent normal Church Hub use.

## Expansion contract
New domains should add intents/entity vocabularies/handlers rather than modify the core parser. Future alternative intent resolvers can implement the same `{ intent, confidence, entities }` contract while all authorization and execution stay deterministic.
