# Westbury Church Hub V5.5.0

## DCE Guided Assistance Engine

V5.5 adds procedure-aware conversational assistance on top of the deterministic command-frame engine. Chat Hub can now explain a feature, show manual steps, offer to perform supported actions, maintain a goal across terse follow-ups, collect missing information, request confirmation, execute, and verify.

### Highlights
- New Procedure Registry is the canonical source for explanations, manual steps, permissions, and Chat-executable capabilities.
- Assistance Planner detects HOW-TO, HELP, EXPLAIN and WHY-style requests before generic resource matching.
- Conversation Goal state prevents short follow-ups such as “Cantos” or “Elige cantos” from falling back to song search when the active goal is song selection.
- Song selection can be completed inside Chat Hub by date and song number/title with duplicate-song validation and confirmation.
- Song history can be filtered by Sunday or Wednesday context.
- Chat Hub proactively offers song-selection help when a member has an upcoming Songs assignment without selected songs.
- Responsible Program Administrator can be explained and changed from Chat Hub with administrator validation and confirmation.
- Basic diagnostic/WHY responses explain readiness and song-selection constraints rather than returning an unknown-intent response.

No new Azure resources are required.
