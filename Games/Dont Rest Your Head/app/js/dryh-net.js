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
  getFirestore, doc, getDoc, setDoc, onSnapshot, runTransaction, serverTimestamp,
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
    this._chain = this._chain.then(() => setDoc(ref(room), Object.assign({ by: sid, at: Date.now() }, fields), { merge: true }))
      .catch((e) => console.error("[dryh] push failed", e));
    return this._chain;
  },
  subscribe(cb) {
    return onSnapshot(ref(this.room), { includeMetadataChanges: true }, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) { if (!snap.metadata.fromCache) cb(null); return; }
      cb(snap.data(), snap.metadata.fromCache);
    });
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

async function boot() {
  let code = P.get("room"), gm = P.get("gm") === "1";
  if (P.get("new")) { gm = true; code = await Net.create(); Net.fresh = true; }
  else if (!code) code = await gate(gm);
  else if (!(await Net.exists(code).catch(() => false))) code = await gate(gm, "Room " + code + " has closed.");
  if (gm) sessionStorage.setItem("dryh-gm-" + code, "1");
  if (sessionStorage.getItem("dryh-gm-" + code)) gm = true;
  Net.room = code; Net.role = gm ? "gm" : "player";
  const u = new URL(location.href); u.search = "?room=" + code + (gm ? "&gm=1" : "");
  history.replaceState(null, "", u.toString());
  return Net;
}
window.__dryhNet = boot().catch((e) => { console.error("[dryh] offline", e); Net.offline = true; return Net; });
