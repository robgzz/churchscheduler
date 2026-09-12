# Westbury Church Hub V4.1.0 — Chat Hub

V4.1.0 adds **Chat Hub**, an optional, bilingual, deterministic conversational module. It does not use a generative AI model. It translates supported everyday-language questions and requests into known Church Hub intents, validates permissions and module state, uses the existing application services/data, and returns auditable results.

## Member capabilities
- Ask what they are assigned during the current/next two weeks; Cantos assignments include recent song history.
- Ask for a seven-day Church Hub summary.
- Ask about announcements and dated church information, including location/date/time; fuzzy matching is bounded to known vocabulary and existing content.
- Ask about upcoming events and public prayer requests.
- Request a replacement or add a single-date unavailability.
- Ask about Children Care status, request pickup, and securely recover/reissue the pickup code for their own active child check-in.
- Large visible press-and-hold microphone input, keyboard input, quick prompts, and accessible action buttons.

## Administrator capabilities
- Read program readiness and pending Cantos selections.
- Search members.
- Upload a weekly bulletin through a conversational attachment flow (+ button), optionally add a message, review, confirm, and publish.
- Administrative intents remain authorization-gated; Chat Hub never expands account permissions.

## Security and reliability
- Chat Hub is a normal server-enforced module and can be disabled from Module Administration.
- No direct storage writes from the browser chat. Commands run through server handlers and existing application services.
- CSRF, same-origin checks, login requirement, per-user rate limiting, module gating, role checks, and audit history remain in force.
- Children pickup codes remain hash-verified for release. V4.1 can additionally encrypt the recoverable code at rest using AES-256-GCM. Existing active records without encrypted codes receive a newly rotated code when the parent asks Chat Hub.
- Pickup-code plaintext is not written to audit logs or Chat Hub session state.
- Chat state contains only short-lived deterministic context (30-minute TTL), not a permanent transcript.
- Unknown requests can be recorded in normalized form for future deterministic vocabulary improvements; known sensitive pickup-code requests are excluded.

## Infrastructure
- New Azure Tables: `ChatSessions`, `ChatUnknowns`.
- New secure Container App secret/env: `CHILD_PICKUP_CODE_ENCRYPTION_KEY`.
- First-deploy scripts generate the pickup-code encryption key automatically.
- GitHub Actions remains the application image deployment path and runs tests/syntax validation before deployment.
- Version health endpoints report `4.1.0`.
