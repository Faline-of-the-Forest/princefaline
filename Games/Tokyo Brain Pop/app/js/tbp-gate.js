// Tokyo Brain Pop — join gate for play.html.
//
// The title screen owns picking a room; this only resolves who you are once
// you're there. Three cases:
//   ?room=X&gm=1   → straight in as the Headmaster.
//   room not started → straight in as a Student with no seat yet. You claim
//                      your girl on the game's own Character Select.
//   room in play     → a picker for which Student you'll run, or spectate.
//
// An ADDITION: it never touches the game's DOM, it sits above it and resolves
// window.__TBPJoinedResolve.

const SEATS = [
  { label: 'HIROMI', who: 'momo',     tone: '#F6A7CA' },
  { label: 'KOTORI', who: 'midori',   tone: '#9CB39A' },
  { label: 'UME',    who: 'ao',       tone: '#A9BEDC' },
  { label: 'YUMI',   who: 'murasaki', tone: '#C8A8D8' }
];
const ACC = '#EDE31B', INK = '#231F20', CREAM = '#EFE6C8';
const BALOO = "font-family:'Baloo 2',sans-serif;font-weight:800;";
const LORA = "font-family:'Lora',serif;font-style:italic;";

const Net = await window.__TBPNetReady;
const params = new URLSearchParams(location.search);
const roomName = params.get('room') || '';
const asGm = params.get('gm') === '1';

function fail(msg) {
  const root = document.createElement('div');
  root.id = 'tbp-gate';
  root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:' + INK +
    ';display:flex;align-items:center;justify-content:center;padding:24px;text-align:center';
  root.innerHTML =
    '<div style="max-width:520px">' +
      '<div style="display:inline-block;transform:skewX(-8deg);background:' + ACC +
        ';padding:3px 15px 5px;box-shadow:4px 4px 0 rgba(0,0,0,.45);margin-bottom:16px">' +
        '<div style="transform:skewX(8deg);' + BALOO + 'font-size:24px;color:' + INK + '">HOLD ON</div></div>' +
      '<div style="' + LORA + 'font-size:17px;color:rgba(239,230,200,.75);margin-bottom:20px">' + msg + '</div>' +
      '<a href="index.html" style="' + BALOO + 'font-size:15px;letter-spacing:.08em;color:' + INK +
        ';background:' + ACC + ';border:4px solid ' + INK + ';box-shadow:0 5px 0 rgba(0,0,0,.45);' +
        'border-radius:11px;padding:12px 24px;text-decoration:none;display:inline-block">BACK TO TITLE</a>' +
    '</div>';
  document.body.appendChild(root);
}

function storedName(role) {
  // The Headmaster is never named — even if this tab has a leftover name
  // from an earlier Student session, she's just "Headmaster".
  if (role === 'gm') return 'Headmaster';
  const n = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tbp-name')) || '';
  return n || (role === 'spectator' ? 'Spectator' : 'Player');
}

async function enter(role, seat) {
  await Net.join(roomName, role, seat, storedName(role));
  window.__TBPJoinedResolve({ role, seat, room: Net.roomId });
}

function pickStudent(taken, locks) {
  const root = document.createElement('div');
  root.id = 'tbp-gate';
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999', 'background:' + INK,
    'background-image:radial-gradient(rgba(239,230,200,.07) 1.6px, transparent 2px)',
    'background-size:11px 11px', 'display:flex', 'align-items:center',
    'justify-content:center', 'padding:24px', 'overflow:auto'
  ].join(';');

  // A seat that was never locked in during Character Select isn't part of
  // this game at all (e.g. Yumi absent in a 3-player game) — she has no
  // Student to run, so she's shown greyed-out and can't be picked.
  const cards = SEATS.map(function (s, i) {
    const n = taken[i] || 0;
    const inGame = !locks || locks[i];
    const cardStyle = inGame
      ? 'cursor:pointer;background:' + INK + ';border:4px solid ' + s.tone + ';border-radius:13px;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.45)'
      : 'cursor:default;background:' + INK + ';border:4px solid rgba(239,230,200,.2);border-radius:13px;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.45);opacity:.4;filter:grayscale(.9)';
    return '<div class="tbp-seat-pick" data-seat="' + i + '" data-ingame="' + (inGame ? '1' : '0') + '" style="' + cardStyle + '">' +
      '<img src="assets/head-' + s.who + '.png" alt="" style="width:100%;height:104px;object-fit:cover;' +
        'object-position:50% 12%;background:' + s.tone + '">' +
      '<div style="padding:9px 10px 11px">' +
        '<div style="' + BALOO + 'font-size:17px;color:' + s.tone + '">' + s.label + '</div>' +
        '<div style="' + LORA + 'font-size:12.5px;color:rgba(239,230,200,.55)">' +
          (!inGame ? 'not in this game' : (n ? n + ' already playing her' : 'free')) + '</div>' +
      '</div></div>';
  }).join('');

  root.innerHTML =
    '<div style="width:min(760px,96vw);background:#2b2527;border:5px solid ' + INK +
      ';border-radius:18px;box-shadow:12px 12px 0 rgba(0,0,0,.45);padding:26px 28px 30px">' +
      '<div style="display:inline-block;transform:skewX(-8deg);background:' + ACC +
        ';padding:3px 15px 5px;box-shadow:4px 4px 0 rgba(0,0,0,.45);margin-bottom:14px">' +
        '<div style="transform:skewX(8deg);' + BALOO + 'font-size:26px;line-height:1;color:' + INK +
        '">THE EPISODE IS UNDERWAY</div></div>' +
      '<div style="' + LORA + 'font-size:16px;color:rgba(239,230,200,.7);margin-bottom:16px">Room ' +
        '<b style="color:' + ACC + ';font-style:normal">' + Net.normalize(roomName) + '</b>' +
        ' is already in play. Pick the Student you\'ll run — two people may share one, so nothing gets' +
        ' locked by a dead tab.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">' + cards + '</div>' +
      '<div id="tbp-spectate" style="cursor:pointer;display:inline-block;' + BALOO +
        'font-size:16px;letter-spacing:.07em;padding:12px 24px;border-radius:11px;' +
        'color:rgba(239,230,200,.6);border:2px solid rgba(239,230,200,.22)">JUST WATCHING</div>' +
    '</div>';
  document.body.appendChild(root);

  const go = async (role, seat) => {
    root.remove();
    try { await enter(role, seat); } catch (e) { fail(String((e && e.message) || e)); }
  };
  Array.prototype.forEach.call(root.querySelectorAll('.tbp-seat-pick'), function (el) {
    if (el.dataset.ingame !== '1') return;
    el.onclick = function () { go('player', +el.dataset.seat); };
  });
  document.getElementById('tbp-spectate').onclick = function () { go('spectator', null); };
}

(async function () {
  if (!roomName) { fail('No room was given. Head back and pick one from the title screen.'); return; }
  let data = null;
  try { data = await Net.peek(roomName); } catch (e) { /* treat as new */ }

  if (asGm) {
    try { await enter('gm', null); } catch (e) { fail(String((e && e.message) || e)); }
    return;
  }
  if (Net.isStarted(data)) {
    const taken = {};
    Object.values((data && data.players) || {}).forEach(function (p) {
      if (p && p.role === 'player' && p.seat != null) taken[p.seat] = (taken[p.seat] || 0) + 1;
    });
    pickStudent(taken, data && data.locks);
    return;
  }
  // Not started: drop straight into the game's own Character Select and claim
  // a girl there. Seat stays null until openGoalPicker() records the pick.
  try { await enter('player', null); } catch (e) { fail(String((e && e.message) || e)); }
})();
