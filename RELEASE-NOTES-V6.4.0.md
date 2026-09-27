# Westbury Church Hub V6.4.0 — authoritative anthology

Based on the complete V6.3.0 source package, retaining all V6.3 fixes, collapsed programs, profile account deletion, native push plumbing, and the existing `welcome` initial-password policy.

## Songs and authoritative numbering

- 226 user-provided PowerPoint hymns extracted into `anthology/markdown/*.md`.
- The human-readable authoritative title and number of every supplied hymn appears in `anthology/INDICE-CANTOS.md`; structured provenance is in `anthology/MANIFEST.json`.
- The one damaged source presentation for #68 was replaced by the separately uploaded `#68 De Mi Tierno Salvador.pptx`.
- The uploaded replacement archive fills every hymn #69 through #99.
- Distinct same-number source files have separate titles and IDs: `203a Dias de Elias`, `203b MAS ALLA DEL SOL`, `223a DIAS DE ELIAS`, `223b ESPERAR EN TI`.
- #133, #202 and #213 were not included in the files supplied and are intentionally not fabricated.
- The source slide file's hymn numbers take precedence over V6.3's legacy `songs.json`; prior numbering is not used to overwrite a differently titled hymn.

## User and admin UI

- All authenticated app users (not just members of the worship-role group) get a searchable **Songs / Cantos** navigation tab with actual text for each hymn. Also available from the **Church** page.
- Admin → Content → Songs still provides the song library, and opening a song retrieves its complete Markdown lyrics for review/editing.
- Worship-song selection still works as before, using the new titles/numbers and stable historical IDs when a title is genuinely the same.
- All user content is inserted as escaped text; there is no unsafe Markdown/HTML renderer.

## Production migration behavior

**Back up or export current production song and assignment records before deploying this release.**

First start in Azure with existing `seed.version < 5` performs an idempotent V6.4 anthology reconciliation:

- An old hymn row is reused only when its normalized title matches a source hymn; its new number/title/Markdown come from the uploaded files. This preserves assignment references for genuinely identical hymns whose numbers changed.
- A differently titled old hymn is never reused just because it has the same number; a new canonical row is created, avoiding silently changing the meaning of existing assignment IDs.
- Songs absent from the submitted anthology become inactive (NOT deleted). Their historical program references remain.
- The migration writes a version-5 seed marker only when complete; partial runs can be safely retried on restart.
- This release does not reset any existing account password. Newly provisioned accounts continue to receive the initial password **welcome** and must change it at first sign-in.

Because numbers have changed and legacy songs absent from the anthology are inactive, verify upcoming song assignments after deploying, and reselect any legacy selections that no longer refer to an active anthem.

## Verification

Automated unit/regression tests: **197 passed of 197**, `npm run lint:syntax`: PASS. Automatic tests are not a substitute for validating the production migration and the TestFlight build on a physical iOS device. The APNs pickup-notification issue discussed previously is NOT asserted fixed by this anthology release; test it separately before App Store review.
