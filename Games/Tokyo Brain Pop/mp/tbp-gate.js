// Tokyo Brain Pop — session / room gate.
//
// An ADDITION on top of the original project: a full-screen overlay shown
// before play. It never touches the game's own DOM or styling; it sits above
// the game and resolves window.__TBPJoinedResolve once this session has
// picked a room and a role.

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

const root = document.createElement('div');
root.id = 'tbp-gate';
root.style.cssText = [
  'position:fixed', 'inset:0', 'z-index:99999', 'background:' + INK,
  'background-image:radial-gradient(rgba(239,230,200,.07) 1.6px, transparent 2px)',
  'background-size:11px 11px', 'display:flex', 'align-items:center',
  'justify-content:center', 'padding:24px', 'overflow:auto'
].join(';');
document.body.appendChild(root);

function card(inner) {
  return '<div style="width:min(760px,96vw);background:#2b2527;border:5px solid ' + INK +
    ';border-radius:18px;box-shadow:12px 12px 0 rgba(0,0,0,.45);padding:26px 28px 30px">' + inner + '</div>';
}
function banner(text, size) {
  return '<div style="display:inline-block;transform:skewX(-8deg);background:' + ACC +
    ';padding:3px 15px 5px;box-shadow:4px 4px 0 rgba(0,0,0,.45);margin-bottom:14px">' +
    '<div style="transform:skewX(8deg);' + BALOO + 'font-size:' + (size || 26) +
    'px;line-height:1;color:' + INK + '">' + text + '</div></div>';
}
function field(id, placeholder) {
  return '<input id="' + id + '" placeholder="' + placeholder + '" autocomplete="off" ' +
    'style="width:100%;box-sizing:border-box;background:#231F20;border:3px solid rgba(239,230,200,.25);' +
    'border-radius:9px;padding:12px 14px;' + BALOO + 'font-size:18px;color:' + CREAM + ';outline:none">';
}
function button(id, text, ghost) {
  const skin = ghost
    ? 'color:rgba(239,230,200,.6);border:2px solid rgba(239,230,200,.22)'
    : 'color:' + INK + ';background:' + ACC + ';border:4px solid ' + INK + ';box-shadow:0 5px 0 rgba(0,0,0,.45)';
  return '<div id="' + id + '" style="cursor:pointer;user-select:none;' + BALOO +
    'font-size:16px;letter-spacing:.07em;padding:12px 24px;border-radius:11px;text-align:center;' + skin + '">' + text + '</div>';
}
function note(text) {
  return '<div style="' + LORA + 'font-size:15px;color:rgba(239,230,200,.6);margin-top:12px">' + text + '</div>';
}

function screenRoom() {
  root.innerHTML = card(
    banner('TOKYO BRAIN POP!?', 30) +
    '<div style="' + LORA + 'font-size:17px;color:rgba(239,230,200,.72);margin-bottom:18px">' +
      'Everyone at the table types the same room name. Whoever gets there first creates it.</div>' +
    field('tbp-room', 'e.g. class-2a') +
    '<div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">' +
      button('tbp-go', 'ENTER THE ROOM') +
      button('tbp-rooms', 'MANAGE ROOMS', true) +
    '</div>' +
    '<div id="tbp-err" style="' + BALOO + 'font-size:14px;color:#E23A3A;margin-top:12px"></div>'
  );
  const go = function () {
    const raw = document.getElementById('tbp-room').value;
    if (!Net.normalize(raw)) { document.getElementById('tbp-err').textContent = 'Type a room name first.'; return; }
    screenRole(raw);
  };
  document.getElementById('tbp-go').onclick = go;
  document.getElementById('tbp-room').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  document.getElementById('tbp-rooms').onclick = screenRooms;
  document.getElementById('tbp-room').focus();
}

