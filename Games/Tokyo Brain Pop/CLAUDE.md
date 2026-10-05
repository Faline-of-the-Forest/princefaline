# Tokyo Brain Pop!? — working notes

These notes cover everything learned the hard way building the multiplayer table
for Tokyo Brain Pop (Aug–Oct 2026). Read all of it before touching the game. The
traps below each cost a playtest.

---

## 0. The three non-negotiables (the user's standing requirements for ANY dashboard)

These apply to every live-play tool built for this user, not just Tokyo Brain
Pop. Design them in from the start. Never leave them for later.

1. **Manual override for everything automatic.** Any score, tally, counter or
   state the app changes by itself (a roll result, a Drama tick, a track mark,
   an achievement, a turn order, an attribution) must also be adjustable by hand
   from the GM side: a +/− ticker, a click-to-cycle or an editable field, like
   the Achievements tab. If the app can get it wrong, the GM must be able to
   put it right without a reset.
2. **No soft-locks: a clean refresh.** There must always be a one-click way to
   put every *in-flight* process (rolls, pop-ups, animations, votes, half-done
   picks) back to rest for everyone, **without touching durable data**. A
   stuck animation must never block the app, and reloading the page must
   always be safe.
3. **Memory that survives a browser wipe.** Months of sessions must never
   depend on one browser's storage or one live document. Keep a history of
   snapshots that are never overwritten, in **more than one place**, including
   one off the user's machine. Restoring one must take a click, and must work
   into a fresh room too.

**How Tokyo Brain Pop meets them (keep this inventory current):**

| Need | Where |
|---|---|
| Drama | Click / right-click a Drama gauge (GM: any card). Right-click also un-Breaks |
| Good / Bad End | Click any square on the track; the middle one cycles |
| Popularity | Click the Popularity label on a card (`cyclePop`) |
| Goals cleared, Scenes led, Lead, Focus, place | Scene Control (Scene tab), applied with APPLY |
| Running order | Scene Control → RUNNING ORDER ◀ ▶ |
| Class Vote used | Scene Control → CLASS VOTE — SPENT toggles |
| PSI cost | Scene Control → PSI COST — OVERRIDE |
| Demon present or absent; name and goal | Scene Control → DEMON chips; RENAME |
| Achievements | Scene Control → Achievements tab, +/− on every cell |
| Clean refresh | **UNSTICK** on the Headmaster's roster (two taps). `unstickTable()` resets `rollMode`, `challenge`, `demonRoll`, `vote` (the caller's vote is given back), `endKind`, roll deadlines, picks and every card's roll/PSI phase. It stamps `unstickAt`, so every screen also clears its own local animation loops (`mpUnstickLocal`). Durable state is untouched |
| Stuck setup | Today's Demon → SKIP TO ROOM. A CANCEL appears on an orphaned Demon Challenge |
| Frozen local animation | `mpBusy()` stops holding remote updates after 5s, so a frozen reel can't cut a screen off |
| Safe reload | `mpSynced` gate: a reloading or joining browser pushes nothing until it holds the room's state |
| Snapshots | **BACKUPS ⟲** on the roster. BROWSER: every client, `localStorage['tbp-backups']`, the last 40. CLOUD: the Headmaster's browser writes to the Firestore collection **`tbpBackups`** (one doc per snapshot, never overwritten, on a milestone or every 2 minutes). END saves a final cloud copy before deleting the room. FILE / LOAD FILE handles copies off-line. RESTORE takes two taps |

> **Firestore rules:** cloud backups need the project's rules to allow
> read/write on `tbpBackups/{id}` for signed-in (anonymous) users, like
> `rooms`. The rules aren't in this repo. If they block it, the BACKUPS panel
> shows **"Cloud backup FAILED: permission-denied"** in red. Fix it in the
> Firebase console. Don't remove the feature.

When you add a feature, add its override and its unstick path in the same
change, and add a row to this table.

---

## 1. Where the code actually lives

| Path | What it is | Edit it? |
|---|---|---|
| `app/play.html` | **The game.** About 9,000 lines: dc-runtime template markup, then one `<script>` holding `class TBPBase extends DCLogic` (the original game) and `class Component extends TBPBase` (the multiplayer layer). | **Yes. This is the source of truth.** |
| `app/js/tbp-net.js` | Firestore transport (rooms, join, push, subscribe, claimSeat). | Yes |
| `app/js/tbp-gate.js` | Join gate: Headmaster / Student / spectator, and the seat picker for a game already underway. | Yes |
| `app/js/tbp-rules.js` | Rulebook used by the **title screen**. | Yes, in step with `play.html` (see §6) |
| `app/js/tbp-home.js`, `tbp-rooms.js` | Title-screen menu and the Headmaster's back office (`rooms.html`, code `4287`). | Yes |
| `app/index.html`, `app/rooms.html` | Title screen and back office pages. | Yes |
| `mp/*.js` | **Stale.** The original multiplayer layer, frozen since 2026-09-02. | **No** |
| `unpack.js` | Rebuilds `app/` from the 18MB standalone artifact plus `mp/`. | **Never run it** (see below) |
| `Tokyo Brain Pop - Table Screen (standalone).html` | The original Claude Design export: one 18MB self-unpacking file. | No, it is the archive |
| `title screen/` | Original title-screen design source. | No |
| `Tokyo Brain Pop - Bond Assignments.xlsx` | The user's Friend/Rival table for every line-up. It feeds `BOND_TABLE`. | Only if asked |

