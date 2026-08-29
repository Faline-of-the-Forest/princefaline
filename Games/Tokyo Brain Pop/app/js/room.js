import {
  connectRoom, subscribeRoomState, updateRoomState, getSessionId,
  claimCharacter, setSpectator, joinRoom, isConfigured, currentRoomId
} from './firebase-sync.js';
import { STUDENTS, PSI_SHARED, POP_TARGETS, POP_LABEL, DEMON_TABLES, RULES, LOCATIONS, rollDie, pick, studentById } from './data.js';

let rulebookTab = 0;

function locationById(id) { return LOCATIONS.find(l => l.id === id) || LOCATIONS[0]; }
function headArt(id) { return `assets/head-${id}.png`; }
function bustArt(id) { return `assets/bust-${id}.png`; }
function portraitArt(id) { return `assets/portrait-${id}.png`; }

function dramaTrack(sub) {
  const dv = sub.drama ?? 1;
  const broken = !!sub.broken;
  const cells = [1, 2, 3, 4, 5].map(level => {
    const filled = dv >= level;
    const max = dv >= 5;
    return `<span class="tbp-drama-pip lvl${level}${filled ? ' filled' : ''}${filled && max ? ' max' : ''}"></span>`;
  }).join('');
  return `<div class="tbp-drama-track${broken ? ' broken' : ''}">${cells}</div>`;
}

const params = new URLSearchParams(location.search);
const roomParam = params.get('r');
const isGmEntry = params.get('gm') === '1';
const sessionId = getSessionId();
const app = document.getElementById('app');

let room = null;
let view = 'loading'; // loading | not-found | select | waiting | demon-select | playing | ended | rules

if (!roomParam) {
  app.innerHTML = `<p class="tbp-muted">No room specified. <a class="tbp-back" href="${isGmEntry ? 'gm.html' : 'index.html'}">Go back</a>.</p>`;
} else if (!isConfigured()) {
  app.innerHTML = `<div class="tbp-card"><h2>Not configured yet</h2><p>Firebase hasn't been wired up on this deployment yet — paste a Firebase project config into <code>app/js/firebase-sync.js</code>.</p></div>`;
} else {
  boot();
}

async function boot() {
  await connectRoom(roomParam);
  if (isGmEntry) await joinRoom({ sessionId, name: 'Headmaster', role: 'gm' });
  subscribeRoomState((state) => {
    room = state;
    if (!room) { view = 'not-found'; render(); return; }
    if (view === 'loading') view = pickInitialView();
    render();
  });
}

function me() {
  return (room && room.players && room.players[sessionId]) || null;
}
function isGm() {
  const p = me();
  return isGmEntry && p && p.role === 'gm';
}

function pickInitialView() {
  if (isGm()) return 'gm';
  const p = me();
  if (!p || !p.characterId) {
    if (p && p.role === 'spectator') return spectateView();
    return 'select';
  }
  return null; // computed live from room.status in render()
}
function spectateView() {
  return room.status === 'lobby' ? 'waiting' : room.status;
}

// ---------------------------------------------------------------------------
// render dispatch
// ---------------------------------------------------------------------------
// Guards a local roll animation against being wiped mid-flight: any other
// player's action re-triggers subscribeRoomState's callback (and thus
// render()) at any moment, but render() rebuilds the whole screen via
// innerHTML — which would cut off the reel animation the instant a
// snapshot arrives. While animating, skip the rebuild; the animation's own
// completion writes the resolved result to Firestore, which naturally
// re-renders once it lands.
let animating = false;
function render() {
  if (animating) return;
  if (view === 'not-found') {
    app.innerHTML = `<div class="tbp-card"><h2>Room closed</h2><p class="tbp-muted">This room no longer exists — the Headmaster may have deleted it.</p></div>`;
    return;
  }
  if (isGm()) { if (view === 'rules') { renderRules(); } else { renderGm(); } return; }

  const p = me();
  if (view === 'select' || !p || (!p.characterId && p.role !== 'spectator')) { renderSelect(); return; }
  if (p.role === 'spectator') { renderSpectator(); return; }

  if (room.status === 'lobby') { renderWaiting(); return; }
  if (room.status === 'demon-select') { renderDemonSelectPlayer(); return; }
  if (room.status === 'playing') { renderPlayer(); return; }
  if (room.status === 'ended') { renderEnded(); return; }
  renderWaiting();
}

