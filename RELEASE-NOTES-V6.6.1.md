# Westbury Church Hub V6.6.1 — independent Sunday worship song positions

## What changed
- The two scheduled *Cantos* leaders keep their existing assignments and program order, but each now receives independent song selection controls for each of their program positions.
- **Cantos A:** main set + one invitation song. **Cantos B:** main set + one communion song + one offering song.
- The Sunday Worship program and WhatsApp/SMS sharing display songs only under the corresponding section, including formerly linked positions.
- Home and My Assignments show the specific incomplete section and an individual edit button; program readiness requires every song section for each assigned singer.
- Previously saved `songIds` continue as the **main set**. Nothing is guessed for invitation, communion or offering. A previously saved three-song main set remains intact.
- Back-end validates member ownership, active hymn identifiers, allowed sections and one hymn in each solo position. Duplicate song identifiers across leaders or across sections in the same service are rejected.
- Regeneration pins assignments with any saved song section; reassigning/replacing a singer clears all previous song sections.
- Chat Hub status, reports and audit exports include the extra song positions. The standard anthology is unchanged.

## Rollout
1. Deploy over the V6.6.0 repository, preserving existing Azure Table data. No destructive data migration or user action is necessary for previously chosen main songs.
2. Refresh the PWA so its `v661` assets load; re-open Oct 4 Sunday Worship and verify that the three old main songs still display under Cantos A.
3. Select the invitation hymn separately and ask Cantos B to choose each of their three positions.
4. Review admin readiness and the shared program. Automatic and manual regeneration should not replace protected singers with selected songs.

## Validation
Node syntax check; automated test suite including targeted regression cases. Integration with the deployed production Azure dataset must be checked after rollout; no live service data was modified in producing this package.
