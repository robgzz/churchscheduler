# Church Scheduler V2.2.0

## Included in this release

- Modernized mobile-first visual design for member and Admin experiences.
- Large, high-visibility service date tiles and relative date context.
- Strong "Your assignment / Tu asignación" callouts.
- Cantos assignments clearly identify the member as the song volunteer and warn when songs still need selection.
- Redesigned 200+ song picker with persistent Save/Cancel controls, selected count, search, and All/Selected filters.
- Program cards with clearer service/date hierarchy.
- Friendlier mobile navigation icons and cleaner action hierarchy.
- Browser-side short-lived Programs/Assignments cache.
- Server-side read-through Azure Table cache with write invalidation for low-churn data.
- HTTP response compression for larger payloads.
- Improved PWA static-shell caching.
- Bicep default burst ceiling increased to four Container App replicas while retaining scale-to-zero by default.
- Existing V2.1 bilingual, theme, branding, song-selection, sharing, scheduler, history, and permission features remain included.

## Not included

Azure Communication Services automated SMS/email is not provisioned in V2.2. Native Share, WhatsApp and user-initiated SMS program sharing remain available.

## Validation

- 19 automated tests passing.
- JavaScript syntax checks passing for server and browser source.
