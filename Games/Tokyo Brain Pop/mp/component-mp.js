
/* ============================================================================
   Tokyo Brain Pop — multiplayer layer.

   Everything above this comment is the ORIGINAL Table Screen project, byte for
   byte, except that its `class Component extends DCLogic` declaration was
   renamed to `class TBPBase extends DCLogic` so it can be extended here.

   Nothing below changes a single pixel of the design. It overrides exactly
   three methods:
     · renderVals()  — hides Headmaster-only affordances from Students, and
                       makes another Student's card inert for you.
     · setState()    — after any local change, mirror the shared slice of the
                       game state to Firestore.
     · plus a lazy start hook that pulls remote state in.

   The game's own state object stays the single source of truth; we just move
   it between browsers.
   ========================================================================= */

// Keys that are purely this-browser UI and must never travel: overlays you have
// open, what you're hovering, which seat *you* are, animation scratch space.
var MP_LOCAL = {
  ui: 1, gmOpen: 1, gmDraft: 1, focusSeat: 1, picking: 1, pickStep: 1,
  speeds: 1, spinning: 1, justCleared: 1, player: 1, debugVisible: 1, chars: 1
};
// The durable, shared per-Student fields.
//
// `face`, `phase`, `psiUsed` and `breakResult` are the OUTCOME of a roll, a PSI
// use or a Break — table-wide facts, not decoration, so they have to travel:
// without them a Student's die lands only on her own screen. What stays local
// is the animation driving them (reelY, reelSpeed, landing) and pure hover
// state (detail, psiHover, psiExit, iconHover).
var MP_CHAR = [
  'drama', 'psiCost', 'pop', 'broken', 'psychic', 'votedOnce', 'quirk',
  'face', 'phase', 'psiUsed', 'breakResult'
];

function mpNeuter(v, depth) {
  if (typeof v === 'function') return function () {};
  if (!v || typeof v !== 'object' || (depth || 0) > 3) return v;
  if (Array.isArray(v)) return v.map(function (x) { return mpNeuter(x, (depth || 0) + 1); });
  var out = {};
  for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = mpNeuter(v[k], (depth || 0) + 1);
  return out;
}

class Component extends TBPBase {

  // ---- shared-state plumbing ------------------------------------------------