function topBar(subtitle) {
  return `
    <div class="tbp-topbar">
      <div class="tbp-topbar-brand">
        <img src="assets/logo.png" alt="">
        <div>
          <div class="tbp-title">Tokyo Brain Pop</div>
          <div class="tbp-topbar-room">${room.name || currentRoomId()}${subtitle ? ' — ' + subtitle : ''}</div>
        </div>
      </div>
      <a class="tbp-back" href="${isGmEntry ? 'gm.html' : 'index.html'}">Leave room</a>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Character select (players + spectate option)
// ---------------------------------------------------------------------------
function renderSelect() {
  // Card structure ported from reference/markup.html:5014-5038 (f.setup.seats sc-for):
  // border:5px solid; border-radius:14px; box-shadow:0 7px 0 rgba(0,0,0,.45); art
  // bottom offset / name-bar height 56px; name-bar bg #231F20; name font-size 30px;
  // hover info-overlay with bio + PSI callout (rgba(237,227,27,.12) bg, 5px yellow
  // left border) from lines 5020-5026.
  const students = STUDENTS.map(s => {
    const sub = (room.students && room.students[s.id]) || {};
    const claimedByOthers = (sub.claimedBy || []).filter(id => id !== sessionId).length;
    const quirk = (sub.quirks && sub.quirks[0]) || s.quirkPool[0];
    return `
      <div class="tbp-tradingcard" style="border-color:#231F20">
        <div class="art-wrap">
          <img src="${portraitArt(s.id)}" alt="${s.label}">
          <span class="pop-tag">${sub.pop || s.pop}</span>
          <div class="info-overlay">
            <p class="bio-line">${s.bio}</p>
            <div class="psi-box">
              <div class="psi-name">${s.psi.name}</div>
              <div class="psi-desc">${s.psi.desc}</div>
            </div>
          </div>
        </div>
        <div class="name-bar"><div class="name-plate" style="color:${s.tone}">${s.label}</div></div>
        <div class="card-body">
          <p class="quirk-line" style="border-color:${s.tone}">${quirk}</p>
          <p class="psi-line" style="color:${s.tone}">PSI ${s.psi.short}</p>
          ${claimedByOthers ? `<p class="tbp-muted">Already played by ${claimedByOthers} other session${claimedByOthers > 1 ? 's' : ''} — you can join them.</p>` : ''}
          <button class="tbp-btn small" data-pick="${s.id}" style="align-self:flex-start">Play ${s.label}</button>
        </div>
      </div>`;
  }).join('');

  app.innerHTML = `
    ${topBar('choose your Student')}
    <div style="margin:18px 0"><div class="tbp-skew-banner"><div style="font-size:22px">CHOOSE YOUR STUDENT</div></div></div>
    <div class="tbp-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${students}</div>
    <div style="margin-top:18px;text-align:center">
      <button class="tbp-btn outline" id="spectate-btn">Join as Spectator instead</button>
    </div>
  `;
  app.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    await claimCharacter(b.dataset.pick, sessionId);
    view = null;
    render();
  }));
  document.getElementById('spectate-btn').addEventListener('click', async () => {
    await setSpectator(sessionId);
    view = null;
    render();
  });
}

function renderSpectator() {
  app.innerHTML = `
    ${topBar('spectating')}
    <div class="tbp-card"><span class="tbp-pill outline">Spectator</span><p class="tbp-muted">You're watching this game read-only.</p></div>
    ${renderStatusPanel()}
    <div style="margin-top:14px"><button class="tbp-btn outline small" id="pick-char">Pick a character instead</button></div>
  `;
  document.getElementById('pick-char').addEventListener('click', () => { view = 'select'; render(); });
}

function renderStatusPanel() {
  if (room.status === 'lobby') return `<div class="tbp-card"><p class="tbp-muted">Waiting for the Headmaster to start the game (${Object.keys(room.players || {}).length}/${room.requiredPlayers || 4} joined).</p></div>`;
  if (room.status === 'demon-select') return `<div class="tbp-card demon"><p class="tbp-muted">The Headmaster is choosing today's Demon…</p>${room.demon ? renderDemonSummary(room.demon) : ''}</div>`;
  if (room.status === 'playing') return renderSceneSummary() + renderDemonPanel(true);
  if (room.status === 'ended') return `<div class="tbp-card"><h2>Episode Over</h2>${room.demon ? `<p>${room.demon.defeated ? 'The Students prevailed.' : 'The Demon succeeded at its goal.'}</p>` : ''}</div>`;
  return '';
}

// ---------------------------------------------------------------------------
// Waiting room (player, pre-game)
// ---------------------------------------------------------------------------
function renderWaiting() {
  const p = me();
  const student = studentById(p.characterId);
  const count = Object.keys(room.players || {}).length;
  app.innerHTML = `
    ${topBar('waiting to start')}
    <div class="tbp-seatcard" style="border-color:${student.tone}">
      <div class="seat-head">
        <img src="${headArt(student.id)}" alt="${student.label}">
        <div>
          <div style="font:800 20px 'Baloo 2',sans-serif;color:${student.tone}">${student.label}</div>
          <span class="tbp-pill" style="background:${student.tone};color:#231F20">${student.pop}</span>
        </div>
      </div>
      <div class="seat-body">
        <p class="tbp-muted" style="font-style:italic">${student.bio}</p>
        <button class="tbp-btn small outline" id="change-char" style="margin-top:6px">Change character</button>
      </div>
    </div>
    <div class="tbp-card">
      <p>Waiting for the Headmaster to start the game.</p>
      <p class="tbp-muted">${count} of ${room.requiredPlayers || 4} players joined.</p>
    </div>
  `;
  document.getElementById('change-char').addEventListener('click', () => { view = 'select'; render(); });
}

// ---------------------------------------------------------------------------
// Demon select — player read-only view
// ---------------------------------------------------------------------------
function renderDemonSelectPlayer() {
  app.innerHTML = `
    ${topBar('the Headmaster is choosing today\'s Demon')}
    <div class="tbp-card demon">${room.demon ? renderDemonSummary(room.demon) : '<p class="tbp-muted">Rolling…</p>'}</div>
  `;
}

function renderDemonSummary(d) {
  return `
    <div class="demon-head"><img src="assets/icon-demon.png" alt=""><h3 style="color:var(--tbp-red-bright);margin:0">${d.name || 'The Demon'}</h3></div>
    <p class="tbp-badge-row">
      ${d.type ? `<span class="tbp-pill red">${d.type}</span>` : ''}
      ${d.power ? `<span class="tbp-pill red">${d.power}</span>` : ''}
    </p>
    ${d.complication ? `<p class="tbp-muted"><strong>Complication:</strong> ${d.complication}</p>` : ''}
    ${d.goal ? `<p><strong>Goal:</strong> ${d.goal}</p>` : ''}
  `;
}

