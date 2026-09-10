// Tokyo Brain Pop — the Headmaster's back office.
//
// Reached only from the title screen after the code. Lists every room, lets her
// drop into one with Scene Control, and delete rooms outright. Drawn in the
// title screen's language.

const Net = await window.__TBPNetReady;

const YEL = '#EEE41B', INK = '#100D0B', RED = '#D2232A', PAPER = '#FFFDF0';
const ANTON = "font-family:'Anton',sans-serif;";
const DOT = "font-family:'DotGothic16',monospace;";
const HM_CODE = '4287';

const app = document.getElementById('app');

function shell(inner) {
  app.innerHTML =
    '<div style="min-height:100vh;box-sizing:border-box;background:' + YEL + ';padding:46px 32px 60px;' +
      "font-family:'Zen Kaku Gothic New',system-ui,sans-serif;color:" + INK + '">' +
      '<div style="max-width:900px;margin:0 auto">' + inner + '</div></div>';
}

function header(extra) {
  return '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px">' +
    '<div>' +
      '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">校長室 / BACK OFFICE</div>' +
      '<div style="' + ANTON + 'font-size:62px;line-height:1;letter-spacing:.02em;text-transform:uppercase">Rooms</div>' +
    '</div>' +
    '<div style="display:flex;gap:12px;align-items:center">' +
      (extra || '') +
      '<a href="index.html" style="' + ANTON + 'font-size:22px;letter-spacing:.06em;text-transform:uppercase;' +
        'text-decoration:none;background:' + INK + ';color:' + YEL + ';padding:11px 24px;box-shadow:7px 7px 0 ' + RED + '">Title</a>' +
    '</div>' +
  '</div>';
}

function gate() {
  shell(header() +
    '<div style="background:' + PAPER + ';border:5px solid ' + INK + ';box-shadow:11px 11px 0 ' + INK +
      ';padding:24px 26px 28px;max-width:520px">' +
      '<div style="' + DOT + 'font-size:15px;letter-spacing:.18em;color:' + RED + '">RESTRICTED</div>' +
      '<div style="' + ANTON + 'font-size:34px;line-height:1.05;text-transform:uppercase;margin:4px 0 16px">Enter the code</div>' +
      '<input id="c" inputmode="numeric" maxlength="4" placeholder="••••" style="width:100%;box-sizing:border-box;' +
        'background:#fff;border:5px solid ' + INK + ';padding:14px 16px;' + ANTON + 'font-size:30px;letter-spacing:.34em;outline:none">' +
      '<div id="m" style="' + DOT + 'font-size:15px;letter-spacing:.12em;color:' + RED + ';min-height:20px;margin-top:10px"></div>' +
      '<div id="go" style="cursor:pointer;display:inline-block;' + ANTON + 'font-size:26px;letter-spacing:.06em;' +
        'text-transform:uppercase;background:' + INK + ';color:' + YEL + ';padding:12px 30px;box-shadow:7px 7px 0 ' + RED + ';margin-top:6px">Enter</div>' +
    '</div>');
  const i = document.getElementById('c');
  const submit = () => {
    if (i.value.trim() === HM_CODE) { sessionStorage.setItem('tbp-hm', '1'); list(); }
    else document.getElementById('m').textContent = 'WRONG CODE.';
  };
  document.getElementById('go').onclick = submit;
  i.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  i.focus();
}

function list() {
  shell(header(
    '<div id="demo" style="cursor:pointer;' + ANTON + 'font-size:22px;letter-spacing:.06em;text-transform:uppercase;' +
      'background:' + RED + ';color:#fff;padding:11px 24px;box-shadow:7px 7px 0 ' + INK + '">Demo Room</div>'
  ) + '<div id="rows"></div>');
  document.getElementById('demo').onclick = demoPanel;
  Net.listRooms(function (rows) {
    const host = document.getElementById('rows');
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(function (r) {
      return '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:' + PAPER +
        ';border:5px solid ' + INK + ';box-shadow:9px 9px 0 ' + INK + ';padding:16px 20px;margin-bottom:16px">' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="' + ANTON + 'font-size:30px;line-height:1;text-transform:uppercase">' + r.id + '</div>' +
          '<div style="' + DOT + 'font-size:14px;letter-spacing:.14em;color:' + RED + ';margin-top:6px">' +
            (r.demo ? '<span style="background:' + RED + ';color:#fff;padding:1px 7px;margin-right:8px">DEMO</span>' : '') +
            r.players + ' IN ROOM · ' + (r.started ? 'IN PLAY' : 'NOT STARTED') + '</div>' +
        '</div>' +
        '<a href="play.html?room=' + encodeURIComponent(r.id) + '&gm=1' + (r.demo ? '&demo=1' : '') + '" style="' + ANTON + 'font-size:20px;' +
          'letter-spacing:.06em;text-transform:uppercase;text-decoration:none;background:' + INK + ';color:' + YEL +
          ';padding:11px 22px;box-shadow:6px 6px 0 ' + RED + '">Run it</a>' +
        '<div class="del" data-id="' + r.id + '" style="cursor:pointer;' + ANTON + 'font-size:20px;letter-spacing:.06em;' +
          'text-transform:uppercase;background:' + RED + ';color:#fff;padding:11px 22px;box-shadow:6px 6px 0 ' + INK + '">Delete</div>' +
      '</div>';
    }).join('') :
      '<div style="' + DOT + 'font-size:16px;letter-spacing:.14em">NO ROOMS YET.</div>';
    Array.prototype.forEach.call(host.querySelectorAll('.del'), function (b) {
      b.onclick = function () {
        if (confirm('Delete room "' + b.dataset.id + '"? This wipes its game state for everyone.')) Net.deleteRoom(b.dataset.id);
      };
    });
  });
}

