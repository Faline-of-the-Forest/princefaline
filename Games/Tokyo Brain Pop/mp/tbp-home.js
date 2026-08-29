// Tokyo Brain Pop — title screen wiring.
//
// The title screen itself is used exactly as designed. This only gives its
// three buttons somewhere to go, and adds the one thing the design has no
// field for: typing a room name (and the Headmaster's code). Those panels are
// drawn in the title screen's own language — Anton / DotGothic16, #EEE41B on
// #100D0B with the red accent and hard offset shadows.

const Net = await window.__TBPNetReady;

const YEL = '#EEE41B', INK = '#100D0B', RED = '#D2232A', PAPER = '#FFFDF0';
const ANTON = "font-family:'Anton',sans-serif;";
const DOT = "font-family:'DotGothic16',monospace;";
export const HM_CODE = '4287';

let host = null;
function close() { if (host) { host.remove(); host = null; } }

function panel(opts) {
  close();
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(16,13,11,.82);' +
    'display:flex;align-items:center;justify-content:center;padding:24px;' +
    "font-family:'Zen Kaku Gothic New',system-ui,sans-serif";
  host.innerHTML =
    '<div style="width:min(620px,94vw);background:' + YEL + ';border:6px solid ' + INK +
      ';box-shadow:18px 18px 0 ' + RED + ';padding:30px 32px 32px;transform:rotate(-.6deg)">' +
      '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">' + opts.tag + '</div>' +
      '<div style="' + ANTON + 'font-size:52px;line-height:1;letter-spacing:.02em;text-transform:uppercase;' +
        'color:' + INK + ';margin:6px 0 18px">' + opts.title + '</div>' +
      '<input id="tbp-in" autocomplete="off" ' + (opts.numeric ? 'inputmode="numeric" maxlength="4" ' : '') +
        'placeholder="' + opts.placeholder + '" style="width:100%;box-sizing:border-box;background:' + PAPER +
        ';border:5px solid ' + INK + ';padding:14px 16px;' + ANTON + 'font-size:30px;letter-spacing:' +
        (opts.numeric ? '.34em' : '.02em') + ';color:' + INK + ';outline:none">' +
      '<div id="tbp-msg" style="' + DOT + 'font-size:15px;letter-spacing:.12em;color:' + RED +
        ';min-height:20px;margin-top:10px"></div>' +
      '<div style="display:flex;gap:12px;margin-top:14px">' +
        '<div id="tbp-ok" style="cursor:pointer;' + ANTON + 'font-size:26px;letter-spacing:.06em;' +
          'text-transform:uppercase;background:' + INK + ';color:' + YEL + ';padding:12px 30px;' +
          'box-shadow:7px 7px 0 ' + RED + '">' + opts.confirm + '</div>' +
        '<div id="tbp-cancel" style="cursor:pointer;' + ANTON + 'font-size:26px;letter-spacing:.06em;' +
          'text-transform:uppercase;background:transparent;color:' + INK + ';padding:12px 24px;' +
          'border:4px solid ' + INK + '">Back</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(host);

  const input = host.querySelector('#tbp-in');
  const msg = host.querySelector('#tbp-msg');
  const submit = async () => {
    msg.textContent = '';
    try { await opts.onConfirm(input.value, msg); }
    catch (e) { msg.textContent = String((e && e.message) || e).toUpperCase(); }
  };
  host.querySelector('#tbp-ok').onclick = submit;
  host.querySelector('#tbp-cancel').onclick = close;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
    e.stopPropagation();          // the title screen listens for arrows/Enter
  };
  input.focus();
}

function busy(msg, text) { msg.style.color = INK; msg.textContent = text; }

export const TBPHome = {
  createRoom() {
    panel({
      tag: 'ルーム作成 / NEW CELL', title: 'Create Room', placeholder: 'room name',
      confirm: 'Open', onConfirm: async (raw, msg) => {
        const id = Net.normalize(raw);
        if (!id) { msg.textContent = 'TYPE A ROOM NAME.'; return; }
        busy(msg, 'OPENING…');
        const existing = await Net.peek(id);
        if (existing) { msg.style.color = RED; msg.textContent = 'THAT ROOM EXISTS — USE JOIN.'; return; }
        location.href = 'play.html?room=' + encodeURIComponent(id);
      }
    });
  },

  joinRoom() {
    panel({
      tag: '参加 / EXISTING CELL', title: 'Join Room', placeholder: 'room name',
      confirm: 'Join', onConfirm: async (raw, msg) => {
        const id = Net.normalize(raw);
        if (!id) { msg.textContent = 'TYPE A ROOM NAME.'; return; }
        busy(msg, 'LOOKING…');
        const existing = await Net.peek(id);
        if (!existing) { msg.style.color = RED; msg.textContent = 'NO ROOM BY THAT NAME.'; return; }
        location.href = 'play.html?room=' + encodeURIComponent(id);
      }
    });
  },

  headmaster() {
    panel({
      tag: '校長室 / RESTRICTED', title: 'Headmaster', placeholder: '••••', numeric: true,
      confirm: 'Enter', onConfirm: async (raw, msg) => {
        if (String(raw).trim() !== HM_CODE) { msg.textContent = 'WRONG CODE.'; return; }
        sessionStorage.setItem('tbp-hm', '1');
        location.href = 'rooms.html';
      }
    });
  }
};

window.TBPHome = TBPHome;
