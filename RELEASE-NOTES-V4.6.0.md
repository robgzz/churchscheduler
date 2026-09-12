# Westbury Church Hub V4.6.0

## Root-cause repair
- Restored one canonical `settings()` admin renderer.
- Removed the broken `settingsBase=settings` runtime monkey-patch and the follow-on wrapper residue that could execute before `settings` existed.
- Owner tools (Modules, Events/RSVP, Follow-up, Advanced, Audit, Reports, Children Care, Communications, Imports) are wired directly inside the canonical Settings renderer.
- Admin failures remain visible through the loader instead of a blank page.
- Cache/import versions advanced to V4.6.

## Chat Hub deterministic language
- Protected singing, teaching, participation, and month vocabulary from fuzzy mis-correction.
- Added natural teaching/singing forms in Spanish, English and Spanglish.
- Added member participation/history queries by month/date range.
- Event questions outrank generic announcement matching when the word event is explicit.
- Fellowship questions route to announcements without colliding with unavailability.
- “Tengo peticiones” routes to the signed-in member’s own prayer requests.
- Exact full-name member lookup is preferred over fuzzy alternatives.
- Wednesday class questions without a date return the next three Wednesday teachers.
