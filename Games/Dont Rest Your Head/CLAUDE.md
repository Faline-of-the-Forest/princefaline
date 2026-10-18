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
