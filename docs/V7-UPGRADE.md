# Westbury Church Hub V7.0.1 Upgrade

## Scope

V7.0.1 upgrades the v6.1/v7.0.0 application in place. It does not require a new Azure service or a data migration.

## Upgrade steps

1. Back up the current application configuration and persistent Azure Table/Blob data using the same operational process used for prior releases.
2. Replace the v6.1 working tree with the V7.0.1 full package.
3. Install production dependencies with the repository's normal Node 22 deployment workflow.
4. Build/push the new container image and deploy through the existing GitHub/Azure Container Apps pipeline.
5. Verify `/healthz` and `/readyz` after deployment.
6. Open the member PWA and Admin portal once online so the V7 service worker/cache (`v700`) replaces the previous shell.

## Required post-deploy verification

### Chat Hub
Run these conversation checks with appropriate roles:
- `Hay anuncios?`
- `Hay eventos?`
- `¿Quién está asignado a Cantos?`
- `Perfil de Andrés Trejo`
- `¿Luis Betanco es administrador?`
- Begin an eligibility change, then ask `Dame la lista de todos los miembros`, then resume the previous task.
- Create an event using `9/20/2026`.
- Enter an ambiguous date such as `9/10/2026` and verify Chat Hub asks which date was intended.
- Ask `¿Tengo tareas?` with an overdue unfinished task and verify it remains visible.

### Reporting
From Admin > Report Center:
- Preview Monthly Leadership Overview.
- Preview Weekly Worship Readiness.
- Preview Follow-up Accountability.
- Verify attention items link back conceptually to the underlying records.
- Export a PDF and Excel workbook in the deployed environment and inspect them visually before leadership use.

### UI
- Verify Chat Hub thinking state, starter prompts, voice/file controls, New chat, and Resume previous task.
- Verify overdue tasks are emphasized and completed/cancelled tasks are in history.
- Verify Report Center behaves correctly on desktop and mobile widths.

## Data compatibility

No table rewrite is required. Follow-up task terminal timestamps are additive:
- `completedAt` is written when a task transitions to completed.
- `cancelledAt` is written when a task transitions to cancelled.

Older records without these timestamps remain supported; historical completion-duration analytics will naturally become richer as V7 accumulates new transitions.

## Rollback

Because V7 does not require a destructive schema migration, rollback can use the prior v6.1 container image if needed. Keep the V7-written additive task timestamp fields; v6.1 will ignore unknown fields.


## V7.0.1 live-test fixes
- Admin console bootstrap initialization restored.
- Children Care parent alerts now create in-app notifications as well as enabled delivery channels.
- App notification polling updates every 10 seconds while signed in.
- Only the three nearest worship program cards are expanded by default; later programs are collapsible.
