// Tokyo Brain Pop — Firebase sync adapter
//
// This is the ONLY file that talks to Firebase directly. Everything else in the
// app (join screen, character select, GM scene control, player screens) goes
// through the functions exported here. That keeps the rest of the codebase
// testable/portable and means wiring up real credentials is a one-time,
// one-file change.
//
// ---------------------------------------------------------------------------
// TODO: paste Firebase config here (Project settings → General → Your apps → SDK setup)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBtSl-JLAEJZ5dpr5jym6-F11O7arj0Sso",
  authDomain: "princefaline.firebaseapp.com",
  projectId: "princefaline",
  storageBucket: "princefaline.firebasestorage.app",
  messagingSenderId: "432852695636",
  appId: "1:432852695636:web:d9965920d0fa0c7af78bc1"
};
// ---------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  collection, query, orderBy, runTransaction, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let app = null, auth = null, db = null, authReadyPromise = null;
let roomId = null, roomUnsub = null, roomsListUnsub = null;

const isConfigured = () =>
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO" && !String(firebaseConfig.apiKey).includes("TODO");

function ensureInit() {
  if (app) return;
  if (!isConfigured()) {
    throw new Error(
      "Firebase is not configured yet. Paste your Firebase project config into " +
      "firebase-sync.js (top of the file) and enable Anonymous Auth + Firestore " +
      "in the Firebase console before going live."
    );
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  authReadyPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
    signInAnonymously(auth).catch((err) => {
      console.error("Anonymous sign-in failed", err);
    });
  });
}

async function ready() {
  ensureInit();
  await authReadyPromise;
}

// ---------------------------------------------------------------------------
// Session identity — one persistent random id per browser TAB.
//
// Deliberately sessionStorage, not localStorage: sessionStorage is isolated
// per tab (survives reloads of that tab, but a new tab never inherits it),
// so opening five tabs in the same browser gives five independent seats —
// exactly what letting multiple sessions per device/character requires, and
// it's also what makes local playtesting from one browser possible without
// incognito windows or separate profiles. A tab that's duplicated (Ctrl+Shift+T
// re-opening a closed tab, or a browser's "duplicate tab") DOES inherit the
// original's sessionStorage — expected, since that's genuinely the same seat
// continuing, not a new one.
// ---------------------------------------------------------------------------
export function getSessionId() {
  let id = sessionStorage.getItem("tbp-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem("tbp-session-id", id);
  }
  return id;
}

export function normalizeRoomName(raw) {
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// Default shape for a brand-new room's Firestore document.
// ---------------------------------------------------------------------------
export function defaultRoomState(displayName) {
  return {
    name: displayName,
    createdAt: null, // set with serverTimestamp() on creation
    status: "lobby", // lobby | demon-select | playing | ended
    requiredPlayers: 4, // 3 or 4, GM's call before starting
    players: {}, // sessionId -> { name, role: player|spectator|gm, characterId, joinedAt }
    students: {}, // studentId -> per-room mutable state (drama, goals chosen, psi cost, etc)
    demon: null, // { name, type, power, complication, goal, badEnd, goodEnd, marksNeeded, defeated, retreated }
    scene: null, // { number, leadStudentId, focusGoalIndex, focusText, open, resolution }
    classVote: null, // { open, votes: { sessionId: { studentId: amount } } }
    challenge: null, // { calledBy, target, kind: rival|friend|demon, status }
    log: [] // recent event strings, capped client-side
  };
}

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------

// Ensures a room exists (creating it if this is the first time it's named),
// and returns { id, created }. Safe to call from the join screen for any role.
export async function connectRoom(roomName) {
  await ready();
  const id = normalizeRoomName(roomName);
  if (!id) throw new Error("Room name can't be empty.");
  roomId = id;
  const ref = doc(db, "rooms", id);
  const created = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return false;
    tx.set(ref, { ...defaultRoomState(roomName.trim()), createdAt: serverTimestamp() });
    return true;
  });
  return { id, created };
}