  mpShared() {
    var s = this.state, out = {};
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      if (MP_LOCAL[k]) continue;
      out[k] = s[k];
    }
    out.chars = (s.chars || []).map(function (c) {
      var o = {};
      MP_CHAR.forEach(function (f) { if (c[f] !== undefined) o[f] = c[f]; });
      return o;
    });
    if (out.demonRoll) {
      var d = Object.assign({}, out.demonRoll);
      delete d.reelY; delete d.reelSpeed;   // animation scratch, not game truth
      out.demonRoll = d;
    }
    // Firestore rejects undefined and functions; the round-trip drops both.
    return JSON.parse(JSON.stringify(out));
  }

  // True only while a die is physically spinning ON THIS MACHINE.
  //
  // Deliberately keyed on reelSpeed rather than phase: reelSpeed is driven by a
  // local requestAnimationFrame loop and is never synced, so it can only be
  // non-zero here. Using `phase` would deadlock — we now mirror a remote
  // player's phase:'rolling', and if their tab died mid-roll every future
  // update would be deferred forever waiting for a spin that isn't ours.
  mpBusy() {
    var cs = this.state.chars || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].reelSpeed > 0) return true;
    var dr = this.state.demonRoll;
    return !!(dr && dr.reelSpeed > 0);
  }

  mpApplyRemote(shared) {
    this.mpPending = shared;
    this.mpFlush();
  }

  mpFlush() {
    if (!this.mpPending) return;
    // Never yank the screen out from under a die that is mid-spin locally.
    if (this.mpBusy()) { clearTimeout(this.mpFlushT); this.mpFlushT = setTimeout(this.mpFlush.bind(this), 250); return; }
    var shared = this.mpPending; this.mpPending = null;
    var patch = {};
    for (var k in shared) {
      if (!Object.prototype.hasOwnProperty.call(shared, k)) continue;
      if (k === 'chars') continue;
      patch[k] = shared[k];
    }
    if (shared.chars) {
      var cur = this.state.chars || [];
      patch.chars = cur.map(function (c, i) {
        var rc = shared.chars[i] || {}, merged = Object.assign({}, c);
        MP_CHAR.forEach(function (f) { if (f in rc) merged[f] = rc[f]; });
        return merged;
      });
    }
    // super.setState so our own push hook doesn't echo this straight back out.
    super.setState(patch);
  }

  mpPush() {
    if (!window.TBPNet || !window.TBPNet.roomId) return;
    if (window.TBPNet.role === 'spectator') return;
    try { window.TBPNet.push(this.mpShared()); } catch (e) { console.error('[tbp] push failed', e); }
  }

  setState(update, cb) {
    super.setState(update, cb);
    if (this.mpApplying) return;
    if (!window.TBPNet || !window.TBPNet.roomId) return;
    clearTimeout(this.mpPushT);
    this.mpPushT = setTimeout(this.mpPush.bind(this), 120);
  }

  // Hides Headmaster-only affordances that the original markup always renders.
  // Done with an appended stylesheet keyed off the title attributes already in
  // the template, so not one byte of the original markup changes.
  mpInjectRoleCss(role) {
    var css = '';
    if (role !== 'gm') {
      css += '[title^="Start a new game"],[title^="Scene Control"]{display:none !important}';
    }
    if (role === 'spectator') {
      css += '#dc-root{pointer-events:none}';
    }
    if (!css) return;
    var el = document.createElement('style');
    el.id = 'tbp-role-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  async mpStart() {
    var joined = await window.__TBPJoined;      // resolved by the room gate
    var Net = window.TBPNet;
    window.__tbp = this;                        // debug handle for the console
    this.mpInjectRoleCss(joined.role);
    if (joined.role === 'player' && joined.seat != null) {
      super.setState({ player: joined.seat });  // your card is the one that's "you"
    }
    var first = true;
    Net.subscribe(function (shared) {
      if (shared === undefined) return;          // the echo of our own write
      if (shared) {
        this.mpApplyRemote(shared);
      } else if (first && joined.role === 'gm') {
        this.mpPush();                           // seed a brand-new room
      }
      first = false;
    }.bind(this));
  }

  // ---- role gating ----------------------------------------------------------

  renderVals() {
    if (!this.mpStarted) { this.mpStarted = true; this.mpStart(); }

    var out = super.renderVals();
    var f = out && out.f;
    var Net = window.TBPNet;
    if (!f || !Net || !Net.role) return out;

    if (Net.role !== 'gm') {
      // Scene Control, the New Game/setup flow and the end-screen triggers are
      // the Headmaster's alone. Hidden, not restyled — the markup is untouched.
      f.gm = Object.assign({}, f.gm, { show: false, open: function () {}, dotBg: 'transparent' });
      f.newGame = { open: function () {} };
      f.setup = Object.assign({}, f.setup, { open: false });
      if (f.gearToggle) f.gearToggle = mpNeuter(f.gearToggle);
    }

    if (Array.isArray(f.cards)) {
      if (Net.role === 'spectator') {
        f.cards = f.cards.map(function (c) { return mpNeuter(c); });
      } else if (Net.role === 'player' && Net.seat != null) {
        var mine = Net.seat;
        f.cards = f.cards.map(function (c, i) { return i === mine ? c : mpNeuter(c); });
      }
    }
    if (Net.role === 'spectator') {
      if (f.voteBar) f.voteBar = mpNeuter(f.voteBar);
      if (f.rollPicker) f.rollPicker = mpNeuter(f.rollPicker);
    }
    return out;
  }
}
