# Board kit — pre-made features

The menu of features for new dashboards. When starting a board, pick from this
list; everything marked **Core** comes with every board.

Extracted (read-only) from **Tokyo Brain Pop** (TBP) and **Don't Rest Your
Head** (DRYH) on 2026-11-20. Those two boards stay as they are: they are the
reference implementations, not to be retrofitted unless the user asks.

Status legend: **Proven** = running in a live board · **Partly generic** =
works, but tied to one game's names/styles · **Planned** = agreed, not built.

---

## How to start a new board

1. Say which board (e.g. Bunnies & Burrows, Chronicles of Darkness).
2. Go through the **Optional** list below and pick features (yes / no / later).
3. Claude builds the board on the shared base with those modules, using the
   user's design as-is (design export first, features layered on top).
4. Add the board to `content/dashboards.json` and to `build.js`.

---

## Core (every board gets these)

| # | Feature | What it does | Source today | Status |
|---|---|---|---|---|
| C1 | **Board base** | The user's Claude Design export used untouched; the logic class is renamed `<Game>Base` and a `Component` subclass adds everything below. Built to `dist/games/<slug>/` by `build.js`, served by the Cloudflare Worker. | Both boards | Proven |
| C2 | **Rooms (Firestore transport)** | 4-digit room code made in a transaction, anonymous sign-in, chained pushes (no out-of-order writes), self-healing subscription (resubscribe on error + 10s watchdog + on focus/online). | `DRYH app/js/dryh-net.js` (newer and sturdier than `tbp-net.js`) | Partly generic |
| C3 | **Join gate + room pill** | Code entry screen, GM vs player (`?gm=1`, `?new=1`), per-tab session ids, URL rewritten to `?room=…`, small pill showing room code and GM tools. | `dryh-net.js` gate; TBP `tbp-gate.js` adds spectators and a seat picker | Partly generic |
| C4 | **State sync layer** | The game's own state is the source of truth. Shared by default; `MP_LOCAL` keys stay per screen (tabs, hovers, drafts, layout); per-character keys listed explicitly. Debounced push, `mpSynced` gate (push nothing until the room has loaded), 2.5s hold against stale snapshots, union of shared maps, forward-only phases, sync outcomes + deadlines (never "spinning"). | TBP `Component` (`mpShared`, `mpPush`, `mpApplyRemote`, `mpTouch`) and DRYH `Component` (`mpKeys`, `mpDiff`, `mpApply`) | Proven, needs one shared version |
| C5 | **GM manual overrides** | Everything the app changes by itself can be set by hand from the GM side (+/−, click-to-cycle, editable field). | Pattern, per board (see TBP CLAUDE.md §0 table) | Proven (rule, not code) |
| C6 | **Unstick (clean refresh)** | One GM button (two taps) that puts every in-flight process back to rest for everyone, without touching durable data. Stamps `unstickAt` so each screen also clears its local animations. | TBP `unstickTable` + `mpUnstickLocal`; DRYH `unstick` | Proven |
| C7 | **Backups** | Snapshots never overwritten: browser (last 40) + cloud (`tbpBackups`, tagged by game) + file export/import. Two-tap restore, works into a fresh room. | TBP `mpBackup*`/`mpRestore`; DRYH `snapshot`/`restore` + `Net.backup` | Proven |
| C8 | **Role-aware UI** | Players don't see GM panels/controls; controls on someone else's card are disabled unless whitelisted. | TBP `mpNeuter`, `mpInjectRoleCss`; DRYH `renderVals` (`if (!gm)`) | Proven |
| C9 | **Safe local testing** | Offline harness (no `?room=`, stubbed net) so production Firestore is never touched from a preview; syntax check after edits. | TBP CLAUDE.md §7 | Proven |
| C10 | **Who's online** | Draggable, foldable window listing everyone in the room, with editable name and color; heartbeat every 20s, gone after 60s. | Bottom of `dryh-net.js` | Proven, nearly generic |
| C11 | **Seat / character claiming** | Players pick a character; claims sync without collisions; GM can free a seat. | TBP gate seat picker, `claimSeat`, `pickingBy`; DRYH pregens + `picks` | Proven |
| C12 | **Kick player / room list** | GM back office: list rooms, open, delete, kick one player. | TBP `rooms.html`, `tbp-rooms.js`, `Net.kickPlayer` | Proven |
| C13 | **Demo room + viewpoint switcher** | GM can sit every seat in turn to test or demo. | TBP `mpRenderDemoBar`, `mpSetViewpoint` | Proven |
| C14 | **Table editor** | One GM panel to rename players, set who's playing, edit per-player picks. | TBP `mpShowTable` | Proven |

(C10–C14 moved to Core by the user on 2026-11-20.)

---

## Optional (pick per board)

### Table & players (from the DRYH backlog agreed 2026-11-10; built in DRYH on 2026-11-20, to be lifted into the shared kit)

| # | Feature | What it does | Source today | Status |
|---|---|---|---|---|
| P1 | **Invite link** | Clicking the room code copies the player join link (never the GM one), formatted to paste nicely into Discord. | `dryh-net.js` + DRYH Dashboard (2026-11-20) | Built in DRYH; wire behaviour untested |
| P2 | **Health check** | Invisible to players: every ~30s each screen reports whether it's received updates, is up to date, on the same build, tab visible, and its lag. Green/amber/red dot per name in Who's Online. | `dryh-net.js` + DRYH Dashboard (2026-11-20) | Built in DRYH; wire behaviour untested |
| P3 | **GM PIN** | Replaces the bare `?gm=1`: PIN set at room creation, stored hashed, remembered by the GM's browser. Stops casual guessing. | `dryh-net.js` + DRYH Dashboard (2026-11-20) | Built in DRYH; wire behaviour untested |
| P4 | **Highlight (pointer)** | GM right-clicks something → a halo appears on that spot for one player or everyone, and their screen opens the same tab/panel so they can see it. Fades on hover or after 30s. | `dryh-net.js` + DRYH Dashboard (2026-11-20) | Built in DRYH; wire behaviour untested |
| P5 | **"Fire once" event channel** | Shared plumbing for one-off events on every screen (highlight, health ping, kick), since rooms only sync ongoing state today. Needed by P2 and P4. | `dryh-net.js` + DRYH Dashboard (2026-11-20) | Built in DRYH; wire behaviour untested |