// The four Students, in seat order — mirrored from play.html's SEATS so the
// Demo Room picker can show the same faces without loading the game.
const DEMO_SEATS = [
  { label: 'HIROMI', who: 'momo',     tone: '#F6A7CA' },
  { label: 'KOTORI', who: 'midori',   tone: '#9CB39A' },
  { label: 'UME',    who: 'ao',       tone: '#A9BEDC' },
  { label: 'YUMI',   who: 'murasaki', tone: '#C8A8D8' }
];

// A sandbox room: it opens straight at a fully set-up table (no Character
// Select) and carries a viewpoint switcher, so one person can flip between the
// Headmaster and each Student and see exactly what that seat sees. The choice
// made here is which girls are in the game — three or all four, and which
// three, since a 3-player game re-rolls everyone's Best Friend and Rival.
function demoPanel() {
  let picked = [0, 1, 2, 3];

  const prior = document.getElementById('tbp-demo-panel');
  if (prior) prior.remove();
  const host = document.createElement('div');
  host.id = 'tbp-demo-panel';
  host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(16,13,11,.82);' +
    'display:flex;align-items:center;justify-content:center;padding:24px;' +
    "font-family:'Zen Kaku Gothic New',system-ui,sans-serif";
  const close = () => host.remove();
  host.onclick = (e) => { if (e.target === host) close(); };

  const paint = () => {
    const ok = picked.length === 3 || picked.length === 4;
    const cards = DEMO_SEATS.map(function (s, i) {
      const on = picked.indexOf(i) >= 0;
      return '<div class="pick" data-i="' + i + '" style="cursor:pointer;border:5px solid ' + INK +
        ';background:' + (on ? s.tone : '#d9d4c4') + ';box-shadow:' + (on ? '6px 6px 0 ' + INK : 'none') +
        ';opacity:' + (on ? '1' : '.55') + ';filter:' + (on ? 'none' : 'grayscale(.85)') +
        ';transform:translate(' + (on ? '0,0' : '3px,3px') + ');transition:all .12s">' +
        '<img src="assets/head-' + s.who + '.png" alt="" style="display:block;width:100%;height:88px;' +
          'object-fit:cover;object-position:50% 12%">' +
        '<div style="' + ANTON + 'font-size:19px;letter-spacing:.04em;text-align:center;padding:7px 4px 9px;' +
          'color:' + INK + '">' + s.label + '</div></div>';
    }).join('');

    host.innerHTML =
      '<div id="box" style="width:min(560px,94vw);background:' + YEL + ';border:6px solid ' + INK +
        ';box-shadow:18px 18px 0 ' + RED + ';padding:30px 32px 32px;transform:rotate(-.6deg)">' +
        '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">試運転 / SANDBOX</div>' +
        '<div style="' + ANTON + 'font-size:46px;line-height:1;letter-spacing:.02em;text-transform:uppercase;' +
          'color:' + INK + ';margin:6px 0 10px">Demo Room</div>' +
        '<div style="' + DOT + 'font-size:14px;letter-spacing:.1em;line-height:1.6;color:' + INK +
          ';opacity:.75;margin-bottom:18px">PICK WHO IS PLAYING — 3 OR ALL 4.<br>' +
          'OPENS AT A READY TABLE. SWAP SEATS FROM THE BAR AT THE BOTTOM.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' + cards + '</div>' +
        '<div id="m" style="' + DOT + 'font-size:14px;letter-spacing:.12em;color:' + RED +
          ';min-height:20px;margin-top:14px">' + (ok ? '' : 'PICK 3 OR 4 STUDENTS.') + '</div>' +
        '<div style="display:flex;gap:12px;margin-top:8px">' +
          '<div id="go" style="cursor:' + (ok ? 'pointer' : 'not-allowed') + ';' + ANTON + 'font-size:26px;' +
            'letter-spacing:.06em;text-transform:uppercase;background:' + INK + ';color:' + YEL +
            ';padding:12px 30px;box-shadow:7px 7px 0 ' + RED + ';opacity:' + (ok ? '1' : '.45') + '">Open</div>' +
          '<div id="back" style="cursor:pointer;' + ANTON + 'font-size:26px;letter-spacing:.06em;' +
            'text-transform:uppercase;background:transparent;color:' + INK + ';padding:12px 24px;' +
            'border:4px solid ' + INK + '">Back</div>' +
        '</div>' +
      '</div>';

    host.querySelector('#box').onclick = (e) => e.stopPropagation();
    host.querySelector('#back').onclick = close;
    Array.prototype.forEach.call(host.querySelectorAll('.pick'), function (el) {
      el.onclick = function () {
        const i = +el.dataset.i, at = picked.indexOf(i);
        if (at >= 0) picked.splice(at, 1); else picked.push(i);
        picked.sort(function (a, b) { return a - b; });
        paint();
      };
    });
    host.querySelector('#go').onclick = async function () {
      if (!ok) return;
      const m = host.querySelector('#m');
      m.style.color = INK;
      m.textContent = 'OPENING…';
      try {
        const code = await Net.createRoom('Headmaster', { demo: true, demoSeats: picked });
        location.href = 'play.html?room=' + encodeURIComponent(code) + '&gm=1&demo=1&seats=' + picked.join(',');
      } catch (e) {
        m.style.color = RED;
        m.textContent = String((e && e.message) || e).toUpperCase();
      }
    };
  };

  paint();
  document.body.appendChild(host);
}

if (sessionStorage.getItem('tbp-hm') === '1') list(); else gate();