// ---------------------------------------------------------------------------
// Player game screen
// ---------------------------------------------------------------------------
function renderPlayer() {
  const p = me();
  const student = studentById(p.characterId);
  const sub = (room.students && room.students[p.characterId]) || {};
  const isLead = room.scene && room.scene.leadStudentId === p.characterId;
  const canCallChallenge = !room.challenge && sub.drama < 5;
  const friend = sub.friend ? studentById(sub.friend) : null;
  const rival = sub.rival ? studentById(sub.rival) : null;

  app.innerHTML = `
    ${topBar('playing')}
    <div class="tbp-seatcard${sub.broken ? ' broken' : ''}" style="border-color:${student.tone}">
      <div class="seat-head" style="align-items:flex-start">
        <img src="${bustArt(student.id)}" alt="${student.label}" style="width:84px;height:84px;border-radius:10px">
        <div style="flex:1">
          <div class="tbp-flex-between">
            <span style="font:800 22px 'Baloo 2',sans-serif;color:${student.tone}">${student.label}</span>
            <span class="tbp-pill outline">${sub.pop || student.pop}</span>
          </div>
          <div style="margin:8px 0 2px" class="tbp-muted">Drama (${sub.drama ?? 1}/5)</div>
          ${dramaTrack(sub)}
          ${sub.broken ? '<p class="tbp-pill red" style="margin-top:8px">BROKEN — next Challenge is Break!</p>' : ''}
        </div>
      </div>
      <div class="seat-body">
        <div class="tbp-badge-row">
          <span class="tbp-pill outline">Best Friend: ${friend ? friend.label : '—'}</span>
          <span class="tbp-pill outline">Rival: ${rival ? rival.label : '—'}</span>
        </div>
        <h3 style="font-size:16px;margin-top:14px">Goals</h3>
        ${(sub.goals || []).map((g, i) => `
          <div class="tbp-flex-between" style="margin-bottom:6px">
            <span style="${sub.goalsCompleted && sub.goalsCompleted[i] ? 'text-decoration:line-through;color:var(--tbp-cream-dim)' : ''}">${g}</span>
            ${sub.goalsCompleted && sub.goalsCompleted[i] ? '<span class="tbp-pill">Done</span>' : ''}
          </div>`).join('') || '<p class="tbp-muted">No Goals set.</p>'}
        <h3 style="font-size:16px;margin-top:14px">Quirks</h3>
        ${(sub.quirks || []).map(q => `<p class="tbp-tradingcard-quirk" style="font-style:italic;border-left:3px solid ${student.tone};padding-left:10px;margin:4px 0;color:var(--tbp-cream)">${q}</p>`).join('') || '<p class="tbp-muted">—</p>'}
        <h3 style="font-size:16px;margin-top:14px">PSI: ${student.psi.name}</h3>
        <p class="tbp-muted">${student.psi.desc}</p>
        <p class="tbp-muted">Next use costs ${sub.psiCost ?? 2} Drama.</p>
      </div>
    </div>

    ${renderSceneSummary()}

    <div class="tbp-card">
      <h3 style="font-size:16px">Actions</h3>
      ${isLead ? '<p class="tbp-pill">You are the Lead this Scene</p>' : ''}
      <div class="tbp-badge-row">
        ${friend ? `<button class="tbp-btn small" data-challenge="friend" ${canCallChallenge ? '' : 'disabled'}>Call Challenge on Best Friend</button>` : ''}
        ${rival ? `<button class="tbp-btn small" data-challenge="rival" ${canCallChallenge ? '' : 'disabled'}>Call Challenge on Rival</button>` : ''}
        ${room.demon && !room.demon.defeated ? `<button class="tbp-btn small red" data-challenge="demon" ${canCallChallenge && (sub.drama ?? 1) < 5 ? '' : 'disabled'}>Call Challenge on the Demon</button>` : ''}
      </div>
      ${room.challenge && room.challenge.target === p.characterId ? renderChallengeResponse(room.challenge, p.characterId) : ''}
      ${room.challenge && room.challenge.calledBy === p.characterId && room.challenge.status === 'pending' ? '<p class="tbp-muted">Waiting for the Challenge to resolve…</p>' : ''}
    </div>

    ${room.classVote && room.classVote.open ? renderVotePanel() : ''}

    ${renderDemonPanel(true)}
    ${renderLog()}
    <div style="margin-top:14px"><button class="tbp-btn outline small" id="show-rules">Rules Reference</button></div>
  `;

  document.getElementById('show-rules').addEventListener('click', () => { view = 'rules'; render(); });
  app.querySelectorAll('[data-challenge]').forEach(b => b.addEventListener('click', () => callChallenge(b.dataset.challenge, p.characterId)));
  app.querySelectorAll('[data-resolve]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.resolve === 'roll') {
      if (animating) return;
      animating = true;
      const landed = rollDie();
      runRollAnimation(b, landed, () => {
        animating = false;
        resolveChallenge('roll', p.characterId, landed);
      });
    } else {
      resolveChallenge(b.dataset.resolve, p.characterId);
    }
  }));
  wireVotePanel();

  if (view === 'rules') { renderRules(); }
}