async function screenRole(roomName) {
  root.innerHTML = card(banner('WHO ARE YOU?', 26) +
    '<div style="' + LORA + 'color:' + CREAM + '">Looking up the room…</div>');

  let existing = null;
  try { existing = await Net.peek(roomName); } catch (e) { /* new room */ }
  const taken = {};
  const players = (existing && existing.players) || {};
  Object.keys(players).forEach(function (k) {
    const p = players[k];
    if (p && p.role === 'player' && p.seat != null) taken[p.seat] = (taken[p.seat] || 0) + 1;
  });

  const seatCards = SEATS.map(function (s, i) {
    const n = taken[i] || 0;
    return '<div class="tbp-seat-pick" data-seat="' + i + '" style="cursor:pointer;background:' + INK +
      ';border:4px solid ' + s.tone + ';border-radius:13px;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.45)">' +
      '<img src="assets/head-' + s.who + '.png" alt="" style="width:100%;height:104px;object-fit:cover;' +
        'object-position:50% 12%;background:' + s.tone + '">' +
      '<div style="padding:9px 10px 11px">' +
        '<div style="' + BALOO + 'font-size:17px;color:' + s.tone + '">' + s.label + '</div>' +
        '<div style="' + LORA + 'font-size:12.5px;color:rgba(239,230,200,.55)">' +
          (n ? n + ' already playing her' : 'free') + '</div>' +
      '</div></div>';
  }).join('');

  root.innerHTML = card(
    banner('WHO ARE YOU?', 26) +
    '<div style="' + LORA + 'font-size:16px;color:rgba(239,230,200,.7);margin-bottom:16px">Room: ' +
      '<b style="color:' + ACC + ';font-style:normal">' + Net.normalize(roomName) + '</b>' +
      ' — two people may share a Student, so nothing ever gets locked by a dead tab.</div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">' + seatCards + '</div>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      button('tbp-as-gm', 'PLAY AS HEADMASTER') +
      button('tbp-as-spec', 'JUST WATCHING', true) +
      button('tbp-back', 'BACK', true) +
    '</div>' +
    note('The Headmaster runs Scene Control and the New Game setup. Students only ever get their own girl.')
  );

  async function enter(role, seat) {
    root.innerHTML = card(banner('JOINING…', 24));
    try {
      await Net.join(roomName, role, seat, null);
      window.__TBPJoinedResolve({ role: role, seat: seat, room: Net.roomId });
      root.remove();
    } catch (e) {
      root.innerHTML = card(banner('COULDN&rsquo;T JOIN', 24) +
        note(String((e && e.message) || e)) +
        '<div style="margin-top:16px">' + button('tbp-retry', 'TRY AGAIN') + '</div>');
      document.getElementById('tbp-retry').onclick = screenRoom;
    }
  }

  Array.prototype.forEach.call(root.querySelectorAll('.tbp-seat-pick'), function (el) {
    el.onclick = function () { enter('player', +el.dataset.seat); };
  });
  document.getElementById('tbp-as-gm').onclick = function () { enter('gm', null); };
  document.getElementById('tbp-as-spec').onclick = function () { enter('spectator', null); };
  document.getElementById('tbp-back').onclick = screenRoom;
}

function screenRooms() {
  let stop = null;
  root.innerHTML = card(banner('ROOMS', 26) +
    '<div id="tbp-rows" style="color:' + CREAM + '">Loading…</div>' +
    '<div style="margin-top:18px">' + button('tbp-back2', 'BACK', true) + '</div>');
  document.getElementById('tbp-back2').onclick = function () { if (stop) stop(); screenRoom(); };
  stop = Net.listRooms(function (rows) {
    const host = document.getElementById('tbp-rows');
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(function (r) {
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(239,230,200,.14)">' +
        '<div style="flex:1">' +
          '<div style="' + BALOO + 'font-size:16px;color:' + CREAM + '">' + r.id + '</div>' +
          '<div style="' + LORA + 'font-size:13px;color:rgba(239,230,200,.5)">' + r.players +
            ' in room &middot; ' + (r.started ? 'in play' : 'not started') + '</div>' +
        '</div>' +
        '<div class="tbp-del" data-id="' + r.id + '" style="cursor:pointer;' + BALOO +
          'font-size:13px;letter-spacing:.08em;color:#EFE6C8;background:#B4322C;border:3px solid ' + INK +
          ';border-radius:8px;padding:7px 12px">DELETE</div>' +
      '</div>';
    }).join('') : '<div style="' + LORA + 'color:rgba(239,230,200,.55)">No rooms yet.</div>';
    Array.prototype.forEach.call(host.querySelectorAll('.tbp-del'), function (b) {
      b.onclick = function () {
        if (confirm('Delete room "' + b.dataset.id + '"? This wipes its game state for everyone.')) Net.deleteRoom(b.dataset.id);
      };
    });
  });
}

screenRoom();
