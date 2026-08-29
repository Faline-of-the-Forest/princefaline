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

function header() {
  return '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px">' +
    '<div>' +
      '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">校長室 / BACK OFFICE</div>' +
      '<div style="' + ANTON + 'font-size:62px;line-height:1;letter-spacing:.02em;text-transform:uppercase">Rooms</div>' +
    '</div>' +
    '<a href="index.html" style="' + ANTON + 'font-size:22px;letter-spacing:.06em;text-transform:uppercase;' +
      'text-decoration:none;background:' + INK + ';color:' + YEL + ';padding:11px 24px;box-shadow:7px 7px 0 ' + RED + '">Title</a>' +
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
  shell(header() + '<div id="rows"></div>');
  Net.listRooms(function (rows) {
    const host = document.getElementById('rows');
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(function (r) {
      return '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:' + PAPER +
        ';border:5px solid ' + INK + ';box-shadow:9px 9px 0 ' + INK + ';padding:16px 20px;margin-bottom:16px">' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="' + ANTON + 'font-size:30px;line-height:1;text-transform:uppercase">' + r.id + '</div>' +
          '<div style="' + DOT + 'font-size:14px;letter-spacing:.14em;color:' + RED + ';margin-top:6px">' +
            r.players + ' IN ROOM · ' + (r.started ? 'IN PLAY' : 'NOT STARTED') + '</div>' +
        '</div>' +
        '<a href="play.html?room=' + encodeURIComponent(r.id) + '&gm=1" style="' + ANTON + 'font-size:20px;' +
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

if (sessionStorage.getItem('tbp-hm') === '1') list(); else gate();