function renderSceneSummary() {
  // Ported from reference/markup.html:4415-4426 — the location "stage" card: square
  // photo tile at 100% height + a text panel with a skewed yellow name banner and a
  // bordered lead-focus row below (border-top:3px solid rgba(239,230,200,.22)).
  if (!room.scene) return '';
  const lead = studentById(room.scene.leadStudentId);
  const loc = locationById(room.scene.locationId);
  return `<div class="tbp-scenecard">
    <div class="scene-photo"><img src="${loc.img}" alt="${loc.name}"></div>
    <div class="scene-content">
      <div>
        <div class="tbp-skew-banner"><div class="scene-place">${loc.name}</div></div>
        <p class="scene-sub">${room.scene.focusText || `Scene ${room.scene.number} — focus not set yet.`}</p>
      </div>
      <div class="scene-lead">
        <img src="${headArt(lead.id)}" alt="${lead.label}">
        <div class="scene-lead-text">
          <div class="scene-lead-kind">LEAD — SCENE ${room.scene.number}</div>
          <div class="scene-lead-name">${lead.label} is in the spotlight.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderDemonPanel(compact) {
  if (!room.demon) return '';
  const d = room.demon;
  const needed = d.marksNeeded || 4;
  const goodPips = Array.from({ length: needed }, (_, i) => `<span class="tbp-end-pip good${i < (d.goodEnd || 0) ? ' on' : ''}"></span>`).join('');
  const badPips = Array.from({ length: needed }, (_, i) => `<span class="tbp-end-pip bad${i < (d.badEnd || 0) ? ' on' : ''}"></span>`).join('');
  return `<div class="tbp-demonpanel">
    <div class="demon-head">
      <img src="assets/icon-demon.png" alt="">
      <div style="flex:1">
        <div class="tbp-flex-between">
          <h3 style="margin:0">${d.name}</h3>
          ${d.defeated ? '<span class="tbp-pill">Defeated</span>' : ''}
        </div>
      </div>
    </div>
    ${!compact ? `<p class="tbp-badge-row" style="margin-top:10px">${d.type ? `<span class="tbp-pill red">${d.type}</span>` : ''}${d.power ? `<span class="tbp-pill red">${d.power}</span>` : ''}</p>
    ${d.complication ? `<p class="tbp-muted"><strong>Complication:</strong> ${d.complication}</p>` : ''}` : ''}
    <p style="margin-top:10px"><strong>Goal:</strong> ${d.goal}</p>
    <div class="tbp-end-tracks">
      <div class="tbp-end-track"><img src="assets/icon-goodend.png" alt="">${goodPips}</div>
      <div class="tbp-end-track"><img src="assets/icon-badend.png" alt="">${badPips}</div>
    </div>
  </div>`;
}

function renderChallengeResponse(ch, myId) {
  return `
    <div class="tbp-card" style="border-color:var(--tbp-yellow);margin-top:10px">
      <p><strong>Challenge called!</strong> Called by ${studentById(ch.calledBy).label} (${ch.kind}).</p>
      <div class="tbp-badge-row" style="align-items:stretch">
        <div class="tbp-rollbtn" id="roll-die" style="flex:1" data-resolve="roll"><span class="label">ROLL TO RESOLVE</span></div>
        <button class="tbp-btn small outline" data-resolve="psi">Use PSI instead</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Dice-roll reel animation — real physics ported from
// reference/table-screen-source.jsx:841-866 (roll()): DUR=1200ms, quartic
// ease-out (e = 1-(1-p)^4), target = (30 + landed - 1) * ITEM so the strip
// spins through many full revolutions before settling on the pre-picked
// face. Purely a client-local visual flourish — the actual roll value is
// already decided before the animation starts, and gets written to
// Firestore only once the animation finishes.
// ---------------------------------------------------------------------------
const REEL_ITEM = 48;
function runRollAnimation(container, landed, onDone) {
  const digits = [];
  for (let i = 0; i < 42; i++) digits.push(((i % 6) + 1));
  container.classList.add('rolling');
  container.innerHTML = `<div class="reel-window"><div class="reel-strip">${digits.map(n => `<div>${n}</div>`).join('')}</div></div>`;
  const strip = container.querySelector('.reel-strip');
  const target = (30 + landed - 1) * REEL_ITEM;
  const DUR = 1200;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min(1, (now - t0) / DUR);
    const e = 1 - Math.pow(1 - p, 4);
    const blur = Math.min(2.2, (1 - p) * 2.4).toFixed(2);
    strip.style.transform = `translateY(-${Math.round(target * e)}px)`;
    strip.style.filter = `blur(${blur}px)`;
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      container.classList.remove('rolling');
      container.innerHTML = `<div class="impact-ring"></div><div class="face-result">${landed}</div>`;
      setTimeout(() => onDone(landed), 460);
    }
  }
  requestAnimationFrame(step);
}

// Table-shuffle animation for the Demon-build rolls (Type/Power/Complication/
// Goal) — the reference's continuous CSS `tbp-reel … linear infinite` scroll
// (markup.html:4945) rather than the physics reel above, since these are
// short text entries, not digits. Cycles rapid random picks from the table
// then lands on the pre-picked final value.
function runTableShuffle(el, table, final, onDone) {
  if (!el) { onDone(); return; }
  el.classList.add('shuffling');
  let n = 0;
  const iv = setInterval(() => { el.textContent = pick(table); n++; }, 55);
  setTimeout(() => {
    clearInterval(iv);
    el.classList.remove('shuffling');
    el.classList.add('landed');
    el.textContent = final;
    setTimeout(() => el.classList.remove('landed'), 460);
    onDone();
  }, 650);
}

function renderVotePanel() {
  const p = me();
  const myVotes = (room.classVote.votes && room.classVote.votes[sessionId]) || {};
  const spentSoFar = Object.values(myVotes).reduce((a, b) => a + b, 0);
  const sub = (room.students && room.students[p.characterId]) || {};
  const available = (sub.drama ?? 1) - spentSoFar;
  return `<div class="tbp-card" style="border-color:var(--tbp-yellow)">
    <div class="tbp-flex-between">
      <h3 style="font-size:16px;margin:0">Class Vote — spend your Drama</h3>
      <span class="tbp-vote-clock${available <= 1 ? ' low' : ''}">${available} left</span>
    </div>
    <p class="tbp-muted">Split it, dump it on one, or spend none. Most spent-on becomes Most Popular; least becomes Least Popular.</p>
    ${STUDENTS.map(s => {
      const n = myVotes[s.id] || 0;
      return `
      <div class="tbp-vote-row">
        <span style="color:${s.tone};min-width:78px;font:700 13px 'Baloo 2',sans-serif">${s.label}</span>
        <div class="tbp-vote-bar-track"><div class="tbp-vote-bar-fill" style="width:${Math.min(100, n * 20)}%;background:${s.tone}"></div></div>
        <button class="tbp-btn small outline" data-vote-minus="${s.id}">-</button>
        <span style="padding:0 4px;min-width:14px;text-align:center">${n}</span>
        <button class="tbp-btn small outline" data-vote-plus="${s.id}">+</button>
      </div>`;
    }).join('')}
    <button class="tbp-btn small" id="submit-vote" style="margin-top:8px">Confirm Votes</button>
  </div>`;
}
function wireVotePanel() {
  const panel = document.getElementById('submit-vote');
  if (!panel) return;
  const p = me();
  app.querySelectorAll('[data-vote-plus]').forEach(b => b.addEventListener('click', () => adjustVote(b.dataset.votePlus, 1, p.characterId)));
  app.querySelectorAll('[data-vote-minus]').forEach(b => b.addEventListener('click', () => adjustVote(b.dataset.voteMinus, -1, p.characterId)));
  panel.addEventListener('click', async () => {
    panel.disabled = true;
    panel.textContent = 'Submitted';
  });
}
async function adjustVote(studentId, delta, myCharId) {
  const votes = { ...(room.classVote.votes || {}) };
  const mine = { ...(votes[sessionId] || {}) };
  const sub = (room.students && room.students[myCharId]) || {};
  const spent = Object.values(mine).reduce((a, b) => a + b, 0);
  const next = Math.max(0, (mine[studentId] || 0) + delta);
  const nextSpent = spent - (mine[studentId] || 0) + next;
  if (nextSpent > (sub.drama ?? 1)) return;
  mine[studentId] = next;
  votes[sessionId] = mine;
  await updateRoomState({ 'classVote.votes': votes });
}

