# Westbury migration notes

## Preserved from the supplied Netlify data

The V2 seed preserves the member IDs and usernames from the supplied Westbury member export where possible, along with:

- active/inactive status
- ministry eligibility
- service availability
- proactive unavailability ranges
- same-day service preference
- legacy last-served hints used only until authoritative V2 completed history grows

The legacy Netlify password hashes/salts are intentionally **not** migrated. Users should be provisioned with a new V2 password and can be required to change it.

Obvious test records are preserved in the seed only as `legacyTestCandidate=true` so an Admin can review/delete them instead of silently losing data.

## Legacy role normalization

V2 collapses old implementation-specific IDs into understandable ministries.

| Legacy data | V2 ministry |
| --- | --- |
| `role_presidir` | Preside / Welcome & Prayer |
| `role_cantos` and linked song-line role IDs | Songs |
| `role_lectura_oracion` | Scripture & Prayer |
| `role_sermon` | Meditation |
| `role_jr87n03i` | Class Teacher |
| `role_d25gp4lx` | Pastoral Prayer / Petitions |
| `role_cena` | Communion & Offering |
| `role_5og6pjw7` | Closing Prayer & Announcements |
| `role_yz0y2xna` | Closing Prayer |
| `role_7od6h1yq` | Vigilancia |

Terminology aliases are deliberate:

- **Peticiones** = legacy **Oración Pastoral**
- **Meditación** = legacy **Sermón**
- Both visible song-set rows display **Cantos**; “4 Cantos” was a typo in an earlier manual sample.

## Legacy service normalization

- `sess_dom_clase` -> Sunday Class — 9:30 AM
- `sess_dom_ador` -> Sunday Worship — 11:00 AM
- `sess_miercoles` -> Wednesday Class — 7:00 PM

These are Westbury defaults only. Services and their program templates remain editable so another church can create any schedule/order it needs.

## Song library

The supplied live Netlify `songLibrary` is included in `seed/westbury/songs.json` with **216 songs numbered 0 through 215**.

The legacy data shape stored the hymn number in `title` and the display title in `number`; titles containing commas were sometimes split between `number` and `key`. V2 normalizes these records to:

```json
{
  "id": "song_vmlt0kv3",
  "number": "5",
  "title": "Oh, Bondad Tan Infinita!",
  "active": true,
  "legacySource": {
    "title": "5",
    "number": "\"Oh",
    "key": "Bondad Tan Infinita!\""
  }
}
```

The legacy source fields are retained so the migration remains auditable and no source data is silently discarded.

## Historical data

V2 provides a new append-only History table. The old manually/generated schedules supplied in conversation were useful for reconstructing the new template semantics but were not included as “completed service truth” because the legacy format cannot reliably prove who ultimately served after all replacements.

Going forward, V2 records scheduled, reassigned, unavailability, replacement and completion events explicitly.
