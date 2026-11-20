// Don't Rest Your Head — multiplayer transport + room chrome.
//
// An ADDITION layered on top of the Claude Design export. It changes none of
// the original markup or styling: it moves the dashboard's shared state
// between browsers over Firestore (same project as Tokyo Brain Pop), and adds
// a small room pill (code, GM tools: UNSTICK, BACKUPS).
//
// Room docs live in `rooms/dryh-<code>` and cloud backups in `tbpBackups`
// (id `dryh-<code>-<at>`, field game:'dryh'), because those two collections
// are the ones the project's Firestore rules already allow.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot, runTransaction, serverTimestamp,
  collection, getDocs, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyBtSl-JLAEJZ5dpr5jym6-F11O7arj0Sso",
  authDomain: "princefaline.firebaseapp.com",
  projectId: "princefaline",
  storageBucket: "princefaline.firebasestorage.app",
  messagingSenderId: "432852695636",
  appId: "1:432852695636:web:d9965920d0fa0c7af78bc1"
}, "dryh");
const auth = getAuth(app);
const db = getFirestore(app);
const authReady = new Promise((res) => {
  const un = onAuthStateChanged(auth, (u) => { if (u) { un(); res(u); } });
  signInAnonymously(auth).catch((e) => console.error("[dryh] anon sign-in failed", e));
});

let sid = sessionStorage.getItem("dryh-session");
if (!sid) { sid = "s-" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("dryh-session", sid); }

const ref = (code) => doc(db, "rooms", "dryh-" + code);
const eref = (code) => doc(db, "rooms", "dryh-" + code + "-events");
// Bump when a release changes behaviour: the GM's health check flags screens on an older build.
const BUILD = "2026-11-20a";
const B_KEY = "dryh-backups";

