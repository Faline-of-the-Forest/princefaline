// Tokyo Brain Pop — multiplayer transport.
//
// This file is an ADDITION layered on top of the original Table Screen project.
// It touches none of the original markup, styling or game logic: it only moves
// the game's own React state between browsers over Firestore.
//
// Loaded as a module before dc-runtime boots. It resolves window.__TBPNetResolve
// so the (non-module) component code evaluated later by dc-runtime can await it.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot,
  collection, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtSl-JLAEJZ5dpr5jym6-F11O7arj0Sso",
  authDomain: "princefaline.firebaseapp.com",
  projectId: "princefaline",
  storageBucket: "princefaline.firebasestorage.app",
  messagingSenderId: "432852695636",
  appId: "1:432852695636:web:d9965920d0fa0c7af78bc1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authReady = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(u); } });
  signInAnonymously(auth).catch((e) => console.error("[tbp] anon sign-in failed", e));
});

// One session id per TAB (sessionStorage, not localStorage) so one browser can
// hold a whole table's worth of seats open at once for testing.
function sessionId() {
  let id = sessionStorage.getItem("tbp-session");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem("tbp-session", id);
  }
  return id;
}
const normalize = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const Net = {
  session: sessionId(),
  roomId: null,
  role: null,   // 'gm' | 'player' | 'spectator'
  seat: null,   // 0..3 for players
  _unsub: null,
  _lastSent: null,

  normalize,

  // Creates a room under a fresh, unique 4-digit code instead of a
  // player-chosen name, and joins it as the Headmaster. The transaction
  // retries against a fresh random code whenever one's already taken, so two
  // people opening a room at the same instant can never collide.
  async createRoom(displayName) {
    await authReady;
    for (let attempt = 0; attempt < 25; attempt++) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const ref = doc(db, "rooms", code);
      const created = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        tx.set(ref, { name: code, createdAt: serverTimestamp(), sharedJson: null, players: {} });
        return true;
      });
      if (created) {
        this.roomId = code; this.role = "gm"; this.seat = null;
        await updateDoc(ref, {
          ["players." + this.session]: { role: "gm", seat: null, name: displayName || null, at: Date.now() }
        });
        return code;
      }
    }
    throw new Error("Couldn't generate a free room code — try again.");
  },

  async join(roomName, role, seat, displayName) {
    await authReady;
    const id = normalize(roomName);
    if (!id) throw new Error("Room name can't be empty.");
    this.roomId = id; this.role = role; this.seat = (seat == null ? null : +seat);
    const ref = doc(db, "rooms", id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) tx.set(ref, { name: roomName.trim(), createdAt: serverTimestamp(), sharedJson: null, players: {} });
    });
    await updateDoc(ref, {
      ["players." + this.session]: {
        role, seat: this.seat, name: displayName || null, at: Date.now()
      }
    });
    return id;
  },

  // Fires cb(sharedStateOrNull, playersMap) on every remote change.
  subscribe(cb) {
    if (!this.roomId) throw new Error("join() first");
    if (this._unsub) this._unsub();
    this._unsub = onSnapshot(doc(db, "rooms", this.roomId), (snap) => {
      if (!snap.exists()) { cb(null, {}); return; }
      const d = snap.data();
      // Ignore the echo of our own write — it would stomp newer local edits.
      if (d.updatedBy === this.session) { cb(undefined, d.players || {}); return; }
      let shared = null;
      if (typeof d.sharedJson === "string") {
        try { shared = JSON.parse(d.sharedJson); } catch (e) { console.error("[tbp] bad state blob", e); }
      }
      cb(shared, d.players || {});
    }, (e) => console.error("[tbp] snapshot error", e));
    return this._unsub;
  },

  // The game state is stored as one JSON string rather than a Firestore map:
  // it contains nested arrays (goalsDone is an array of arrays), which
  // Firestore refuses outright, and this also sidesteps undefined/function
  // pruning entirely.
  async push(shared) {
    if (!this.roomId) return;
    const json = JSON.stringify(shared);
    if (json === this._lastSent) return;   // nothing actually changed
    this._lastSent = json;
    await updateDoc(doc(db, "rooms", this.roomId), {
      sharedJson: json, updatedBy: this.session, updatedAt: Date.now()
    });
  },

  // Bind this session to a Student mid-session (used when you claim a girl on
  // the original Character Select rather than through the join screen).
  async claimSeat(seat) {
    this.seat = (seat == null ? null : +seat);
    if (!this.roomId) return;
    await updateDoc(doc(db, "rooms", this.roomId), {
      ["players." + this.session + ".seat"]: this.seat
    });
  },

  // Has play actually begun? A room that still has Character Select open is
  // "not started" — you join it straight into that screen.
  isStarted(data) {
    if (!data || typeof data.sharedJson !== "string") return false;
    try { return JSON.parse(data.sharedJson).setupOpen === false; } catch (e) { return false; }
  },

  // Room management for the Headmaster's room list.
  listRooms(cb) {
    return onSnapshot(collection(db, "rooms"), (qs) => {
      const rows = [];
      qs.forEach((d) => {
        const v = d.data() || {};
        rows.push({ id: d.id, name: v.name || d.id, players: Object.keys(v.players || {}).length, started: !!v.sharedJson });
      });
      rows.sort((a, b) => a.id.localeCompare(b.id));
      cb(rows);
    }, (e) => console.error("[tbp] rooms error", e));
  },
  async deleteRoom(id) { await authReady; await deleteDoc(doc(db, "rooms", id)); },

  // The Headmaster removing one player from a live room, without deleting the
  // whole thing. Freeing whatever Student she'd claimed is the caller's job
  // (it lives in the shared game state, not in the players map).
  async kickPlayer(sessionId) {
    if (!this.roomId) return;
    await updateDoc(doc(db, "rooms", this.roomId), {
      ["players." + sessionId]: deleteField()
    });
  },
  async peek(id) { await authReady; const s = await getDoc(doc(db, "rooms", normalize(id))); return s.exists() ? s.data() : null; }
};

window.TBPNet = Net;
if (window.__TBPNetResolve) window.__TBPNetResolve(Net);
