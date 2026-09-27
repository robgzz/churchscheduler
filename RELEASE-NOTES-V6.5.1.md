# Westbury Church Hub V6.5.1 — Antología / GitHub CI fix

This release preserves V6.5.0 Smart Fair rotation, separate week-generation controls,
optional member password changes, and all 226 authoritative songs.

**Fix:** GitHub CI failed in `test/release-v6.4.test.js:25` with `277 !== 226`.
That assertion counts **Markdown files**, not `songs.json` records. Overlaying the
new release over an older Git checkout does not delete previously tracked legacy
Markdown files, leaving 51 extras in `anthology/markdown`.

`npm test` now runs `scripts/sync-anthology.js` before the test suite. The script
checks the canonical 226-entry song seed and the explicit 226-file filename manifest,
then restores canonical Markdown content and removes **only** extra `*.md` files
within `anthology/markdown`. It refuses to modify anything if the seed/manifest
mismatch, and does not touch member data, assignments, or unrelated documents.

## When updating an existing Git checkout

After overlaying the release, run `npm run sync:anthology`, then `git add -A`,
commit, and push. **Commit the deletions of obsolete Markdown files** so future
GitHub checkouts no longer include them. Running `npm test` also syncs automatically
in CI and in a local checkout, but local deletion commits are recommended.