const Net = {
  session: sid, room: null, role: null, offline: false,
  _chain: Promise.resolve(),
  async create() {
    await authReady;
    for (let i = 0; i < 25; i++) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const ok = await runTransaction(db, async (tx) => {
        const s = await tx.get(ref(code));
        if (s.exists()) return false;
        tx.set(ref(code), { game: "dryh", name: code, createdAt: serverTimestamp(), sharedJson: null, cityJson: null });
        return true;
      });
      if (ok) return code;
    }
    throw new Error("no free room code");
  },
  async exists(code) { await authReady; return (await getDoc(ref(code))).exists(); },
  // Pushes are chained so two writes from this tab never land out of order.
  push(fields) {
    if (!this.room) return;
    const room = this.room;
    this._inFlight = (this._inFlight || 0) + 1; this._lastPush = Date.now();
    this._chain = this._chain.then(() => setDoc(ref(room), Object.assign({ by: sid, at: Date.now() }, fields), { merge: true }))
      .catch((e) => console.error("[dryh] push failed", e))
      .finally(() => { this._inFlight--; this._lastPush = Date.now(); });
    return this._chain;
  },
  // The listener can die (error) or go quiet (stalled connection) without the
  // page knowing, which used to need a refresh. So: resubscribe on error, and a
  // watchdog reads the doc from the server every 10s (and on focus / back
  // online); if it's newer than what we last got, apply it and resubscribe.
  subscribe(cb) {
    const room = this.room; let un = null, lastAt = 0, dead = false;
    const take = (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) { if (!snap.metadata.fromCache) cb(null); return; }
      const d = snap.data(); if (!snap.metadata.fromCache) { lastAt = Math.max(lastAt, d.at || 0); this.roomAt = lastAt; }
      cb(d, snap.metadata.fromCache);
    };
    const listen = () => {
      if (dead) return; if (un) un();
      un = onSnapshot(ref(room), { includeMetadataChanges: true }, take, (e) => {
        console.error("[dryh] room watch failed, retrying", e); un = null; setTimeout(listen, 2000);
      });
    };
    const check = async () => {
      // Never while this screen is saving or just saved: the server copy could
      // predate our own change and briefly revert it.
      const busy = () => this._inFlight > 0 || Date.now() - (this._lastPush || 0) < 5000;
      if (dead || document.visibilityState === "hidden" || busy()) return;
      try {
        const s = await getDocFromServer(ref(room));
        if (busy()) return;
        if (s.exists() && (s.data().at || 0) > lastAt) { console.warn("[dryh] room watch was stale, resyncing"); take(s); listen(); }
      } catch (e) {}
    };
    listen();
    const iv = setInterval(check, 10000);
    const wake = () => { check(); };
    document.addEventListener("visibilitychange", wake); window.addEventListener("online", wake); window.addEventListener("focus", wake);
    return () => { dead = true; clearInterval(iv); if (un) un(); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); window.removeEventListener("focus", wake); };
  },
  roomAt: 0, build: BUILD,
  async roomDoc(code) { await authReady; const s = await getDoc(ref(code)); return s.exists() ? s.data() : null; },
  async setPin(code, hash) { await authReady; await updateDoc(ref(code), { gmPin: hash }); },
  // The rooms back office: every DRYH room (the `-online` / `-events` helper docs are skipped).
  listRooms(cb) {
    return onSnapshot(query(collection(db, "rooms"), where("game", "==", "dryh")), (qs) => {
      const rows = [];
      qs.forEach((d) => {
        if (!/^dryh-\d+$/.test(d.id)) return;
        const v = d.data() || {};
        rows.push({ code: d.id.slice(5), at: v.at || 0, createdAt: v.createdAt && v.createdAt.toMillis ? v.createdAt.toMillis() : 0, pin: v.gmPin || null });
      });
      rows.sort((a, b) => (b.at || b.createdAt) - (a.at || a.createdAt));
      cb(rows);
    }, (e) => console.error("[dryh] rooms list failed", e));
  },
  async deleteRoom(code) {
    await authReady;
    await deleteDoc(ref(code));
    for (const sfx of ["-online", "-events"]) { try { await deleteDoc(doc(db, "rooms", "dryh-" + code + sfx)); } catch (e) {} }
  },
  // ---- one-shot events: the room doc only carries ongoing state, so things that
  // must happen ONCE on other screens (a highlight, a health ping, a kick) go through
  // their own doc. `to` is "all", "players", "gm" or one session id.
  emit(type, data, to) {
    if (!this.room) return Promise.resolve();
    const room = this.room, now = Date.now(), id = "e" + now.toString(36) + Math.random().toString(36).slice(2, 5);
    const mine = this._evMine = this._evMine || new Map(), patch = { [id]: { t: type, d: data == null ? null : data, to: to || "all", by: sid, at: now } }, old = [];
    mine.set(id, now);
    mine.forEach((at, k) => { if (now - at > 120000) { patch[k] = deleteField(); old.push(k); } });
    return setDoc(eref(room), { game: "dryh", ev: patch }, { merge: true })
      .then(() => old.forEach((k) => mine.delete(k)))
      .catch((e) => console.error("[dryh] emit failed", e));
  },
  onEvent(handler) {
    const room = this.room, startedAt = Date.now(), seen = new Set();
    return onSnapshot(eref(room), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const evs = (snap.exists() && snap.data().ev) || {};
      Object.keys(evs).forEach((k) => {
        if (seen.has(k)) return; seen.add(k);
        const e = evs[k]; if (!e || e.by === sid) return;
        if ((e.at || 0) < startedAt - 5000) return;   // history from before we joined
        const mine = e.to === "all" || e.to === sid || (e.to === "players" && this.role !== "gm") || (e.to === "gm" && this.role === "gm");
        if (!mine) return;
        try { handler(e); } catch (err) { console.error("[dryh] event handler failed", err); }
      });
    }, (e) => console.error("[dryh] events watch failed", e));
  },
  // ---- backups: browser (last 40) + cloud (never overwritten) ----
  localBackups() { try { return JSON.parse(localStorage.getItem(B_KEY) || "[]"); } catch (e) { return []; } },
  async backup(entry) {
    try { const l = this.localBackups(); l.unshift(entry); localStorage.setItem(B_KEY, JSON.stringify(l.slice(0, 40))); } catch (e) {}
    try { await authReady; await setDoc(doc(db, "tbpBackups", "dryh-" + entry.room + "-" + entry.at), Object.assign({ game: "dryh" }, entry)); this.cloudErr = null; }
    catch (e) { this.cloudErr = e.code || e.message; console.error("[dryh] cloud backup failed", e); }
  },
  async cloudBackups() {
    await authReady;
    const qs = await getDocs(query(collection(db, "tbpBackups"), where("game", "==", "dryh"), limit(200)));
    return qs.docs.map((d) => d.data()).sort((a, b) => b.at - a.at).slice(0, 60);
  }
};
window.DRYHNet = Net;