export function currentRoomId() { return roomId; }

// Subscribes to the connected room's live state. Call connectRoom() first.
// Returns an unsubscribe function.
export function subscribeRoomState(cb) {
  if (!roomId) throw new Error("No room connected — call connectRoom() first.");
  if (roomUnsub) roomUnsub();
  const ref = doc(db, "rooms", roomId);
  roomUnsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) { cb(null); return; }
    cb({ id: snap.id, ...snap.data() });
  }, (err) => console.error("subscribeRoomState error", err));
  return roomUnsub;
}

export function unsubscribeRoomState() {
  if (roomUnsub) { roomUnsub(); roomUnsub = null; }
}

// Shallow-merges a patch of dot-notation fields into the current room doc, e.g.
//   updateRoomState({ status: "playing", "scene.leadStudentId": "momo" })
export async function updateRoomState(patch) {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const ref = doc(db, "rooms", roomId);
  await updateDoc(ref, patch);
}

// Overwrites the whole room document (used sparingly — e.g. resetting state
// for a fresh episode). merge:true by default so unspecified fields survive.
export async function setRoomState(fullState, merge = true) {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const ref = doc(db, "rooms", roomId);
  await setDoc(ref, fullState, { merge });
}

export async function getRoomStateOnce() {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------------------------------------------------------------------------
// Players / characters
// ---------------------------------------------------------------------------

// Registers this session in the room's player map. role: "player" | "spectator" | "gm"
export async function joinRoom({ sessionId, name, role }) {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const ref = doc(db, "rooms", roomId);
  await updateDoc(ref, {
    [`players.${sessionId}`]: {
      name: name || "Player",
      role: role || "player",
      characterId: null,
      joinedAt: Date.now()
    }
  });
}

// Claims a Student for this session. Intentionally NOT exclusive — the spec
// allows multiple sessions to drive the same character (so a dead/disconnected
// session never soft-locks a character for the table). Uses a transaction only
// to make the read-then-write atomic against concurrent claims/unclaims.
export async function claimCharacter(studentId, sessionId) {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const ref = doc(db, "rooms", roomId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room no longer exists.");
    const data = snap.data();
    const players = { ...(data.players || {}) };
    players[sessionId] = {
      ...(players[sessionId] || { name: "Player", joinedAt: Date.now() }),
      role: "player",
      characterId: studentId
    };
    const students = { ...(data.students || {}) };
    const s = { ...(students[studentId] || {}) };
    const claimedBy = new Set(s.claimedBy || []);
    claimedBy.add(sessionId);
    s.claimedBy = Array.from(claimedBy);
    students[studentId] = s;
    tx.update(ref, { players, students });
  });
}

export async function setSpectator(sessionId) {
  await ready();
  if (!roomId) throw new Error("No room connected.");
  const ref = doc(db, "rooms", roomId);
  await updateDoc(ref, {
    [`players.${sessionId}`]: { name: "Spectator", role: "spectator", characterId: null, joinedAt: Date.now() }
  });
}

// ---------------------------------------------------------------------------
// GM room-list display
// ---------------------------------------------------------------------------

// Subscribes to the list of all rooms (for the GM's "display" screen).
// Returns an unsubscribe function. cb receives an array of { id, name, status,
// playerCount, createdAt }.
export function listRooms(cb) {
  ready().then(() => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    if (roomsListUnsub) roomsListUnsub();
    roomsListUnsub = onSnapshot(q, (snap) => {
      const rooms = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || d.id,
          status: data.status || "lobby",
          playerCount: Object.keys(data.players || {}).length,
          createdAt: data.createdAt
        };
      });
      cb(rooms);
    }, (err) => console.error("listRooms error", err));
  }).catch((err) => cb([], err));
  return () => { if (roomsListUnsub) { roomsListUnsub(); roomsListUnsub = null; } };
}

export async function deleteRoom(roomName) {
  await ready();
  const id = normalizeRoomName(roomName);
  await deleteDoc(doc(db, "rooms", id));
}

export { isConfigured };
