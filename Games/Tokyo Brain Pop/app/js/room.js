import {
  connectRoom, subscribeRoomState, updateRoomState, getSessionId,
  claimCharacter, setSpectator, joinRoom, isConfigured, currentRoomId
} from './firebase-sync.js';
import { STUDENTS, PSI_SHARED, POP_TARGETS, POP_LABEL, DEMON_TABLES, RULES, rollDie, pick, studentById } from './data.js';

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
function render() {
  if (view === 'not-found') {
    app.innerHTML = `<div class="tbp-card"><h2>Room closed</h2><p class="tbp-muted">This room no longer exists — the Headmaster may have deleted it.</p></div>`;
    return;
  }
  if (isGm()) { renderGm(); return; }

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
    <div class="tbp-flex-between" style="margin-bottom:6px">
      <div class="tbp-title" style="margin:0;font-size:clamp(22px,4vw,32px)">Tokyo Brain Pop</div>
      <a class="tbp-back" href="${isGmEntry ? 'gm.html' : 'index.html'}">Leave room</a>
    </div>
    <p class="tbp-muted" style="margin-top:0">${room.name || currentRoomId()}${subtitle ? ' — ' + subtitle : ''}</p>
  `;
}

// ---------------------------------------------------------------------------
// Character select (players + spectate option)
// ---------------------------------------------------------------------------
function renderSelect() {
  const students = STUDENTS.map(s => {
    const sub = (room.students && room.students[s.id]) || {};
    const claimedByOthers = (sub.claimedBy || []).filter(id => id !== sessionId).length;
    return `
      <div class="tbp-card" style="border-color:${s.tone}">
        <div class="tbp-flex-between">
          <h3 style="color:${s.tone};margin:0">${s.label}</h3>
          <span class="tbp-pill outline">${sub.pop || s.pop}</span>
        </div>
        <p class="tbp-muted" style="margin:8px 0">${s.bio}</p>
        ${claimedByOthers ? `<p class="tbp-muted">Already played by ${claimedByOthers} other session${claimedByOthers > 1 ? 's' : ''} — you can join them.</p>` : ''}
        <button class="tbp-btn small" data-pick="${s.id}">Play ${s.label}</button>
      </div>`;
  }).join('');

  app.innerHTML = `
    ${topBar('choose your Student')}
    <div class="tbp-grid">${students}</div>
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
    <div class="tbp-card" style="border-color:${student.tone}">
      <span class="tbp-pill" style="background:${student.tone};color:#231F20">${student.label}</span>
      <p class="tbp-muted" style="margin-top:10px">${student.bio}</p>
      <button class="tbp-btn small outline" id="change-char" style="margin-top:6px">Change character</button>
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
    <h3 style="color:var(--tbp-red)">${d.name || 'The Demon'}</h3>
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
    <div class="tbp-card" style="border-color:${student.tone}">
      <div class="tbp-flex-between">
        <h3 style="color:${student.tone};margin:0">${student.label}</h3>
        <span class="tbp-pill outline">${sub.pop || student.pop}</span>
      </div>
      <div style="margin:10px 0">
        <div class="tbp-muted" style="margin-bottom:4px">Drama (${sub.drama ?? 1}/5)</div>
        <div class="tbp-drama-track">${[1,2,3,4,5].map(i => `<span class="tbp-drama-dot${(sub.drama ?? 1) >= i ? ' filled' : ''}"></span>`).join('')}</div>
        ${sub.broken ? '<p class="tbp-pill red" style="margin-top:8px">BROKEN — next Challenge is Break!</p>' : ''}
      </div>
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
      <p class="tbp-muted">${(sub.quirks || []).join(' · ') || '—'}</p>
      <h3 style="font-size:16px;margin-top:14px">PSI: ${student.psi.name}</h3>
      <p class="tbp-muted">${student.psi.desc}</p>
      <p class="tbp-muted">Next use costs ${sub.psiCost ?? 2} Drama.</p>
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
  app.querySelectorAll('[data-resolve]').forEach(b => b.addEventListener('click', () => resolveChallenge(b.dataset.resolve, p.characterId)));
  wireVotePanel();

  if (view === 'rules') { renderRules(); }
}