// ---------------------------------------------------------------- the gate
const U = new URL(window.__dryhURL || location.href);
const P = U.searchParams;
const css = `
#dryh-gate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(5,5,6,.92);font-family:'Barlow',sans-serif}
#dryh-gate .bx{width:min(360px,calc(100vw - 32px));border:1px solid oklch(0.93 0.012 85 / 0.3);background:oklch(0.1 0.008 50);padding:26px 24px;color:oklch(0.95 0.012 85);box-shadow:0 20px 60px rgba(0,0,0,.7)}
#dryh-gate h2{margin:0 0 4px;font:600 13px 'Barlow',sans-serif;letter-spacing:.3em;color:oklch(0.68 0.19 30)}
#dryh-gate p{margin:0 0 16px;font:400 16px/1.4 'Crimson Text',serif;color:oklch(0.8 0.01 80)}
#dryh-gate input{width:100%;height:46px;background:transparent;border:1px solid oklch(0.93 0.012 85 / 0.4);color:oklch(0.97 0.01 85);font:400 26px 'Special Elite',monospace;letter-spacing:.4em;text-align:center}
#dryh-gate .row{display:flex;gap:8px;margin-top:12px}
#dryh-gate button,#dryh-pill button,#dryh-bk button{cursor:pointer;font:700 11px 'Barlow',sans-serif;letter-spacing:.18em;border:1px solid oklch(0.55 0.21 27);background:oklch(0.55 0.21 27);color:oklch(0.97 0.01 85);height:34px;padding:0 12px}
#dryh-gate button.ghost,#dryh-pill button.ghost,#dryh-bk button.ghost{background:transparent;border-color:oklch(0.93 0.012 85 / 0.35);color:oklch(0.85 0.01 80)}
#dryh-gate input[type=password]{font-size:22px}
#dryh-gate .err{min-height:18px;margin-top:10px;font:500 12px 'Barlow',sans-serif;color:oklch(0.68 0.19 30)}
#dryh-pill{position:fixed;left:8px;bottom:8px;z-index:9000;display:flex;align-items:center;pointer-events:none;font:600 11px 'Barlow',sans-serif;letter-spacing:.2em;color:oklch(0.8 0.01 80)}
#dryh-pill b{font:400 14px 'Special Elite',monospace;letter-spacing:.2em;color:oklch(0.97 0.01 85)}
#dryh-pill button{height:24px;padding:0 8px;font-size:10px}
#dryh-pill .dot{width:7px;height:7px;border-radius:50%;background:oklch(0.7 0.15 150)}
#dryh-pill .dot.off{background:oklch(0.55 0.21 27)}
#dryh-bk{position:fixed;left:10px;bottom:48px;z-index:9001;width:min(380px,calc(100vw - 20px));max-height:70vh;overflow:auto;background:oklch(0.1 0.008 50);border:1px solid oklch(0.93 0.012 85 / 0.3);padding:14px;font-family:'Barlow',sans-serif;color:oklch(0.9 0.01 80);box-shadow:0 14px 40px rgba(0,0,0,.7)}
#dryh-bk h3{margin:12px 0 6px;font:600 11px 'Barlow',sans-serif;letter-spacing:.24em;color:oklch(0.68 0.19 30)}
#dryh-bk .it{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid oklch(0.93 0.012 85 / 0.1);font:500 12px 'Barlow',sans-serif}
#dryh-bk .it button{height:24px;font-size:10px;padding:0 8px}
#dryh-bk .msg{font:500 12px 'Barlow',sans-serif;color:oklch(0.68 0.19 30);margin-top:6px}
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

function gate(asGm, msg) {
  return new Promise((resolve) => {
    const g = document.createElement("div"); g.id = "dryh-gate";
    g.innerHTML = `<div class="bx"><h2>${asGm ? "GAME MASTER" : "JOIN GAME"}</h2><p>${asGm ? "Enter the room code of your table." : "Enter the room code your GM gave you."}</p>
      <input inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000"><div class="row"><button class="go" style="flex:1">ENTER</button><button class="ghost back">TITLE</button></div><div class="err">${msg || ""}</div></div>`;
    document.body.appendChild(g);
    const inp = g.querySelector("input"), err = g.querySelector(".err");
    const go = async () => {
      const code = inp.value.replace(/\D/g, "");
      if (code.length !== 4) { err.textContent = "Room codes are four digits."; return; }
      err.textContent = "Checking…";
      try { if (!(await Net.exists(code))) { err.textContent = "No room " + code + "."; return; } }
      catch (e) { err.textContent = "Can't reach the server."; return; }
      g.remove(); resolve(code);
    };
    g.querySelector(".go").onclick = go;
    inp.onkeydown = (e) => { if (e.key === "Enter") go(); };
    g.querySelector(".back").onclick = () => { location.href = "Title Screen.dc.html"; };
    setTimeout(() => inp.focus(), 50);
  });
}