> **⚠ `node unpack.js` destroys a month of work.** Since 2026-09-02 every fix has
> been made directly in `app/play.html` and `app/js/`. `unpack.js` regenerates
> `app/` from the artifact and the stale `mp/` folder, so running it reverts
> everything. Never run it. If the artifact ever has to be re-imported, diff
> against the current `app/` and port changes by hand.

**Deploy:** `build.js` (repo root) copies `app/` into `dist/games/tokyo-brain-pop/`.
`dist/` is gitignored, and a Cloudflare Worker (`wrangler.jsonc`, `worker.js`)
serves it. The user plays on the live site after a push. When they say "I'm not
seeing the changes", it is usually deploy lag or browser cache, not a failed
push. Cache-bust assets that must change, such as favicons (`?v=2`).

---

## 2. Hard rules

1. **Never rebuild the design. Layer features on top of it.** The user spent weeks
   on the visual design. An early attempt to recreate it "close enough" was
   called garbage and thrown out. The whole multiplayer layer is built to change
   zero pixels of the original: the class was renamed and subclassed, nothing
   was rewritten. New UI must match the existing style (Baloo 2 / Lora,
   `#231F20` ink, `#EDE31B` yellow, `#E23A3A` red, 4–5px ink borders, hard
   drop shadows).
2. **Make the smallest change that fixes the thing.** One "improvement" to stage
   flex scaling unanchored the Student cards and broke the location card right
   before a session. It had to be reverted. Don't refactor layout you weren't
   asked to touch.
3. **Look at the result before saying it's fixed.** The user repeatedly had to
   ask "don't you see it?" about text sizes and a background seam. Screenshot it
   (§7) at both a large and a small window size.
4. **Keep both rulebook copies in sync** (§6).
5. **Commit and push are routine here.** The user asks for them constantly and
   expects them done without hesitation. Commit only when asked, and end the
   message with the attribution line the session gives you.
6. **Never open `play.html?room=…` from a local preview.** `tbp-net.js` talks to
   the **production** Firestore project `princefaline`, so a local tab would
   create, join or overwrite a real room. Use the offline harness in §7.

---

## 3. The multiplayer model, and its sync traps

**How it works:** the game's own React-style state is the single source of
truth. `Component.setState()` debounces 120ms and then `mpPush()`es
`mpShared()`: the **whole** shared state, minus the `MP_LOCAL` keys, as one JSON
string in the room doc (`sharedJson`). Firestore refuses nested arrays such as
`goalsDone`, which is why it travels as a string. Every other client gets it
through `onSnapshot`, then `mpApplyRemote()`, then `mpFlush()`, which merges it
with `super.setState` so it doesn't push again. Per-Student fields travel only
if they are listed in `MP_CHAR`.

Nearly every multiplayer bug so far comes from **"every push is the sender's
whole state"**:

| Symptom seen in play | Cause | Fix now in place |
|---|---|---|
| A joiner or a refresh threw a live game back to Today's Demon with empty reels | On mount, `fit()` calls `setState`, which pushed the blank starting table before the room's state had loaded | `mpSynced` gate: **push nothing until the first real snapshot has been applied** (or the Headmaster seeded a new room). The first sync clears `_mpMine`, so the room wins outright |
| Half-typed Demon names vanished, Drama ticks flickered back, names were lost | A push already in flight is stale for what you just did | `mpTouch` / `mpRecent`: a field this client changed in the last `MP_HOLD_MS` (2.5s) is protected from older snapshots |
| Seat claims or player names disappeared | Maps that every client adds its own key to were replaced wholesale | `pickingBy` and `playerNames` are unioned while recent |
| Class Vote resolved, then rolled back and froze | A stale `vote` overwrote a finished one | `vote.phase` only ever moves forward (`assign → count → tiebreak → done`). A stale push gets re-pushed over |
| Players started a vote already Ready'd | The own-seat Ready merge re-asserted a flag left over from the last vote | Only merged while genuinely recent |
| Reels spun forever on every screen | A synced `spinning` boolean could be set back to true by any stale push | Rolls travel as **result + deadline** (`rolled`, `rollEnds`); each client counts down on its own clock |
| One person's window size resized everyone's table | `fit()` scales were pushed | Those keys are in `MP_LOCAL` |
| Other players never saw a die land | `face`, `phase`, `psiUsed`, `breakResult` weren't in `MP_CHAR` | Added. Animation scratch (`reelY`, `reelSpeed`, `landing`) stays local |
| Writes landed out of order | Independent Firestore writes race | `mpPushChain` serializes pushes |
| A room got no callback at all | `onSnapshot` stays silent when only metadata changes | `includeMetadataChanges: true`. An empty **cached** snapshot is never trusted as "new room" |
| Results written across several setStates got partly undone | Each setState is a separate window to be overwritten | Write related results in **one** atomic setState (see `applyVote`) |

