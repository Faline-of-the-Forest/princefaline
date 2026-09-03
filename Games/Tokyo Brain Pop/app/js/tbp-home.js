// Tokyo Brain Pop — title screen wiring.
//
// The title screen itself is used exactly as designed. This only gives its
// three buttons somewhere to go, and adds the one thing the design has no
// field for: typing a room name (and the Headmaster's code). Those panels are
// drawn in the title screen's own language — Anton / DotGothic16, #EEE41B on
// #100D0B with the red accent and hard offset shadows.

import { RULES } from './tbp-rules.js';

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
    // The wide letter-spacing suits typed-in digits but stretches the
    // placeholder into unreadable mush, so the hint text keeps normal spacing.
    '<style>#tbp-gate-panel input::placeholder{letter-spacing:.02em;font-size:22px;opacity:.55}</style>' +
    '<div id="tbp-gate-panel" style="width:min(620px,94vw);background:' + YEL + ';border:6px solid ' + INK +
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
  // picks a Student and never gives a name — she's just "Headmaster" — but
  // she can see the roster and remove people from it.
  // No more naming a room — she's handed a fresh 4-digit code that's shown
  // on-screen for the rest of the session so she can pass it to everyone
  // joining. No inputs needed, so this is its own tiny panel rather than the
  // shared field-based one.
  createRoom() {
    close();
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(16,13,11,.82);' +
      'display:flex;align-items:center;justify-content:center;padding:24px;' + "font-family:'Zen Kaku Gothic New',system-ui,sans-serif";
    host.innerHTML =
      '<div style="width:min(460px,94vw);background:' + YEL + ';border:6px solid ' + INK +
        ';box-shadow:18px 18px 0 ' + RED + ';padding:30px 32px 32px;transform:rotate(-.6deg)">' +
        '<div style="' + DOT + 'font-size:15px;letter-spacing:.2em;color:' + RED + '">ルーム作成 / NEW CELL</div>' +
        '<div style="' + ANTON + 'font-size:44px;line-height:1;letter-spacing:.02em;text-transform:uppercase;' +
          'color:' + INK + ';margin:6px 0 18px">Opening Room…</div>' +
        '<div id="tbp-msg" style="' + DOT + 'font-size:15px;letter-spacing:.12em;color:' + RED + ';min-height:20px"></div>' +
        '<div id="tbp-cancel" style="display:none;cursor:pointer;margin-top:14px;' + ANTON + 'font-size:26px;letter-spacing:.06em;' +
          'text-transform:uppercase;background:transparent;color:' + INK + ';padding:12px 24px;' +
          'border:4px solid ' + INK + ';display:inline-block">Back</div>' +
      '</div>';
    document.body.appendChild(host);
    const msg = host.querySelector('#tbp-msg');
    const cancel = host.querySelector('#tbp-cancel');
    cancel.onclick = close;
    (async () => {
      try {
        const code = await Net.createRoom();
        location.href = 'play.html?room=' + encodeURIComponent(code) + '&gm=1';
      } catch (e) {
        msg.style.color = RED;
        msg.textContent = String((e && e.message) || e).toUpperCase();
        cancel.style.display = 'inline-block';
      }
    })();
  },

  joinRoom() {
    panel({
      tag: '参加 / EXISTING CELL', title: 'Join Room',
      fields: [{ id: 'room', placeholder: 'room code', numeric: true }, { id: 'name', placeholder: 'your name' }],
      confirm: 'Join', onConfirm: async ([roomRaw, nameRaw], msg) => {
        const id = Net.normalize(roomRaw);
        if (!id) { msg.textContent = 'ENTER THE ROOM CODE.'; return; }
        const name = String(nameRaw || '').trim();
        if (!name) { msg.textContent = 'ENTER YOUR NAME.'; return; }
        busy(msg, 'LOOKING…');
        const existing = await Net.peek(id);
        if (!existing) { msg.style.color = RED; msg.textContent = 'NO ROOM WITH THAT CODE.'; return; }
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
  },

  // Standalone Rulebook — no room/session needed, so it opens right on the
  // title screen instead of routing through play.html's join gate.
  rulebook() {
    close();
    const ACC = '#EDE31B', BG = '#231F20', CREAM = '#EFE6C8', PINK = '#F6A7CA';
    const BALOO = "font-family:'Baloo 2',sans-serif;font-weight:800;";
    const LORA = "font-family:'Lora',serif;";
    let tab = 0;

    host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(16,13,11,.82);' +
      'display:flex;align-items:center;justify-content:center;padding:24px';
    host.onclick = close;

    const renderBlock = (b) => {
      if (b.t === 'h') return '<div style="' + BALOO + 'font-size:20px;letter-spacing:.04em;line-height:1.2;color:' + PINK + ';margin:22px 0 8px">' + b.text + '</div>';
      if (b.t === 'p') return '<div style="' + LORA + 'font-size:17px;line-height:1.55;color:' + CREAM + ';margin-bottom:12px">' + b.text + '</div>';
      if (b.t === 'li') return '<div style="display:flex;gap:11px;margin-bottom:8px;padding-left:4px">' +
        '<div style="flex:none;width:8px;height:8px;margin-top:8px;border-radius:2px;background:' + ACC + ';transform:rotate(45deg)"></div>' +
        '<div style="' + LORA + 'font-size:16.5px;line-height:1.5;color:' + CREAM + '">' + b.text + '</div></div>';
      if (b.t === 'table') {
        const head = b.headers.map(h => '<div style="' + BALOO + 'font-size:13px;letter-spacing:.04em;color:' + ACC + ';padding:8px 10px">' + h + '</div>').join('');
        const rows = b.rows.map(r => '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(239,230,200,.12)">' +
          r.map(c => '<div style="' + LORA + 'font-size:14px;color:' + CREAM + ';padding:6px 10px">' + c + '</div>').join('') + '</div>').join('');
        return '<div style="margin-bottom:16px;border:1px solid rgba(239,230,200,.25);border-radius:8px;overflow:hidden">' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);background:rgba(239,230,200,.12)">' + head + '</div>' + rows + '</div>';
      }
      return '';
    };

    const paint = () => {
      const tabsHtml = RULES.map((r, i) =>
        '<div class="tbp-rb-tab" data-i="' + i + '" style="cursor:pointer;' + BALOO + 'font-size:16px;letter-spacing:.02em;line-height:1.1;' +
        'color:' + (i === tab ? BG : CREAM) + ';background:' + (i === tab ? ACC : 'transparent') +
        ';border-radius:10px;padding:12px 15px">' + r.label + '</div>'
      ).join('');
      const blocksHtml = RULES[tab].blocks.map(renderBlock).join('');
      host.innerHTML =
        '<div style="width:min(1000px,92vw);height:min(760px,88vh);box-sizing:border-box;background:' + BG +
          ';border:5px solid ' + BG + ';border-radius:20px;box-shadow:12px 12px 0 rgba(35,31,32,.4);display:flex;flex-direction:column;overflow:hidden" id="tbp-rb-box">' +
          '<div style="flex:none;display:flex;align-items:center;gap:14px;padding:16px 22px;background:' + ACC + ';border-bottom:5px solid ' + BG + '">' +
            '<div style="flex:1;' + BALOO + 'font-size:30px;line-height:1;letter-spacing:.01em;color:' + BG + '">Rulebook</div>' +
            '<div id="tbp-rb-close" style="cursor:pointer;' + BALOO + 'font-size:15px;letter-spacing:.08em;color:' + ACC +
              ';background:' + BG + ';border-radius:10px;padding:10px 22px;line-height:1;box-shadow:4px 4px 0 rgba(35,31,32,.3)">CLOSE</div>' +
          '</div>' +
          '<div style="flex:1;min-height:0;display:flex">' +
            '<div style="flex:none;width:224px;box-sizing:border-box;background:#2f2a2b;border-right:5px solid ' + BG + ';padding:14px 12px;display:flex;flex-direction:column;gap:6px;overflow-y:auto">' + tabsHtml + '</div>' +
            '<div style="flex:1;min-width:0;overflow-y:auto;padding:26px 34px 40px">' +
              '<div style="' + BALOO + 'font-size:34px;line-height:1.05;color:' + ACC + ';margin-bottom:16px">' + RULES[tab].title + '</div>' +
              blocksHtml +
            '</div>' +
          '</div>' +
        '</div>';
      host.querySelector('#tbp-rb-box').onclick = (e) => e.stopPropagation();
      host.querySelector('#tbp-rb-close').onclick = close;
      Array.prototype.forEach.call(host.querySelectorAll('.tbp-rb-tab'), (el) => {
        el.onclick = () => { tab = +el.dataset.i; paint(); };
      });
    };
    paint();
    document.body.appendChild(host);
  }
};

window.TBPHome = TBPHome;