// ---------------------------------------------------------------- the GM PIN
// Replaces the bare `?gm=1`. The PIN is stored hashed in the room doc and this browser
// remembers it, so the GM isn't asked again. It stops casual guessing only; real lockdown
// would need Firestore rules.
const PIN_KEY = (code) => "dryh-gmpin-" + code;
async function hashPin(code, pin) {
  const t = "dryh:" + code + ":" + pin;
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { let h = 5381; for (const c of t) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "x" + (h >>> 0).toString(16); }
}
Net.hashPin = hashPin;
function pinGate(o) {
  return new Promise((resolve) => {
    const g = document.createElement("div"); g.id = "dryh-gate";
    g.innerHTML = `<div class="bx"><h2>GM PIN</h2><p>${o.text}</p>
      <input type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••"><div class="row"><button class="go" style="flex:1">${o.go || "ENTER"}</button>${o.alt ? `<button class="ghost alt">${o.alt}</button>` : ""}</div><div class="err">${o.msg || ""}</div></div>`;
    document.body.appendChild(g);
    const inp = g.querySelector("input"), err = g.querySelector(".err");
    const go = () => { const pin = inp.value.replace(/\D/g, ""); if (pin.length < 4) { err.textContent = "Use 4 to 8 digits."; return; } g.remove(); resolve(pin); };
    g.querySelector(".go").onclick = go;
    inp.onkeydown = (e) => { if (e.key === "Enter") go(); };
    const alt = g.querySelector(".alt"); if (alt) alt.onclick = () => { g.remove(); resolve(null); };
    setTimeout(() => inp.focus(), 50);
  });
}
async function savePin(code, pin) {
  const h = await hashPin(code, pin);
  try { localStorage.setItem(PIN_KEY(code), h); } catch (e) {}
  await Net.setPin(code, h).catch((e) => console.error("[dryh] could not save the PIN", e));
}
// Is this browser allowed to be the GM of `code`?
async function gmCheck(code) {
  let rd = null, failed = false, mine = null;
  try { rd = await Net.roomDoc(code); } catch (e) { failed = true; }
  try { mine = localStorage.getItem(PIN_KEY(code)); } catch (e) {}
  if (failed) return !!mine;   // can't read the room: only a browser that already holds the PIN
  const h = rd && rd.gmPin;
  if (!h) {   // a room made before PINs existed: offer one, never block
    const pin = await pinGate({ text: "This room has no GM PIN yet. Set one so only you can enter as the GM.", go: "SET PIN", alt: "SKIP" });
    if (pin) await savePin(code, pin);
    return true;
  }
  if (mine === h) return true;
  let msg = "";
  for (;;) {
    const pin = await pinGate({ text: "Enter the GM PIN for room " + code + ".", alt: "JOIN AS PLAYER", msg });
    if (pin === null) return false;
    if ((await hashPin(code, pin)) === h) { try { localStorage.setItem(PIN_KEY(code), h); } catch (e) {} return true; }
    msg = "Wrong PIN.";
  }
}

