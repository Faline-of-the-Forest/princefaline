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
  `Net.subscribe` self-heals: resubscribes on listener error, and a 10s watchdog
  (`getDocFromServer`, also on focus/online) resyncs if the doc's `at` is newer.
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
- Personal Nightmares: data in `app/js/dryh-nightmares.js` (matched by
  `shortName`), state on each character as `nightmare` (shared, defaults filled
  by `nmState`). Panel in GM ▸ PROTAGONISTS (`nmView`). Encounter 4 auto-escalates
  (Difficulty locked at 10, bound to the current location); Defeated / Lucy
  found set `closure`. Only escalation, defeat and Lucy are logged, since the
  Record is visible to players. Rulebook ▸ NIGHTMARES stays vague on purpose: no clue timing, no escalation details.
- Bizarre Bazaar: stock in `app/js/dryh-bazaar.js` (from the GM's xlsx; the King's
  Summons is `pinned`, always on the shelf until bought). Shared state `bazaar`
  {shelf, bought, buyers, shown, n}; GM ▸ BAZAAR shuffles/displays/toggles. Buying
  costs Discipline; spending down to 0 Crashes them. CLOSE is per screen (`bzHideN`).
- Who's online: bottom of `app/js/dryh-net.js`. Draggable/foldable window; each
  screen heartbeats {name,color,role,ts} into `rooms/dryh-<code>-online` (map
  `people` keyed by session) every 20s, 60s silence = offline. Name, color (12-swatch
  palette), position and fold state live in `localStorage['dryh-online-ui']`.