async function callChallenge(kind, calledBy) {
  const sub = room.students[calledBy] || {};
  let target = null;
  if (kind === 'friend') target = sub.friend;
  else if (kind === 'rival') target = sub.rival;
  else target = 'demon';
  await updateRoomState({
    challenge: { calledBy, kind, target, status: 'pending' },
    [`students.${calledBy}.drama`]: Math.min(5, (sub.drama ?? 1) + 1),
    log: [...(room.log || []).slice(-40), `${studentById(calledBy).label} calls a Challenge (${kind}).`]
  });
}

async function resolveChallenge(mode, myCharId, preRolled) {
  const ch = room.challenge;
  if (!ch) return;
  const sub = room.students[myCharId] || {};
  if (mode === 'psi') {
    const cost = sub.psiCost ?? 2;
    const drama = Math.max(0, (sub.drama ?? 1) - cost);
    await updateRoomState({
      challenge: { ...ch, status: 'resolved', outcome: 'PSI used — automatic success, awful consequences.' },
      [`students.${myCharId}.drama`]: drama,
      [`students.${myCharId}.psiCost`]: Math.min(5, cost + 1),
      log: [...(room.log || []), `${studentById(myCharId).label} uses PSI to resolve the Challenge.`]
    });
    return;
  }
  const target = POP_TARGETS[sub.pop] || 4;
  const roll = preRolled ?? rollDie();
  const success = roll >= target;
  const drama = Math.min(5, (sub.drama ?? 1) + (success ? 0 : 1));
  const broken = drama > 5 || (sub.broken && !success);
  await updateRoomState({
    challenge: { ...ch, status: 'resolved', roll, outcome: success ? 'Success!' : 'Failure — Drama gained.' },
    [`students.${myCharId}.drama`]: Math.min(5, drama),
    log: [...(room.log || []), `${studentById(myCharId).label} rolls ${roll} vs ${target}+ — ${success ? 'Success!' : 'Failure.'}`]
  });
}

function renderLog() {
  if (!room.log || !room.log.length) return '';
  return `<div class="tbp-card"><h3 style="font-size:15px">Log</h3><div class="tbp-log">${room.log.slice().reverse().map(l => `<div>${l}</div>`).join('')}</div></div>`;
}

function renderEnded() {
  app.innerHTML = `${topBar('episode over')}<div class="tbp-card">${room.demon ? `<h2>${room.demon.defeated ? 'The Students prevailed!' : 'The Demon succeeded…'}</h2>` : '<h2>Episode Over</h2>'}${renderLog()}</div>`;
}

function renderRules() {
  // Ported from reference/markup.html:5250-5284 — yellow header bar (5px black border,
  // 20px radius, 12px 12px 0 shadow), 224px-wide left sidebar of tab rows (not a pill
  // row), body with 34px yellow h3, pink 20px h4s, and diamond-bullet list items.
  const active = RULES[rulebookTab] || RULES[0];
  app.innerHTML = `
    ${topBar('rules reference')}
    <a class="tbp-back" href="#" id="back-to-game">← Back to game</a>
    <div class="tbp-rulebook-frame">
      <div class="tbp-rulebook-head">Rulebook</div>
      <div class="tbp-rulebook-body">
        <div class="tbp-rulebook-tabs">
          ${RULES.map((r, i) => `<button class="tbp-rulebook-tab${i === rulebookTab ? ' active' : ''}" data-rb-tab="${i}">${r.label}</button>`).join('')}
        </div>
        <div class="tbp-rulebook">
          <h3>${active.title}</h3>
          ${active.blocks.map(b => b.t === 'h' ? `<h4>${b.text}</h4>` : b.t === 'li' ? `<li>${b.text}</li>` : `<p>${b.text}</p>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('back-to-game').addEventListener('click', (e) => { e.preventDefault(); view = null; render(); });
  app.querySelectorAll('[data-rb-tab]').forEach(b => b.addEventListener('click', () => { rulebookTab = Number(b.dataset.rbTab); renderRules(); }));
}

// ---------------------------------------------------------------------------
// GM Scene Control
// ---------------------------------------------------------------------------
function renderGm() {
  if (room.status === 'lobby') return renderGmLobby();
  if (room.status === 'demon-select') return renderGmDemonSelect();
  if (room.status === 'playing') return renderGmPlaying();
  if (room.status === 'ended') return renderGmEnded();
}