async function boot() {
  let code = P.get("room"), gm = P.get("gm") === "1";
  if (P.get("new")) {
    gm = true; code = await Net.create(); Net.fresh = true;
    const pin = await pinGate({ text: "Choose a PIN (4 to 8 digits). You'll need it to enter this room as the GM again.", go: "SET PIN" });
    await savePin(code, pin);
  }
  else if (!code) code = await gate(gm);
  else if (!(await Net.exists(code).catch(() => false))) code = await gate(gm, "Room " + code + " has closed.");
  if (!Net.fresh) {
    const wantGm = gm || !!sessionStorage.getItem("dryh-gm-" + code);
    gm = wantGm ? await gmCheck(code) : false;
  }
  if (gm) sessionStorage.setItem("dryh-gm-" + code, "1"); else sessionStorage.removeItem("dryh-gm-" + code);
  Net.room = code; Net.role = gm ? "gm" : "player";
  const u = new URL(location.href); u.search = "?room=" + code + (gm ? "&gm=1" : "");
  history.replaceState(null, "", u.toString());
  return Net;
}
// The rooms back office (Rooms.html) sets __dryhNoBoot: it needs the transport but no join gate.
// Until a room has been entered AND loaded, a solid cover hides the dashboard, so no stale saved game (or old
// room code) shows behind the join prompt. The dashboard lifts it once the room's state has arrived.
let coverOff = () => {};
if (!window.__dryhNoBoot) {
  const cv = document.createElement("div"); cv.id = "dryh-cover"; cv.style.cssText = "position:fixed;inset:0;z-index:9990;background:#050506";
  document.body.appendChild(cv); coverOff = () => cv.remove(); window.__dryhCoverOff = coverOff;
}
window.__dryhNet = (window.__dryhNoBoot ? Promise.resolve(Net) : boot()).catch((e) => { console.error("[dryh] offline", e); Net.offline = true; return Net; });
window.__dryhNet.then((n) => { if (!n || n.offline || !n.room) coverOff(); else setTimeout(coverOff, 8000); });   // the dashboard lifts it sooner, once synced

// ---------------------------------------------------------------- who's online
// A draggable, foldable window listing everyone in the room. Each screen writes
// {name, color, role, ts} into `rooms/dryh-<code>-online` (a map keyed by session)
// every 20s; anyone silent for 60s drops off. Name/color/position are per browser.
const ON_PAL = ["oklch(0.55 0.21 27)", "oklch(0.68 0.19 30)", "#f0555e", "oklch(0.95 0.012 85)", "#eef2f4", "oklch(0.66 0.01 70)",
  "#7ba0f5", "#3b6fe0", "#63d06d", "#2f9a3a", "#ffd65c", "oklch(0.8 0.1 195)"];