function renderSceneSummary() {
  if (!room.scene) return '';
  const lead = studentById(room.scene.leadStudentId);
  return `<div class="tbp-card">
    <div class="tbp-flex-between">
      <h3 style="font-size:16px;margin:0">Scene ${room.scene.number}</h3>
      <span class="tbp-pill" style="background:${lead.tone};color:#231F20">Lead: ${lead.label}</span>
    </div>
    <p class="tbp-muted">${room.scene.focusText || 'Focus not set yet.'}</p>
  </div>`;
}

function renderDemonPanel(compact) {
  if (!room.demon) return '';
  const d = room.demon;
  const needed = d.marksNeeded || 4;
  return `<div class="tbp-card demon">
    <div class="tbp-flex-between">
      <h3 style="color:var(--tbp-red);margin:0">${d.name}</h3>
      ${d.defeated ? '<span class="tbp-pill">Defeated</span>' : ''}
    </div>
    ${!compact ? `<p class="tbp-badge-row">${d.type ? `<span class="tbp-pill red">${d.type}</span>` : ''}${d.power ? `<span class="tbp-pill red">${d.power}</span>` : ''}</p>
    ${d.complication ? `<p class="tbp-muted"><strong>Complication:</strong> ${d.complication}</p>` : ''}` : ''}
    <p><strong>Goal:</strong> ${d.goal}</p>
    <div class="tbp-flex-between">
      <div>Good End: ${'●'.repeat(d.goodEnd || 0)}${'○'.repeat(Math.max(0, needed - (d.goodEnd || 0)))}</div>
      <div>Bad End: ${'●'.repeat(d.badEnd || 0)}${'○'.repeat(Math.max(0, needed - (d.badEnd || 0)))}</div>
    </div>
  </div>`;
}

function renderChallengeResponse(ch, myId) {
  return `
    <div class="tbp-card" style="border-color:var(--tbp-yellow);margin-top:10px">
      <p><strong>Challenge called!</strong> Called by ${studentById(ch.calledBy).label} (${ch.kind}).</p>
      <div class="tbp-badge-row">
        <button class="tbp-btn small" data-resolve="roll">Roll to resolve</button>
        <button class="tbp-btn small outline" data-resolve="psi">Use PSI instead</button>
      </div>
    </div>`;
}