function renderGmLobby() {
  const playersList = Object.entries(room.players || {}).filter(([, p]) => p.role !== 'gm');
  app.innerHTML = `
    ${topBar('Headmaster — Lobby')}
    <div class="tbp-card">
      <h3 style="font-size:16px">Players (${playersList.length})</h3>
      ${playersList.map(([id, p]) => `<div class="tbp-flex-between"><span>${p.name}</span><span class="tbp-muted">${p.characterId ? studentById(p.characterId).label : (p.role === 'spectator' ? 'Spectator' : 'choosing…')}</span></div>`).join('') || '<p class="tbp-muted">No one has joined yet.</p>'}
    </div>
    <div class="tbp-card">
      <h3 style="font-size:16px">Start Conditions</h3>
      <div class="tbp-row" style="margin-bottom:10px">
        <span class="tbp-muted">Required players:</span>
        <select class="tbp-select" id="req-players">
          <option value="3" ${room.requiredPlayers === 3 ? 'selected' : ''}>3</option>
          <option value="4" ${room.requiredPlayers === 4 ? 'selected' : ''}>4</option>
        </select>
      </div>
      <button class="tbp-btn" id="force-start" ${playersList.length >= (room.requiredPlayers || 4) ? '' : 'disabled'}>Force Start Game</button>
      ${playersList.length < (room.requiredPlayers || 4) ? `<p class="tbp-muted">Need ${(room.requiredPlayers || 4) - playersList.length} more player(s).</p>` : ''}
    </div>
  `;
  document.getElementById('req-players').addEventListener('change', (e) => {
    updateRoomState({ requiredPlayers: Number(e.target.value) });
  });
  document.getElementById('force-start').addEventListener('click', async () => {
    await startDemonSelect();
  });
}

async function startDemonSelect() {
  const students = {};
  const ids = STUDENTS.map(s => s.id);
  ids.forEach((id, i) => {
    const s = studentById(id);
    const others = ids.filter(x => x !== id);
    const friend = pick(others);
    const rival = pick(others.filter(x => x !== friend)) || pick(others);
    students[id] = {
      pop: s.pop,
      drama: 1,
      psiCost: 2,
      broken: false,
      claimedBy: (room.students && room.students[id] && room.students[id].claimedBy) || [],
      quirks: shuffle(s.quirkPool).slice(0, 2),
      goals: shuffle(s.goalPool).slice(0, 2),
      goalsCompleted: [false, false],
      friend, rival
    };
  });
  await updateRoomState({
    status: 'demon-select',
    students,
    demon: { name: '', type: '', power: '', complication: '', goal: '', goodEnd: 0, badEnd: 0, marksNeeded: 4, defeated: false },
    log: [...(room.log || []), 'The Headmaster begins Demon selection.']
  });
}
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

function renderGmDemonSelect() {
  const d = room.demon || {};
  app.innerHTML = `
    ${topBar('Headmaster — Demon Select')}
    <div class="tbp-demonpanel">
      <div class="demon-head"><img src="assets/icon-demon.png" alt=""><h3 style="font-size:16px;margin:0">Build the Demon</h3></div>
      <div class="site-field"><label>Name</label><input class="tbp-textinput" id="d-name" value="${d.name || ''}" style="width:100%"></div>
      ${['type', 'power', 'complication', 'goal'].map(field => `
        <div class="tbp-flex-between" style="margin-top:8px">
          <div style="flex:1"><span class="tbp-muted" style="text-transform:capitalize">${field}:</span> <strong id="d-field-${field}" class="tbp-demon-field">${d[field] || '—'}</strong></div>
          <button class="tbp-btn small outline" data-roll="${field}">🎲 Roll</button>
        </div>`).join('')}
      <button class="tbp-btn" id="save-demon" style="margin-top:12px">Save Demon</button>
    </div>
    <div class="tbp-card">
      <p class="tbp-muted">Students in this episode: ${STUDENTS.length}. Good/Bad End marks needed: ${d.marksNeeded ?? STUDENTS.length}.</p>
      <button class="tbp-btn" id="begin-game" ${d.name ? '' : 'disabled'}>Begin the Episode</button>
      ${!d.name ? '<p class="tbp-muted">Name and save the Demon first.</p>' : ''}
    </div>
  `;
  app.querySelectorAll('[data-roll]').forEach(b => b.addEventListener('click', () => {
    if (animating) return;
    const field = b.dataset.roll;
    const final = pick(DEMON_TABLES[field]);
    const el = document.getElementById(`d-field-${field}`);
    animating = true;
    runTableShuffle(el, DEMON_TABLES[field], final, () => {
      d[field] = final;
      animating = false;
    });
  }));
  document.getElementById('save-demon').addEventListener('click', async () => {
    const name = document.getElementById('d-name').value.trim() || 'The Demon';
    await updateRoomState({ demon: { ...d, name, marksNeeded: STUDENTS.length } });
  });
  document.getElementById('begin-game').addEventListener('click', async () => {
    const firstLead = STUDENTS[0].id;
    await updateRoomState({
      status: 'playing',
      scene: { number: 1, leadStudentId: firstLead, focusText: '', open: true },
      log: [...(room.log || []), `Episode begins. Demon: ${d.name}.`]
    });
  });
}

