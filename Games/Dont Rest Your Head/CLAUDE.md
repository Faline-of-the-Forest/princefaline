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

## Added 2026-11-20 (invite, GM PIN, kick, health, highlight, Fate, rooms back office)

- **One-shot events:** `Net.emit(type, data, to)` / `Net.onEvent(handler)` in `dryh-net.js`, carried by their own doc `rooms/dryh-<code>-events` (`to` is `all`, `players`, `gm` or a session id; history from before a screen joined is ignored). Use it for anything that must happen once on other screens. Never for ongoing state.
- **GM PIN:** set when a room is created (`?new=1`), stored as a SHA-256 hash in the room doc (`gmPin`) and in the GM's browser (`localStorage['dryh-gmpin-<code>']`). `?gm=1` (or a remembered GM tab) asks for it; a room made before PINs offers to set one (skippable). Stops casual guessing only; real lockdown needs Firestore rules.
- **Invite:** click the room code. Copies the PLAYER link (never `gm=1`) as rich text plus a Markdown link (`inviteCopy`).
- **Kick:** GM right-clicks a name in Who's Online, then KICK. Sends a `kick` event and deletes the presence entry; the kicked screen shows "removed by the GM" and returns to the gate (they can rejoin with the code).
- **Health check:** the GM pings every 30s; each screen answers by writing `h` (received, room-doc `at` it holds, `BUILD`, tab visible, rAF fired) into its presence entry. GM-only dot per name in Who's Online (hover for the reason). **Bump `BUILD` in `dryh-net.js` whenever a release changes behaviour**, or the check can't flag stale pages.
- **Highlight:** GM right-click, then THIS PLAYER or ALL PLAYERS (`hlMenu`, `hlSend`, `hlRecv`, `hlShow`). Anchored to the element under the cursor (path, then text, then screen fraction). Copies only the GM's navigation keys (`hlNav`), never drafts. Off inside `[data-dryh-gmui]`; Shift + right-click keeps the browser menu. Fades on pointer-near or after 30s.
- **Fate:** `characters[].fate`, awarded in GM ▸ PROTAGONISTS (house rule: at the end of the game the players vote an MVP, who gets a point; unspent Fate stays with the protagonist for as long as the room is reopened and played; RESET and RESET CHARACTER both leave `fate` alone). A player (not the GM) sees "Spend Fate" in the Hope row only while they hold Fate; it is usable on their own conflict's finished roll. It writes `pendingConflict.fateReq {n,k,j,v}` (pool, position in pool, face), which the owning tray applies (`fateSet`) and re-resolves, and sets `pendingConflict.fated`, which blocks the GM's Add/Remove a King for the rest of that roll. Any new field the tray must see has to be added to `pendingView` (`fateReq:pc.fateReq`), not just the template.
- **Rooms back office:** `app/Rooms.html` (sets `window.__dryhNoBoot` so the transport loads without the join gate). Lists every DRYH room, OPEN AS GM, two-tap DELETE (also removes the `-online` and `-events` docs). Unlocks with the GM PIN of any room; rooms made before PINs never lock it. Not linked from the title screen.
- **Verified offline (2026-11-20):** Fate end to end through the real tray, highlight menu/halo/fallbacks, invite clipboard formats, GM Fate stepper, rooms list (read-only). **Not verified (needs real rooms and two clients):** PIN gate flow, health dots, kick, and events over the wire. Watch for these at the next playtest.
- **Reopening a played room:** the room doc is online, so entering its code as GM (title screen "Game Master", or `Rooms.html` ▸ OPEN AS GM) from any browser restores the whole game. New Game (`?new=1`) is a NEW CAMPAIGN: the seeding block in `componentDidMount` (`net.fresh`) resets every shared stat to `defaultState()` (keys the defaults don't define start unset, as on a clean browser), opens Character Select, clears any conflict and the session timer, and resets Mad City to the New Game notes. It never uses this browser's saved copy, so Fate, Hope, scars and the Record from an old campaign can't leak in. Verified offline 2026-11-20 with a dirty browser copy.