const ON_KEY = "dryh-online-ui";
const onCss = `
#dryh-on{position:fixed;z-index:9002;width:220px;background:oklch(0.1 0.008 50);border:1px solid oklch(0.93 0.012 85 / 0.3);box-shadow:0 14px 40px rgba(0,0,0,.7);font-family:'Barlow',sans-serif;color:oklch(0.9 0.01 80);user-select:none}
#dryh-on .hd{display:flex;align-items:center;gap:8px;padding:7px 8px 7px 10px;cursor:grab;border-bottom:1px solid oklch(0.93 0.012 85 / 0.15)}
#dryh-on.min .hd{border-bottom:none}
#dryh-on .sw{width:14px;height:14px;border-radius:50%;flex-shrink:0;cursor:pointer;border:1px solid rgba(0,0,0,.5)}
#dryh-on .me{flex:1;min-width:0;font:700 16px 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text}
#dryh-on input{flex:1;min-width:0;height:24px;padding:0 6px;background:oklch(0.07 0.008 50);border:1px solid oklch(0.93 0.012 85 / 0.4);color:oklch(0.97 0.01 85);font:700 15px 'Barlow Condensed',sans-serif;text-transform:uppercase}
#dryh-on .n{font:600 10px 'Barlow',sans-serif;letter-spacing:.16em;color:oklch(0.6 0.01 70)}
#dryh-on .fold{background:transparent;border:none;color:oklch(0.7 0.01 80);font-size:16px;line-height:1;cursor:pointer;padding:0 2px}
#dryh-on .pal{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:8px 10px;border-bottom:1px solid oklch(0.93 0.012 85 / 0.15)}
#dryh-on .pal span{aspect-ratio:1;border-radius:50%;cursor:pointer;border:1px solid rgba(0,0,0,.5)}
#dryh-on .pal span.on{outline:2px solid oklch(0.97 0.01 85);outline-offset:1px}
#dryh-on .ls{padding:6px 10px 8px;display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}
#dryh-on .ls div{display:flex;align-items:center;gap:8px;font:700 15px 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.04em}
#dryh-on .ls i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
#dryh-on .ls div{flex-wrap:wrap}
#dryh-on .rt{margin-left:auto;display:flex;align-items:center;gap:8px}
#dryh-on .ls em{font:600 9px 'Barlow',sans-serif;font-style:normal;letter-spacing:.2em;color:oklch(0.6 0.01 70)}
#dryh-on .hs{width:8px;height:8px;border-radius:2px;background:oklch(0.35 0.01 60)}
#dryh-on .hs.green{background:oklch(0.7 0.15 150)}#dryh-on .hs.amber{background:oklch(0.8 0.15 80)}#dryh-on .hs.red{background:oklch(0.6 0.22 27)}
#dryh-on .why{display:none;flex-basis:100%;padding-left:16px;font:500 11px 'Barlow',sans-serif;letter-spacing:.03em;text-transform:none;color:oklch(0.72 0.01 80)}
#dryh-on .ls div:hover .why{display:block}
#dryh-km{position:fixed;z-index:9003;background:oklch(0.1 0.008 50);border:1px solid oklch(0.93 0.012 85 / 0.3);box-shadow:0 14px 40px rgba(0,0,0,.7);padding:8px;display:flex;gap:6px;font-family:'Barlow',sans-serif}
#dryh-km button{cursor:pointer;font:700 11px 'Barlow',sans-serif;letter-spacing:.18em;height:28px;padding:0 10px;border:1px solid oklch(0.55 0.21 27);background:oklch(0.55 0.21 27);color:oklch(0.97 0.01 85)}
#dryh-km button.ghost{background:transparent;border-color:oklch(0.93 0.012 85 / 0.35);color:oklch(0.85 0.01 80)}
#dryh-kicked{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(5,5,6,.94);font-family:'Barlow',sans-serif;color:oklch(0.95 0.012 85);text-align:center}
#dryh-on.min .pal,#dryh-on.min .ls{display:none}
`;
function onUi() { try { return JSON.parse(localStorage.getItem(ON_KEY) || "{}"); } catch (e) { return {}; } }
function onSave(p) { try { localStorage.setItem(ON_KEY, JSON.stringify(Object.assign(onUi(), p))); } catch (e) {} }
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function online(net) {
  if (!net || !net.room || net.offline) return;
  await authReady;
  const oref = doc(db, "rooms", "dryh-" + net.room + "-online");
  const ui = onUi(), gm = net.role === "gm";
  let me = { name: (ui.name || (gm ? "GM" : "Player")).slice(0, 20), color: ON_PAL.includes(ui.color) ? ui.color : ON_PAL[gm ? 0 : 3] };
  let people = {}, palOpen = false, editing = false, health = null, lastPing = null, kicked = false;
  const s2 = document.createElement("style"); s2.textContent = onCss; document.head.appendChild(s2);
  const w = document.createElement("div"); w.id = "dryh-on"; if (ui.min) w.classList.add("min");
  const place = (x, y) => { x = Math.max(0, Math.min(window.innerWidth - 220, x)); y = Math.max(0, Math.min(window.innerHeight - 36, y)); w.style.left = x + "px"; w.style.top = y + "px"; return { x, y }; };
  document.body.appendChild(w);
  place(ui.x ?? window.innerWidth - 236, ui.y ?? 70);

  const beat = () => {
    if (kicked) return;
    const ent = { name: me.name, color: me.color, role: net.role, ts: Date.now() }; if (health) ent.h = health;
    return setDoc(oref, { game: "dryh", people: { [sid]: ent } }, { merge: true }).catch((e) => console.error("[dryh] online beat failed", e));
  };
  // Health check: the GM pings, each screen answers by writing what it knows into its own
  // presence entry. Invisible to players.
  const answer = async (pid, t) => {
    let raf = false;
    await Promise.race([new Promise((r) => requestAnimationFrame(() => { raf = true; r(); })), new Promise((r) => setTimeout(r, 1500))]);
    health = { pid, t, rcvd: Date.now(), docAt: net.roomAt || 0, build: BUILD, vis: document.visibilityState === "visible", raf };
    beat();
  };
  const check = (p) => {
    if (!lastPing) return { c: "", why: "not checked yet" };
    const h = p.h;
    if (!h || h.pid !== lastPing.id) return Date.now() - lastPing.t < 8000 ? { c: "", why: "checking…" } : { c: "red", why: "no reply to the last check" };
    if (h.build !== BUILD) return { c: "amber", why: "older version of the page: ask them to refresh" };
    if ((net.roomAt || 0) && (h.docAt || 0) < net.roomAt - 20000) return { c: "amber", why: "not up to date with the room" };
    if (!h.vis) return { c: "amber", why: "tab is in the background" };
    if (!h.raf) return { c: "amber", why: "page is frozen" };
    return { c: "green", why: "up to date · " + Math.max(0, h.rcvd - lastPing.t) + " ms" };
  };
  const showKicked = () => {
    kicked = true; sessionStorage.removeItem("dryh-gm-" + net.room);
    const k = document.createElement("div"); k.id = "dryh-kicked";
    k.innerHTML = `<div><h2 style="margin:0 0 8px;font:600 13px 'Barlow',sans-serif;letter-spacing:.3em;color:oklch(0.68 0.19 30)">REMOVED BY THE GM</h2><p style="margin:0 0 16px;font:400 16px 'Crimson Text',serif;color:oklch(0.8 0.01 80)">You can rejoin with the room code.</p><button style="cursor:pointer;font:700 11px 'Barlow',sans-serif;letter-spacing:.18em;height:34px;padding:0 16px;border:1px solid oklch(0.55 0.21 27);background:oklch(0.55 0.21 27);color:oklch(0.97 0.01 85)">OK</button></div>`;
    document.body.appendChild(k);
    k.querySelector("button").onclick = () => location.replace(location.pathname);
  };
  net.onEvent((e) => {
    if (e.t === "ping" && e.d) answer(e.d.id, e.d.t);
    else if (e.t === "kick") showKicked();
  });
  if (gm) {
    const ping = () => { lastPing = { id: "p" + Date.now().toString(36), t: Date.now() }; net.emit("ping", lastPing, "players"); setTimeout(render, 8500); };
    setTimeout(ping, 4000); setInterval(ping, 30000);
  }
  const kickMenu = (sidK, name, x, y) => {
    document.getElementById("dryh-km")?.remove();
    const m = document.createElement("div"); m.id = "dryh-km";
    m.innerHTML = `<button class="k">KICK ${esc(name)}</button><button class="ghost c">CANCEL</button>`;
    document.body.appendChild(m);
    m.style.left = Math.max(4, Math.min(window.innerWidth - m.offsetWidth - 4, x)) + "px"; m.style.top = Math.max(4, Math.min(window.innerHeight - 44, y)) + "px";
    const close = () => { m.remove(); document.removeEventListener("pointerdown", away, true); };
    const away = (ev) => { if (!m.contains(ev.target)) close(); };
    setTimeout(() => document.addEventListener("pointerdown", away, true), 0);
    m.querySelector(".c").onclick = close;
    m.querySelector(".k").onclick = () => { net.emit("kick", {}, sidK); updateDoc(oref, { ["people." + sidK]: deleteField() }).catch(() => {}); close(); };
  };
  const live = () => { const now = Date.now();
    const L = Object.entries(people).filter(([k, p]) => p && k !== sid && now - (p.ts || 0) < 60000).map(([k, p]) => Object.assign({ sid: k }, p));
    L.push({ name: me.name, color: me.color, role: net.role });
    return L.sort((x, y) => ((y.role === "gm") - (x.role === "gm")) || String(x.name).localeCompare(String(y.name))); };

  const render = () => {
    if (editing) return;
    const L = live();
    w.innerHTML = `<div class="hd"><span class="sw" style="background:${me.color}"></span><span class="me" style="color:${me.color}">${esc(me.name)}</span><span class="n">${L.length}</span><button class="fold">${w.classList.contains("min") ? "▢" : "–"}</button></div>`
      + (palOpen ? `<div class="pal">${ON_PAL.map((c) => `<span data-c="${c}" class="${c === me.color ? "on" : ""}" style="background:${c}"></span>`).join("")}</div>` : "")
      + `<div class="ls">${L.map((p) => { const hc = gm && p.sid && p.role !== "gm" ? check(p) : null;
        return `<div data-sid="${p.sid || ""}" data-nm="${esc(p.name)}" style="color:${p.color}"><i style="background:${p.color}"></i>${esc(p.name)}<span class="rt">${p.role === "gm" ? "<em>GM</em>" : ""}${hc ? `<span class="hs ${hc.c}"></span>` : ""}</span>${hc ? `<small class="why">${esc(hc.why)}</small>` : ""}</div>`; }).join("")}</div>`;
    w.querySelector(".sw").onclick = (e) => { e.stopPropagation(); palOpen = !palOpen; if (palOpen) { w.classList.remove("min"); onSave({ min: false }); } render(); };
    w.querySelector(".fold").onclick = (e) => { e.stopPropagation(); w.classList.toggle("min"); onSave({ min: w.classList.contains("min") }); render(); };
    w.querySelectorAll(".pal span").forEach((el) => { el.onclick = () => { me.color = el.dataset.c; onSave({ color: me.color }); palOpen = false; render(); beat(); }; });
    w.querySelector(".me").onclick = (e) => {
      e.stopPropagation(); editing = true;
      const inp = document.createElement("input"); inp.maxLength = 20; inp.value = me.name; e.target.replaceWith(inp); inp.focus(); inp.select();
      const done = (ok) => { if (!editing) return; editing = false; const v = inp.value.trim(); if (ok && v) { me.name = v.slice(0, 20); onSave({ name: me.name }); beat(); } render(); };
      inp.onkeydown = (k) => { k.stopPropagation(); if (k.key === "Enter") done(true); if (k.key === "Escape") done(false); };
      inp.onblur = () => done(true); inp.onpointerdown = (k) => k.stopPropagation();
    };
  };

  // drag by the header
  w.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".hd") || e.target.closest(".sw,.fold,.me,input")) return;
    const r = w.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top, hd = w.querySelector(".hd");
    hd.style.cursor = "grabbing"; w.setPointerCapture(e.pointerId);
    const mv = (m) => place(m.clientX - ox, m.clientY - oy);
    const up = (u) => { w.removeEventListener("pointermove", mv); w.removeEventListener("pointerup", up); hd.style.cursor = ""; onSave(place(u.clientX - ox, u.clientY - oy)); };
    w.addEventListener("pointermove", mv); w.addEventListener("pointerup", up);
  });
  window.addEventListener("resize", () => { const r = w.getBoundingClientRect(); place(r.left, r.top); });

  onSnapshot(oref, (snap) => { people = (snap.exists() && snap.data().people) || {}; render(); }, (e) => console.error("[dryh] online watch failed", e));
  if (gm) w.addEventListener("contextmenu", (e) => { const row = e.target.closest(".ls div[data-sid]"); if (!row || !row.dataset.sid) return; e.preventDefault(); kickMenu(row.dataset.sid, row.dataset.nm, e.clientX, e.clientY); });
  render(); beat();
  setInterval(beat, 20000);
  setInterval(render, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beat(); });
  window.addEventListener("pagehide", () => { updateDoc(oref, { ["people." + sid]: deleteField() }).catch(() => {}); });
}
window.__dryhNet.then(online);
