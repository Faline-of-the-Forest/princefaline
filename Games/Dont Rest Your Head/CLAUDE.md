# Don't Rest Your Head — working notes

- `app/` is the Claude Design export, used as is. The only design-file edits: in
  `DRYH Dashboard.dc.html` the class is renamed `DRYHBase` and a `Component`
  subclass (multiplayer layer) is appended; `Title Screen.dc.html` "Game Master"
  links to `?gm=1`. `build.js` copies `app/` to `dist/games/dont-rest-your-head/`.
- `app/js/dryh-net.js`: Firestore transport + join gate + room pill.
  Room doc `rooms/dryh-<code>` (`sharedJson`, `cityJson`). Backups in
  `tbpBackups` with `game:'dryh'`, plus `localStorage['dryh-backups']`.
- Shared = `defaultState()` keys + anything passed to `commit()` + `MP_EXTRA`,
  minus `MP_LOCAL` (tabs, sheets, panels, hovers, drafts stay per screen).
  Edits are held for 2.5s against stale snapshots, as in Tokyo Brain Pop.
- Players don't get the GM panel, the map button or Act cycling. GM ▸ GAME has UNSTICK (clears the live
  conflict and every pop-up for everyone) and BACKUPS ⟲.
- Never open `?room=` from a local preview: it hits production Firestore.
- Preference: no native `title` tooltips in new UI.
- Read `Games/Tokyo Brain Pop/CLAUDE.md` §0 and §3: same requirements, same traps.
- Prologues: `app/js/dryh-prologues.js` is generated from the GM's per-character
  `.md` files (`---` = new page, `==text==` = red protagonist dialogue). It is
  its own screen in the template (`isPrologue`, a sibling of Character Select),
  launched from GM > SCREEN > PROLOGUES; shared state `screen:'prologue'` +
  `prologue:{id,page,full,n}`. `plSync` (run from `componentDidUpdate`) fills
  the `[data-dryh-prologue]` host. Only the GM's click fills/advances.
- Mad City notes: `localStorage['dryh_madcity_map_v1']` is only a working copy.
  The room doc's `cityJson` and every backup snapshot carry the real thing.
  A New Game (`?new=1`) resets it to `js/madcity-seed.js` (18 locations
  generated from the GM's `Mad City Locations.zip`; the old copy goes to
  `dryh_madcity_map_v1_backup`). `js/madcity-io.js` (`window.MadCityIO`) is
  the shared EXPORT .MD / IMPORT .MD code used by the map and GM ▸ MAD CITY:
  front matter (id, x, y) + readable Markdown + a `<!-- dryh-data -->` block,
  so a round trip is lossless. Files without the block fall back to the
  Markdown parser. To rebuild the seed from a new zip, parse it with
  `MadCityIO.parseMd` and resolve `## Routes` by name.
- Dice: the Conflict Tray rolls in its own local state. The screen that
  throws owns the roll (`_own`) and is the only one that handles reroll /
  GM / stack requests. Every other tray replays the shared
  `pendingConflict.result` through `adopt()` (prop `shown`).
- `actingCharId` (which protagonist you're looking at) is per screen.