function renderGmPlaying() {
  const scene = room.scene || { number: 1, leadStudentId: STUDENTS[0].id, focusText: '' };
  const lead = studentById(scene.leadStudentId);
  const leadSub = room.students[scene.leadStudentId] || {};
  const loc = locationById(scene.locationId);
  app.innerHTML = `
    ${topBar('Headmaster — Scene Control')}
    ${renderSceneSummary()}
    <div class="tbp-gm-head"><div class="tbp-gm-title">Scene Control</div><div class="tbp-gm-badge">HEADMASTER ONLY</div></div>
    <div class="tbp-gm-panel">
      <div class="tbp-gm-section-label">1 — WHERE</div>
      <div class="tbp-loc-grid">
        ${LOCATIONS.map(l => `
          <div class="tbp-loc-card${loc.id === l.id ? ' active' : ''}" data-loc-pick="${l.id}">
            <img src="${l.img}" alt="${l.name}">
            <div class="tbp-loc-name">${l.name}</div>
          </div>`).join('')}
      </div>
      <input class="tbp-textinput" id="loc-sub" value="${scene.subLocation || ''}" placeholder="Sub-location — e.g. ${loc.subs[0]}" style="width:100%;margin-bottom:8px" list="loc-subs">
      <datalist id="loc-subs">${loc.subs.map(s => `<option value="${s}">`).join('')}</datalist>
      <div class="tbp-subchip-row">
        ${loc.subs.map(s => `<div class="tbp-subchip" data-sub-pick="${s}">${s}</div>`).join('')}
      </div>

      <div class="tbp-gm-section-label" style="margin-top:16px">2 — WHOSE SCENE (the Lead)</div>
      <div class="tbp-lead-row">
        ${STUDENTS.map(s => `
          <div class="tbp-lead-chip${scene.leadStudentId === s.id ? ' active' : ''}" data-lead-pick="${s.id}">
            <img src="${headArt(s.id)}" alt="${s.label}" style="background:${s.tone}">
            <div class="name" style="color:${s.tone}">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="tbp-gm-section-label">3 — THE FOCUS (Lead's chosen Goal)</div>
      <div class="tbp-focus-list">
        ${(leadSub.goals || []).map((g, i) => {
          const done = leadSub.goalsCompleted && leadSub.goalsCompleted[i];
          const active = String(scene.focusGoalIndex) === String(i);
          return `<div class="tbp-focus-row">
            <div class="tbp-focus-option${active ? ' active' : ''}" data-focus-pick="${i}">
              <div class="dot"></div>
              <div class="text" style="${done ? 'text-decoration:line-through;color:var(--tbp-cream-dim)' : ''}">${g}</div>
            </div>
            <div class="tbp-focus-done${done ? ' done' : ''}" data-focus-done="${i}" title="Mark this Goal completed">✓</div>
          </div>`;
        }).join('') || '<p class="tbp-muted">This student has no Goals set.</p>'}
      </div>

      <div class="tbp-badge-row" style="margin-top:14px">
        <button class="tbp-btn small outline" id="next-scene">End Scene / Next</button>
        <button class="tbp-btn small outline" id="show-rules-gm">Rulebook</button>
        <button class="tbp-btn small outline" id="open-vote">${room.classVote && room.classVote.open ? 'Vote Open…' : 'Open Class Vote'}</button>
        ${room.classVote && room.classVote.open ? '<button class="tbp-btn small" id="tally-vote">Tally Vote</button>' : ''}
      </div>
    </div>

    ${renderDemonPanel(false)}
    <div class="tbp-card">
      <h3 style="font-size:16px">Demon Track</h3>
      <div class="tbp-badge-row">
        <button class="tbp-btn small outline" id="demon-good">+ Good End</button>
        <button class="tbp-btn small outline" id="demon-bad">+ Bad End</button>
        <button class="tbp-btn small" id="demon-defeat">Mark Defeated</button>
        <button class="tbp-btn small red" id="end-episode">End Episode</button>
      </div>
    </div>

    <div class="tbp-card">
      <h3 style="font-size:16px">Students</h3>
      <div class="tbp-grid">
        ${STUDENTS.map(s => {
          const sub = room.students[s.id] || {};
          return `<div class="tbp-seatcard${sub.broken ? ' broken' : ''}" style="border-color:${s.tone};margin-bottom:0">
            <div class="seat-head">
              <img src="${headArt(s.id)}" alt="${s.label}">
              <div style="flex:1"><div class="tbp-flex-between"><strong style="color:${s.tone}">${s.label}</strong><span class="tbp-pill outline">${sub.pop}</span></div></div>
            </div>
            <div class="seat-body">
              ${dramaTrack(sub)}
              <div class="tbp-badge-row" style="margin-top:6px">
                <button class="tbp-btn small outline" data-drama-minus="${s.id}">-Drama</button>
                <button class="tbp-btn small outline" data-drama-plus="${s.id}">+Drama</button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${room.challenge ? renderGmChallengePanel(room.challenge) : ''}
    ${renderLog()}
  `;

  app.querySelectorAll('[data-loc-pick]').forEach(b => b.addEventListener('click', () => updateRoomState({ 'scene.locationId': b.dataset.locPick })));
  document.getElementById('loc-sub').addEventListener('change', (e) => updateRoomState({ 'scene.subLocation': e.target.value }));
  app.querySelectorAll('[data-sub-pick]').forEach(b => b.addEventListener('click', () => updateRoomState({ 'scene.subLocation': b.dataset.subPick })));
  document.getElementById('show-rules-gm').addEventListener('click', () => { view = 'rules'; renderRules(); });
  app.querySelectorAll('[data-lead-pick]').forEach(b => b.addEventListener('click', () => updateRoomState({ 'scene.leadStudentId': b.dataset.leadPick, 'scene.focusGoalIndex': null, 'scene.focusText': '' })));
  app.querySelectorAll('[data-focus-pick]').forEach(b => b.addEventListener('click', () => {
    const idx = Number(b.dataset.focusPick);
    const goals = (room.students[scene.leadStudentId] || {}).goals || [];
    updateRoomState({ 'scene.focusGoalIndex': idx, 'scene.focusText': goals[idx] || '' });
  }));
  app.querySelectorAll('[data-focus-done]').forEach(b => b.addEventListener('click', async () => {
    const idx = Number(b.dataset.focusDone);
    const sub = room.students[scene.leadStudentId] || {};
    const done = (sub.goalsCompleted || [false, false]).slice();
    done[idx] = !done[idx];
    await updateRoomState({ [`students.${scene.leadStudentId}.goalsCompleted`]: done, log: [...(room.log || []), `${lead.label} ${done[idx] ? 'completed' : 'reopened'} a Goal.`] });
  }));
  document.getElementById('next-scene').addEventListener('click', async () => {
    const ids = STUDENTS.map(s => s.id);
    const idx = ids.indexOf(scene.leadStudentId);
    const nextLead = ids[(idx + 1) % ids.length];
    await updateRoomState({
      scene: { number: (scene.number || 1) + 1, leadStudentId: nextLead, focusGoalIndex: null, focusText: '' },
      challenge: null,
      log: [...(room.log || []), `Scene ${scene.number} ends.`]
    });
  });
  document.getElementById('open-vote').addEventListener('click', async () => {
    if (room.classVote && room.classVote.open) return;
    await updateRoomState({ classVote: { open: true, votes: {} }, log: [...(room.log || []), 'Class Vote opens.'] });
  });
  const tally = document.getElementById('tally-vote');
  if (tally) tally.addEventListener('click', tallyVote);

  document.getElementById('demon-good').addEventListener('click', () => bumpDemon('goodEnd', 1));
  document.getElementById('demon-bad').addEventListener('click', () => bumpDemon('badEnd', 1));
  document.getElementById('demon-defeat').addEventListener('click', () => updateRoomState({ 'demon.defeated': true, log: [...(room.log || []), `${room.demon.name} is defeated!`] }));
  document.getElementById('end-episode').addEventListener('click', () => updateRoomState({ status: 'ended', log: [...(room.log || []), 'The episode ends.'] }));

  app.querySelectorAll('[data-drama-plus]').forEach(b => b.addEventListener('click', () => bumpDrama(b.dataset.dramaPlus, 1)));
  app.querySelectorAll('[data-drama-minus]').forEach(b => b.addEventListener('click', () => bumpDrama(b.dataset.dramaMinus, -1)));
}

async function bumpDemon(field, delta) {
  const d = room.demon;
  const next = Math.max(0, (d[field] || 0) + delta);
  await updateRoomState({ [`demon.${field}`]: next });
}
async function bumpDrama(studentId, delta) {
  const sub = room.students[studentId] || {};
  let drama = (sub.drama ?? 1) + delta;
  let broken = sub.broken;
  if (drama > 5) { broken = true; drama = 0; }
  drama = Math.max(0, Math.min(5, drama));
  await updateRoomState({ [`students.${studentId}.drama`]: drama, [`students.${studentId}.broken`]: broken });
}

function renderGmChallengePanel(ch) {
  return `<div class="tbp-card" style="border-color:var(--tbp-yellow)">
    <h3 style="font-size:16px">Active Challenge</h3>
    <p>${studentById(ch.calledBy).label} called on ${ch.target === 'demon' ? 'the Demon' : studentById(ch.target).label} (${ch.kind})</p>
    ${ch.roll ? `<p>Rolled: <strong>${ch.roll}</strong> — ${ch.outcome}</p>` : ''}
    <div class="tbp-badge-row">
      <button class="tbp-btn small outline" id="clear-challenge">Clear / Resolve Manually</button>
    </div>
  </div>`;
}

function renderGmEnded() {
  app.innerHTML = `
    ${topBar('Headmaster — Episode Over')}
    <div class="tbp-card">${room.demon ? `<h2>${room.demon.defeated ? 'The Students prevailed!' : 'The Demon succeeded…'}</h2>` : ''}
      <button class="tbp-btn" id="reset-lobby">Start New Episode (reset)</button>
    </div>
    ${renderLog()}
  `;
  document.getElementById('reset-lobby').addEventListener('click', async () => {
    await updateRoomState({ status: 'lobby', scene: null, demon: null, classVote: null, challenge: null });
  });
}

function voteTotals() {
  const votes = room.classVote.votes || {};
  const totals = {};
  STUDENTS.forEach(s => totals[s.id] = 0);
  Object.values(votes).forEach(v => { Object.entries(v).forEach(([id, amt]) => { totals[id] = (totals[id] || 0) + amt; }); });
  const entries = Object.entries(totals);
  const max = Math.max(...entries.map(e => e[1]));
  const min = Math.min(...entries.map(e => e[1]));
  return {
    mostCandidates: entries.filter(e => e[1] === max).map(e => e[0]),
    leastCandidates: entries.filter(e => e[1] === min).map(e => e[0])
  };
}

async function applyVoteResult(most, least, tieBroken) {
  const patch = { 'classVote.open': false };
  STUDENTS.forEach(s => {
    let pop = 'Average';
    if (s.id === most) pop = 'Most';
    else if (s.id === least) pop = 'Least';
    patch[`students.${s.id}.pop`] = pop;
  });
  patch.log = [...(room.log || []), `Class Vote result: ${studentById(most).label} is Most Popular, ${studentById(least).label} is Least Popular.${tieBroken ? ' (Tie broken by roll.)' : ''}`];
  await updateRoomState(patch);
}

// Tally the Class Vote — ported flourish: "Ties are settled randomly" (RULES,
// Drama & the Vote) gets an actual roll-off instead of instantly resolving,
// using the same reel component as Challenge rolls (rollFor()'s reel, ported
// above). A clean (non-tied) result resolves immediately, matching how the
// original only rolled when there was something to roll for.
async function tallyVote() {
  const { mostCandidates, leastCandidates } = voteTotals();
  const tied = mostCandidates.length > 1 || leastCandidates.length > 1;
  const most = pick(mostCandidates);
  const least = pick(leastCandidates.filter(id => id !== most)) || pick(leastCandidates);
  const btn = document.getElementById('tally-vote');
  if (!tied || !btn) { await applyVoteResult(most, least, false); return; }
  if (animating) return;
  animating = true;
  btn.classList.add('tbp-rollbtn');
  runRollAnimation(btn, rollDie(), async () => {
    animating = false;
    await applyVoteResult(most, least, true);
  });
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'clear-challenge') updateRoomState({ challenge: null });
});