**Rules for new multiplayer code:**
- When you add new state, decide straight away: shared (default), `MP_LOCAL`
  (UI, hover, layout, "which seat am I"), or per-Student (`MP_CHAR`).
- Never sync a *process* (spinning, animating). Sync its *outcome* and a deadline.
- Per-seat controls on another Student's card are **neutered** in
  `Component.renderVals()` via `mpNeuter`. If a control on *someone else's* card
  belongs to *you*, whitelist it explicitly. Existing exceptions: vote +/-, the
  Challenge target `boxClick`, and the caller's Friend/Rival `roleOptions` on the
  challenged girl's card. Forgetting this gives "the buttons show but do nothing".
- In a 3-player game `f.cards` is indexed by **position**, not seat. Map back
  through `activeSeats` before comparing to `Net.seat`.
- `this.state.chars[k]` is not the place for choices made on Character Select:
  `advancePicker` / `confirmGoals` write to the module-level `SEATS` / `BIOS`.
  `quirkPicks` / `goalPicks` sync and are replayed on arrival (`mpReplayPicks`).
- Session ids live in `sessionStorage` (per tab), so one browser can sit a whole
  table in separate tabs.

**Backups:** see §0. If a wipe happens, point the user to **BACKUPS ⟲** first.
Prefer two-tap confirmation (like KICK) over `window.confirm()`, which browsers
can silently block.

---

## 4. dc-runtime / template gotchas

- The markup uses `sc-if`, `sc-for`, `sc-camel-on-click="{{ fn }}"`, and `{{ }}`
  inside `style` attributes. Values come from `renderVals()` → `{f: {...}}`.
- If the logic class fails to evaluate, the page still renders, but **with no
  logic**: blank panels and an error badge (`[dc-runtime] logic class eval
  FAILED`). After every edit, syntax-check the script (§7). An unescaped `'`
  inside a JS string (`'Demon's name'`) did exactly this once.
- **Handlers are not re-bound on every render.** Wrapping a template handler's
  closure doesn't reliably take effect. Catch the *state transition* in
  `setState` instead (the picker-cancel claim release does this).
- Don't put identity entries for local assets in `__resources`. The template's
  img-fixer re-sets `src` to the same value, which re-fires its
  MutationObserver forever and hangs the page.