### GM control

| # | Feature | What it does | Source today | Status |
|---|---|---|---|---|
| O6 | **GM panel with tabs** | A GM drawer with tabs (e.g. Screen, Game, Characters, Map, Shop…), can go full screen. | DRYH `gmTabs`, `gmOpen`, `gmFull` | Proven |
| O7 | **Screen control** | GM decides which screen everyone is looking at (title, character select, main board, a reader page). | DRYH shared `screen` | Proven |
| O8 | **Paged reader (prologues / handouts)** | Multi-page text from the GM's `.md` files (`---` = new page, highlight syntax), only the GM advances, everyone sees it. | DRYH `dryh-prologues.js` + `plSync` | Proven |
| O9 | **Session timer + in-game clock** | Real-time session timer (synced start/elapsed) and an adjustable story clock. | DRYH `timerRunning/timerStart/timerElapsed`, `clockHour/Minute` | Proven |
| O10 | **Event log / record** | Timestamped log of what happened, visible to players (so keep GM secrets out). | DRYH `logEntry`, `withLog` | Proven |
| O11 | **Votes** | Table votes with forward-only phases (assign → count → tiebreak → done), ready flags, GM can call one. | TBP Class Vote (`vote`, `applyVote`) | Proven, game-flavored |
| O12 | **Soundboard** | GM-only, identical on every board: music + ambient + effects layers, fades/crossfade/loop/hard stop/switch/queue, library managed from the site, scenes per board. Plays through a custom Discord bot on Hetzner. | None yet (replaces Kenku FM) | Planned |

### Characters & dice

| # | Feature | What it does | Source today | Status |
|---|---|---|---|---|
| O13 | **Character sheets with trackers** | Per-character stats, gauges and tracks with +/−, editable bio fields, GM can edit any sheet. | DRYH `changeStat`, `updateChar`, sheets; TBP cards + Journal | Proven, game-flavored |
| O14 | **Shared dice roll** | The screen that rolls owns the roll; everyone else replays the same result and animation. Never sync the animation itself. | DRYH Conflict Tray (`_own`, `adopt`); TBP reels (`rolled` + `rollEnds`) | Proven |
| O15 | **Inventory / items** | Give, use, pop items on a character. | DRYH `giveItem`, `useItem`, `popItem` | Proven |
| O16 | **Shop** | Shelf the GM shuffles and shows; players buy with a resource; pinned items. | DRYH Bazaar (`dryh-bazaar.js`, `bz*`) | Proven, game-flavored |
| O17 | **Achievements grid** | Per-player achievements with +/− on every cell. | TBP Achievements tab | Proven |

### World & content

| # | Feature | What it does | Source today | Status |
|---|---|---|---|---|
| O18 | **Map with locations** | Location nodes with notes and routes, "you are here", GM edit. Import/export as readable Markdown with a lossless data block. | DRYH Mad City Map, `madcity-io.js`, `madcity-seed.js` | Proven |
| O19 | **Rulebook screen** | In-app rules reader, reachable from the title screen and in game. Keep a single copy (TBP has two that drift). | DRYH `Rulebook.dc.html`; TBP `tbp-rules.js` | Proven |
| O20 | **Title screen** | Entry page with New game (GM), Join, Rules. | DRYH `Title Screen.dc.html`; TBP `index.html` | Proven |
| O21 | **Content from the GM's files** | The user's `.xlsx` / `.md` / `.zip` turned into generated JS data files (stock lists, NPCs, locations, prologues). | DRYH `dryh-bazaar.js`, `dryh-nightmares.js`, `dryh-pregens.js`, `madcity-seed.js`; TBP `BOND_TABLE` | Proven (process) |

---

## Game-specific (not modules)

Stays inside its own board: TBP acts/marks, bonds, PSI, Demon, Good/Bad End;
DRYH Madness/Discipline/Exhaustion pools, Despair/Hope coins, scars, Personal
Nightmares, Laws.

---

## What the kit still needs (before the first new board)

- **One shared copy of each module.** Today TBP and DRYH each have their own
  transport (`tbp-net.js` vs `dryh-net.js`, already diverged), their own sync
  layer, and three copies of the 69 KB `support.js` (dc-runtime). The Firebase
  config is pasted in both. New boards should load shared files from one place
  (proposed: `Games/_kit/js/`, copied into each board by `build.js`).
- **Theming hooks.** Kit UI (gate, pill, backups panel, online window, GM
  drawer, soundboard) takes colors and fonts from CSS variables, so it matches
  each board's design without code changes.
- **Per-game Firestore naming.** Rooms as `rooms/<game>-<code>`, backups in
  `tbpBackups` with `game:'<game>'` (the collections the rules already allow).


---

## Built in DRYH 2026-11-20 (game-specific, not kit modules yet)

- **Fate** (per-character token, a player sets one die of their own roll; locks the GM's Despair on that roll). Needs the conflict/tray flow, so it stays DRYH-specific.
- **Rooms back office** (`app/Rooms.html`): list, open as GM, delete rooms. A good candidate for Core (C12) once the transport is shared.