function renderVotePanel() {
  const p = me();
  const myVotes = (room.classVote.votes && room.classVote.votes[sessionId]) || {};
  const spentSoFar = Object.values(myVotes).reduce((a, b) => a + b, 0);
  const sub = (room.students && room.students[p.characterId]) || {};
  const available = (sub.drama ?? 1) - spentSoFar;
  return `<div class="tbp-card" style="border-color:var(--tbp-yellow)">
    <h3 style="font-size:16px">Class Vote — spend your Drama</h3>
    <p class="tbp-muted">You have ${available} Drama left to spend on this vote.</p>
    ${STUDENTS.map(s => `
      <div class="tbp-flex-between" style="margin-bottom:6px">
        <span style="color:${s.tone}">${s.label}</span>
        <span>
          <button class="tbp-btn small outline" data-vote-minus="${s.id}">-</button>
          <span style="padding:0 8px">${myVotes[s.id] || 0}</span>
          <button class="tbp-btn small outline" data-vote-plus="${s.id}">+</button>
        </span>
      </div>`).join('')}
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

async function resolveChallenge(mode, myCharId) {
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
  const roll = rollDie();
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
  app.innerHTML = `
    ${topBar('rules reference')}
    <a class="tbp-back" href="#" id="back-to-game">← Back to game</a>
    ${RULES.map(r => `<div class="tbp-card"><h3>${r.title}</h3>${r.blocks.map(b => b.t === 'h' ? `<h4 style="color:var(--tbp-yellow);margin:10px 0 4px">${b.text}</h4>` : b.t === 'li' ? `<p style="margin:4px 0">• ${b.text}</p>` : `<p style="margin:4px 0">${b.text}</p>`).join('')}</div>`).join('')}
  `;
  document.getElementById('back-to-game').addEventListener('click', (e) => { e.preventDefault(); view = null; render(); });
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
    <div class="tbp-card demon">
      <h3 style="font-size:16px">Build the Demon</h3>
      <div class="site-field"><label>Name</label><input class="tbp-textinput" id="d-name" value="${d.name || ''}" style="width:100%"></div>
      ${['type', 'power', 'complication', 'goal'].map(field => `
        <div class="tbp-flex-between" style="margin-top:8px">
          <div style="flex:1"><span class="tbp-muted" style="text-transform:capitalize">${field}:</span> <strong>${d[field] || '—'}</strong></div>
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
    const field = b.dataset.roll;
    d[field] = pick(DEMON_TABLES[field]);
    render();
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
  app.innerHTML = `
    ${topBar('Headmaster — Scene Control')}
    <div class="tbp-card">
      <h3 style="font-size:16px">Scene ${scene.number}</h3>
      <div class="site-field"><label>Lead</label>
        <select class="tbp-select" id="lead-select" style="width:100%">
          ${STUDENTS.map(s => `<option value="${s.id}" ${scene.leadStudentId === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="site-field" style="margin-top:8px"><label>Focus (Lead's chosen Goal)</label>
        <select class="tbp-select" id="focus-select" style="width:100%">
          <option value="">— choose —</option>
          ${(leadSub.goals || []).map((g, i) => `<option value="${i}" ${String(scene.focusGoalIndex) === String(i) ? 'selected' : ''} ${leadSub.goalsCompleted && leadSub.goalsCompleted[i] ? 'disabled' : ''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="tbp-badge-row" style="margin-top:10px">
        <button class="tbp-btn small" id="mark-goal-done">Mark Goal Complete</button>
        <button class="tbp-btn small outline" id="next-scene">End Scene / Next</button>
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
          return `<div class="tbp-card" style="border-color:${s.tone};margin-bottom:0">
            <div class="tbp-flex-between"><strong style="color:${s.tone}">${s.label}</strong><span class="tbp-pill outline">${sub.pop}</span></div>
            <div class="tbp-muted">Drama: ${sub.drama ?? 1}/5 ${sub.broken ? '· BROKEN' : ''}</div>
            <div class="tbp-badge-row" style="margin-top:6px">
              <button class="tbp-btn small outline" data-drama-minus="${s.id}">-Drama</button>
              <button class="tbp-btn small outline" data-drama-plus="${s.id}">+Drama</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${room.challenge ? renderGmChallengePanel(room.challenge) : ''}
    ${renderLog()}
  `;

  document.getElementById('lead-select').addEventListener('change', (e) => updateRoomState({ 'scene.leadStudentId': e.target.value, 'scene.focusGoalIndex': null, 'scene.focusText': '' }));
  document.getElementById('focus-select').addEventListener('change', (e) => {
    const idx = e.target.value;
    const goals = (room.students[scene.leadStudentId] || {}).goals || [];
    updateRoomState({ 'scene.focusGoalIndex': idx === '' ? null : Number(idx), 'scene.focusText': idx === '' ? '' : goals[Number(idx)] });
  });
  document.getElementById('mark-goal-done').addEventListener('click', async () => {
    if (scene.focusGoalIndex == null) return;
    const sub = room.students[scene.leadStudentId] || {};
    const done = (sub.goalsCompleted || [false, false]).slice();
    done[scene.focusGoalIndex] = true;
    await updateRoomState({ [`students.${scene.leadStudentId}.goalsCompleted`]: done, log: [...(room.log || []), `${lead.label} completed a Goal.`] });
  });
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

async function tallyVote() {
  const votes = room.classVote.votes || {};
  const totals = {};
  STUDENTS.forEach(s => totals[s.id] = 0);
  Object.values(votes).forEach(v => { Object.entries(v).forEach(([id, amt]) => { totals[id] = (totals[id] || 0) + amt; }); });
  const entries = Object.entries(totals);
  const max = Math.max(...entries.map(e => e[1]));
  const min = Math.min(...entries.map(e => e[1]));
  const mostCandidates = entries.filter(e => e[1] === max).map(e => e[0]);
  const leastCandidates = entries.filter(e => e[1] === min).map(e => e[0]);
  const most = pick(mostCandidates);
  const least = pick(leastCandidates.filter(id => id !== most)) || pick(leastCandidates);
  const patch = { 'classVote.open': false };
  STUDENTS.forEach(s => {
    let pop = 'Average';
    if (s.id === most) pop = 'Most';
    else if (s.id === least) pop = 'Least';
    patch[`students.${s.id}.pop`] = pop;
  });
  patch.log = [...(room.log || []), `Class Vote result: ${studentById(most).label} is Most Popular, ${studentById(least).label} is Least Popular.`];
  await updateRoomState(patch);
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'clear-challenge') updateRoomState({ challenge: null });
});
