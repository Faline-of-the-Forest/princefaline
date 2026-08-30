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

// opts.fields: [{id, placeholder, numeric}] — one input per field, in order.
// Defaults to a single field (opts.placeholder / opts.numeric) so callers that
// only ever needed one box don't have to change.
function panel(opts) {
  close();
  const fields = opts.fields || [{ id: 'main', placeholder: opts.placeholder, numeric: opts.numeric }];
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(16,13,11,.82);' +
    'display:flex;align-items:center;justify-content:center;padding:24px;' +
    "font-family:'Zen Kaku Gothic New',system-ui,sans-serif";
  const inputsHtml = fields.map((f, i) =>
    '<input id="tbp-in-' + i + '" autocomplete="off" ' + (f.numeric ? 'inputmode="numeric" maxlength="4" ' : '') +
      'placeholder="' + f.placeholder + '" style="width:100%;box-sizing:border-box;background:' + PAPER +
      ';border:5px solid ' + INK + ';padding:14px 16px;' + ANTON + 'font-size:' + (f.numeric ? '30px' : '24px') +
      ';letter-spacing:' + (f.numeric ? '.34em' : '.02em') + ';color:' + INK + ';outline:none;' +
      (i > 0 ? 'margin-top:12px;' : '') + '">'
  ).join('');
  host.innerHTML =
    '<div style="width:min(620px,94vw);background:' + YEL + ';border:6px solid ' + INK +
      ';box-shadow:18px 18px 0 ' + RED + ';padding:30px 32px 32px;transform:rotate(-.6deg)">' +
      '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">' + opts.tag + '</div>' +
      '<div style="' + ANTON + 'font-size:52px;line-height:1;letter-spacing:.02em;text-transform:uppercase;' +
        'color:' + INK + ';margin:6px 0 18px">' + opts.title + '</div>' +
      inputsHtml +
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

  const inputs = fields.map((f, i) => host.querySelector('#tbp-in-' + i));
  const msg = host.querySelector('#tbp-msg');
  const submit = async () => {
    msg.textContent = '';
    try { await opts.onConfirm(inputs.map(el => el.value), msg); }
    catch (e) { msg.textContent = String((e && e.message) || e).toUpperCase(); }
  };
  host.querySelector('#tbp-ok').onclick = submit;
  host.querySelector('#tbp-cancel').onclick = close;
  inputs.forEach((input, i) => {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { if (i === inputs.length - 1) submit(); else inputs[i + 1].focus(); }
      if (e.key === 'Escape') close();
      e.stopPropagation();        // the title screen listens for arrows/Enter
    };
  });
  inputs[0].focus();
}

function busy(msg, text) { msg.style.color = INK; msg.textContent = text; }

export const TBPHome = {
  // Whoever creates a room is its Headmaster (admin) for that room: she never
  // picks a Student, but she can see the roster and remove people from it.
  createRoom() {
    panel({
      tag: 'ルーム作成 / NEW CELL', title: 'Create Room',
      fields: [{ id: 'room', placeholder: 'room name' }, { id: 'name', placeholder: 'your name (Headmaster)' }],
      confirm: 'Open', onConfirm: async ([roomRaw, nameRaw], msg) => {
        const id = Net.normalize(roomRaw);
        if (!id) { msg.textContent = 'TYPE A ROOM NAME.'; return; }
        const name = String(nameRaw || '').trim();
        if (!name) { msg.textContent = 'ENTER YOUR NAME.'; return; }
        busy(msg, 'OPENING…');
        const existing = await Net.peek(id);
        if (existing) { msg.style.color = RED; msg.textContent = 'THAT ROOM EXISTS — USE JOIN.'; return; }
        sessionStorage.setItem('tbp-name', name);
        location.href = 'play.html?room=' + encodeURIComponent(id) + '&gm=1';
      }
    });
  },

  joinRoom() {
    panel({
      tag: '参加 / EXISTING CELL', title: 'Join Room',
      fields: [{ id: 'room', placeholder: 'room name' }, { id: 'name', placeholder: 'your name' }],
      confirm: 'Join', onConfirm: async ([roomRaw, nameRaw], msg) => {
        const id = Net.normalize(roomRaw);
        if (!id) { msg.textContent = 'TYPE A ROOM NAME.'; return; }
        const name = String(nameRaw || '').trim();
        if (!name) { msg.textContent = 'ENTER YOUR NAME.'; return; }
        busy(msg, 'LOOKING…');
        const existing = await Net.peek(id);
        if (!existing) { msg.style.color = RED; msg.textContent = 'NO ROOM BY THAT NAME.'; return; }
        sessionStorage.setItem('tbp-name', name);
        location.href = 'play.html?room=' + encodeURIComponent(id);
      }
    });
  },

  headmaster() {
    panel({
      tag: '校長室 / RESTRICTED', title: 'Headmaster', placeholder: '••••', numeric: true,
      confirm: 'Enter', onConfirm: async ([raw], msg) => {
        if (String(raw).trim() !== HM_CODE) { msg.textContent = 'WRONG CODE.'; return; }
        sessionStorage.setItem('tbp-hm', '1');
        location.href = 'rooms.html';
      }
    });
  }
};

window.TBPHome = TBPHome;
