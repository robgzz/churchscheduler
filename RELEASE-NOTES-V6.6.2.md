# Westbury Church Hub V6.6.2

## Program-first experience for Worship
- Members in the Worship/Adoración group now land on **Program** after sign-in and when opening an authenticated session.
- Other members and visitors retain the normal Home landing page.

## Simpler My Assignments
- Reworked My Assignments to emphasize only the date, exact program assignment, service/time, and required action.
- Song leaders see clear per-section actions such as **Escoger cantos** or **Editar** without a crowded list of song details.
- Replacement requests remain available but visually secondary.

## Administrator song assistance
- Administrators can now select or edit songs directly from each song position in every generated program.
- Song selection is section-aware (main block, invitation, communion, offering, etc.).
- The same duplicate-song and active-song validation used for members is enforced for administrators.
- Administrative song changes are written to history/security audit records and program readiness is recalculated.

## Security and performance
- New song-management APIs remain behind the existing administrator authorization middleware and CSRF protection.
- No extra program-wide payloads are introduced for normal member page loads; song catalogs are loaded only when a song selector is opened.
- Cache/version identifiers updated to V6.6.2.
