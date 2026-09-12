# Chat Hub V4.4 deterministic conversation architecture

## Safety boundary

Chat Hub is a conversational interface, not a second business-logic system. The resolver may understand a request, but execution still requires the signed-in user's normal role/capability, the target module to be enabled, all required entities/slots, and confirmation for changes. Unknown/ambiguous requests are clarified rather than guessed.

## Interpretation pipeline

`voice/text -> normalization -> typo correction -> question/request classification -> phrase matches -> concept matches -> action/domain grammar -> role/context scoring -> confidence gap -> clarification or handler -> authorization -> module policy -> business action -> deterministic response`

Voice recognition supplies text only. The browser infers missing terminal punctuation for likely questions, while the server independently classifies question/request intent and does not rely on punctuation.

## Functional coverage matrix

| Domain | Member questions/requests | Admin extensions |
|---|---|---|
| Navigation | Open Home, Program, Church, Events, Tasks, Petitions, Profile, Children Care, Chat Hub | Open Admin Console |
| Services | service times / regular schedule | same plus admin console configuration access |
| Worship | my assignments, who preaches/serves, specific program roles | readiness, generate Smart Fair schedule, missing Cantos |
| Cantos | song lookup, number/title, prior-song history | pending song-selection review |
| Availability | register planned absence | operational program status reflects it |
| Replacement | request coverage for own assignment | admin program workflows remain available in console |
| Publications | latest bulletin, announcement count/list/details/date/time/location | upload bulletin, create announcement |
| Events | upcoming events, RSVP state, register, cancel RSVP, hide event | create event, list named RSVPs |
| Tasks | list own tasks, complete, cancel, hide | create/assign task, list pending/all tasks |
| Prayer | public/current, mine, create private/public, delete mine | public/private/current review |
| Children Care | child status, pickup code, alternate verification, request pickup | current care summary |
| Caregiver | assigned-room roster and pickup-request status | current care summary |
| Profile | email/phone/ministry/preferences summary | member search/profile/create account |
| Notifications | unread/recent notifications | communications operational status |
| Visitors | — | visitors/access requests |
| Reports | — | report catalog and retained task/event status explanation |
| Audit | — | recent administrative/history activity |
| Modules | enabled behavior is respected | list modules; owner can enable/disable |

## Language strategy

Each intent contains English and Spanish canonical phrases plus common Spanglish forms. The resolver also scores concepts independently, so requests do not have to match an exact sentence. Examples:

- `What me toca este domingo?`
- `¿Quién is preaching este domingo?`
- `How many anuncios hay today?`
- `Open mis tareas.`
- `Create una petición.`
- `Upload el boletín.`
- `Assign tarea a Roberto.`
- `Show peticiones privadas.`

Fuzzy correction is restricted to the known Chat Hub vocabulary to reduce unsafe false positives.

## Data sensitivity

Pickup codes and alternate parent-verification responses are marked sensitive. Codes are not put into audit detail or unknown-request logs. Children Care release remains a caregiver-authorized physical handoff; Chat Hub does not let a parent self-release a child.