- **Stacking:** the setup overlay (Character Select / Today's Demon) is
  `position:fixed; z-index:80`, but it sits *inside* the card-row container
  (`z-index:6`). Its effective layer is therefore below the header
  (`data-tbp="hdr"`, z 9) and the NEW GAME/SCENE tabs (z 30). That's why the
  header is hidden with `visibility:{{ f.chromeVis }}` while setup is open.
  Check the ancestor chain before trusting a z-index.
- Popups rising out of a card all share one space above it: PSI slabs (z 9, or
  17 for PSI on the Demon), the "!" (11), CANCEL (13), the CHALLENGER tag (15)
  and the role choice (16). When a new state shows several at once, decide
  which one gives way.

---

## 5. Layout and scaling lessons

- Every screen is a **fixed-size canvas scaled as one unit** with
  `transform:scale()` and plain `px` fonts. Never use `vw` / `clamp()` font
  sizes inside a scaled canvas: they shrink twice. Character Select is a
  1600×760 reference (980 over-shrank ordinary 700–800px windows).
- A scaled element's wrapper must be sized to the **scaled** pixel dimensions,
  or it renders tiny inside an oversized empty box.
- Full-bleed backgrounds (dots, red glow, ribbons) belong on the **outer,
  unscaled** wrapper. Paint them on the scaled card and they stop with a hard
  edge, letterboxed. This happened twice: dots first, then the red glow.
- A CSS grid with hidden cells must still emit placeholders, or every later
  column slides left (the achievements table).
- Firestore map key order is unstable. Sort any list built from `players`, or
  it reshuffles on every keystroke.
- Japanese UI text is marked `notranslate`, so browser translation leaves it alone.

---

## 6. Game rules and where they live

The rulebook exists in **two copies that must stay identical**: `const RULES` in
`app/play.html` (in-game) and `export const RULES` in `app/js/tbp-rules.js`
(title screen). They have drifted before. Apply every rules edit to both, then
diff them:

```bash
diff <(sed -n '/^export const RULES/,/^];/p' app/js/tbp-rules.js | sed 1d) <(sed -n '/^const RULES/,/^];/p' app/play.html | sed 1d)
```

Current design, as of 2026-10-04. The user changes rules after every playtest,
so the code wins over this summary:

- **Seats:** 0 HIROMI (`momo`), 1 KOTORI (`midori`), 2 UME (`ao`), 3 YUMI
  (`murasaki`). There are 3 or 4 players, and 3 Scenes per girl (9 or 12 Scenes).
- **Bonds:** mutual Friend / Rival, **fixed per line-up** in `BOND_TABLE`, keyed
  by the sorted active seats and taken from the user's spreadsheet. A pair can
  be both ("Frenemies"). The caller then picks which one she is Calling as.
- **Challenges:** only the Scene's Lead can be Challenged, and only by a
  Friend/Rival of hers. The narrator is named on screen (`narratorFor`): the only
  Friend/Rival, or with two, the one who isn't a Frenemy.
- **Hail Mary:** a Demon-led Scene allows only Demon Challenges, and any Student
  may Call it (`challengeableBy` returns `[]` when `demonLead()`).
- **Demon:** it appears at most once per Scene (`demonOut`, keyed by
  `sceneSig`). Calling it is free. Its die is **4+, −1 per unresolved Goal of the
  Challenger, +1 if it is the Scene's Focus**, clamped to 2–6. The Good/Bad End
  tracks **do not** affect it any more. PSI on the Demon requires all of the
  Challenger's Goals to be done.
- **Use PSI:** automatic success **plus** a serious consequence caused by the PSI.
  On-screen prompts must say both.
- **Goals:** must always stay possible. The Headmaster reinterprets them when the
  story blocks them.
- **Hand-off spreadsheets** the user fills in (bond assignments, goal and quirk
  lists) come as `.xlsx`. Read them with the xlsx skill and turn them into
  constants.

---

## 7. Testing without touching production

The fastest, safest check is offline, in the built-in browser:

1. `preview_start {name: "static-preview"}` (`.claude/launch.json`, port 8123),
   then navigate to `http://localhost:8123/Games/Tokyo%20Brain%20Pop/app/play.html`.
   **No `?room=`.**
2. Inject this to get a live instance with no network:

```js
await new Promise(r => setTimeout(r, 1500));
document.getElementById('tbp-gate')?.remove();          // gate fails without a room
window.TBPNet = window.TBPNet || {}; window.TBPNet.role = 'gm';
window.__TBPJoinedResolve({role: 'gm', seat: null});
await new Promise(r => setTimeout(r, 500));
const t = window.__tbp;                                  // the Component instance
t.setState({locks: [false, true, true, true], mpReady: true});  // reach any screen by setting state
```

3. Drive it with `t.setState`, `t.patch(seat, {...})` and its methods
   (`t.skipToRoom()`, `t.psiDemon(0)`, …). Read `t.renderVals().f` to check what
   the template gets. Screenshot to check visually.
4. Push-dependent code: set `TBPNet.roomId = '9999'`, `t.mpSynced = true` and
   stub `TBPNet.push = async () => {}`.

Syntax-check after every edit (dc-runtime fails silently otherwise):

```bash
python -c "import re;s=open('app/play.html',encoding='utf-8').read();open('/tmp/p.mjs','w',encoding='utf-8').write(max(re.findall(r'<script[^>]*>(.*?)</script>',s,re.S),key=len))" && node --check /tmp/p.mjs
```

What offline testing **can't** prove: real two-client sync. Say so when
reporting, and ask the user to watch for it at the next playtest. The Demo Room
(Headmaster back office, then Demo Room, with a viewpoint switcher) is the
in-game way to sit every seat in turn.

**Editing tips:** `play.html` is huge and lines are very long. Use Grep with
narrow patterns and `cut -c1-200`. For multi-line edits, a Python script written
to the scratchpad (with `assert s.count(old) == 1`) is safer than inline shell
heredocs, which choke on mixed quotes.

---

## 8. Working with this user

- They playtest with real people and come back with batches of bugs and rule
  changes. Triage each item and be precise about what was **verified** versus
  only reasoned about.
- When they report "it's stuck", the first goal is to get the **live session**
  going again without a reset (Skip to Room, CANCEL on orphaned states,
  BACKUPS). Fix the root cause second.
- Swearing or frustration usually means a visual fix was claimed without being
  looked at, or something that worked was broken. Slow down and screenshot.
- Terms: Headmaster (GM), Student, Scene, Lead, Focus, Drama, PSI, Break,
  Class Vote, Good End / Bad End, Today's Demon.
