/* Rebuilds Games/Tokyo Brain Pop/app/ from the original bundled artifact.
 *
 * The standalone export is a self-unpacking 18MB HTML file: one JSON manifest of
 * base64 assets, one JSON string holding the real HTML template, and a uuid->path
 * map. This script turns that back into an ordinary static site — the SAME
 * template, the SAME dc-runtime, the SAME logic class, the SAME art and fonts —
 * and then layers the multiplayer additions from mp/ on top.
 *
 * Nothing in the original markup, CSS or game logic is rewritten. The only edits
 * to the shipped template are:
 *   1. uuid references -> real relative file paths
 *   2. the logic class declaration renamed so mp/component-mp.js can subclass it
 *   3. added <title>, favicon and the script tags for the network layer + gate
 *
 * The title screen in "title screen/" gets the same treatment (its support.js is
 * byte-identical to the game's dc-runtime, so they share one copy).
 *
 * Emits three pages:
 *   index.html  the title screen — Create Room / Join Room / Headmaster
 *   play.html   the game itself
 *   rooms.html  the Headmaster's back office, behind the code
 *
 * Run: node unpack.js
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const SRC = 'Tokyo Brain Pop - Table Screen (standalone).html';
const OUT = 'app';
const html = fs.readFileSync(SRC, 'utf8');

// indexOf, not regex: the file is 18MB and a lazy regex backtracks forever on it.
function grab(kind) {
  const open = '<script type="__bundler/' + kind + '">';
  const s = html.indexOf(open);
  if (s < 0) return null;
  return html.slice(s + open.length, html.indexOf('</script>', s));
}
const manifest = JSON.parse(grab('manifest'));
const ext = JSON.parse(grab('ext_resources'));
let template = JSON.parse(grab('template'));

fs.rmSync(OUT, { recursive: true, force: true });
['', 'assets', 'uploads', 'fonts', 'vendor', 'js'].forEach(d =>
  fs.mkdirSync(path.join(OUT, d), { recursive: true }));

function bytesFor(uuid) {
  const e = manifest[uuid];
  if (!e) return null;
  let b = Buffer.from(e.data, 'base64');
  if (e.compressed) b = zlib.gunzipSync(b);
  return { buf: b, mime: e.mime };
}
const FONT_EXT = { 'font/woff2': 'woff2', 'font/woff': 'woff' };

const uuid2path = new Map();
const VENDOR = {};

// ---- art and any other local files, under their real original names ----------
for (const { id, uuid } of ext) {
  const r = bytesFor(uuid);
  if (!r) continue;
  if (/^https?:/.test(id)) {
    const name = /react-dom/.test(id) ? 'react-dom.js'
      : /react@/.test(id) ? 'react.js'
      : 'lib-' + uuid.slice(0, 8) + '.js';
    fs.writeFileSync(path.join(OUT, 'vendor', name), r.buf);
    VENDOR[id] = 'vendor/' + name;
  } else {
    fs.mkdirSync(path.dirname(path.join(OUT, id)), { recursive: true });
    fs.writeFileSync(path.join(OUT, id), r.buf);
    uuid2path.set(uuid, id);
  }
}

// ---- the dc-runtime: the template's only <script src>, referenced by uuid ----
const RUNTIME_UUID = (template.match(/<script src="([0-9a-f-]{36})"/) || [])[1];
fs.writeFileSync(path.join(OUT, 'vendor', 'dc-runtime.js'), bytesFor(RUNTIME_UUID).buf);

// ---- fonts: referenced only by uuid from inside the inlined @font-face CSS ---
let fontCount = 0;
for (const [uuid, e] of Object.entries(manifest)) {
  if (!/font/.test(e.mime)) continue;
  const f = uuid + '.' + (FONT_EXT[e.mime] || 'woff2');
  fs.writeFileSync(path.join(OUT, 'fonts', f), bytesFor(uuid).buf);
  uuid2path.set(uuid, 'fonts/' + f);
  fontCount++;
}

// ---- rewrite uuid references to real paths ----------------------------------
template = template.replace(/<script src="[0-9a-f-]{36}"><\/script>/,
  '<script src="vendor/dc-runtime.js"></script>');
for (const [uuid, p] of uuid2path) template = template.split(uuid).join(p);

// ---- graft the multiplayer layer onto the logic class -----------------------
// evalDcLogic() returns whatever `Component` is at the end of the script, so the
// original class is renamed and re-exported through a subclass. Its body is not
// touched.
const DC_OPEN = '<script type="text/x-dc" data-dc-script="">';
const dcStart = template.indexOf(DC_OPEN);
if (dcStart < 0) throw new Error('x-dc logic script not found in template');
const bodyStart = dcStart + DC_OPEN.length;
const bodyEnd = template.indexOf('</script>', bodyStart);
let logic = template.slice(bodyStart, bodyEnd);

if (!/class Component extends DCLogic/.test(logic)) throw new Error('logic class declaration not found');
logic = logic.replace('class Component extends DCLogic', 'class TBPBase extends DCLogic');
logic += '\n' + fs.readFileSync('mp/component-mp.js', 'utf8');
template = template.slice(0, bodyStart) + logic + template.slice(bodyEnd);

// ---- copy the multiplayer sources in and add their script tags --------------
for (const f of ['tbp-net.js', 'tbp-gate.js', 'tbp-home.js', 'tbp-rooms.js']) {
  fs.copyFileSync(path.join('mp', f), path.join(OUT, 'js', f));
}
// Only the CDN libs belong in __resources. Identity entries for local assets
// would make the template's own img-fixer call setAttribute(src, sameValue),
// which re-fires its MutationObserver forever and hangs the page.
const boot =
  '<title>Tokyo Brain Pop!?</title>\n' +
  '<link rel="icon" type="image/png" href="assets/icon_tbp.png">\n' +
  '<link rel="apple-touch-icon" href="assets/icon_tbp.png">\n' +
  '<script>window.__TBPNetReady=new Promise(function(r){window.__TBPNetResolve=r;});' +
  'window.__TBPJoined=new Promise(function(r){window.__TBPJoinedResolve=r;});</script>\n' +
  '<script>window.__resources = ' + JSON.stringify(VENDOR) + ';</script>\n' +
  '<script type="module" src="js/tbp-net.js"></script>\n' +
  '<script type="module" src="js/tbp-gate.js"></script>\n';
template = template.replace('<script src="vendor/dc-runtime.js"></script>',
  boot + '<script src="vendor/dc-runtime.js"></script>');

// brand art that isn't part of the original bundle (app/ is regenerated wholesale)
fs.copyFileSync(path.join('brand', 'icon_tbp.png'), path.join(OUT, 'assets', 'icon_tbp.png'));

// The game now lives at play.html; index.html is the title screen.
fs.writeFileSync(path.join(OUT, 'play.html'), template);

// ---------------------------------------------------------------------------
// Title screen — used as authored. Its support.js is byte-identical to the
// game's dc-runtime, so it shares vendor/dc-runtime.js. Only three edits: asset
// paths, the class rename so mp/home-mp.js can subclass it, and the script tags.
// ---------------------------------------------------------------------------
const TITLE_DIR = 'title screen';
fs.mkdirSync(path.join(OUT, 'title'), { recursive: true });
for (const f of fs.readdirSync(TITLE_DIR)) {
  const src = path.join(TITLE_DIR, f);
  if (!fs.statSync(src).isFile()) continue;
  if (/\.(png|jpe?g)$/i.test(f)) fs.copyFileSync(src, path.join(OUT, 'title', f));
}

let home = fs.readFileSync(path.join(TITLE_DIR, 'Tokyo Brain Pop - Home.dc.html'), 'utf8');
home = home.replace('<script src="./support.js"></script>',
  '<title>Tokyo Brain Pop!?</title>\n' +
  '<link rel="icon" type="image/png" href="assets/icon_tbp.png">\n' +
  '<script>window.__TBPNetReady=new Promise(function(r){window.__TBPNetResolve=r;});</script>\n' +
  '<script>window.__resources = ' + JSON.stringify(VENDOR) + ';</script>\n' +
  '<script type="module" src="js/tbp-net.js"></script>\n' +
  '<script type="module">import { TBPHome } from "./js/tbp-home.js"; window.TBPHome = TBPHome;</script>\n' +
  '<script src="vendor/dc-runtime.js"></script>');
// art sits under title/
home = home.replace("url('squad-cutout.png')", "url('title/squad-cutout.png')")
           .replace('src="logo-title-white.png"', 'src="title/logo-title-white.png"');
if (!/class Component extends DCLogic/.test(home)) throw new Error('title screen logic class not found');
home = home.replace('class Component extends DCLogic', 'class TBPHomeBase extends DCLogic');
home = home.replace('</script>\n</body>', fs.readFileSync('mp/home-mp.js', 'utf8') + '\n</script>\n</body>');
fs.writeFileSync(path.join(OUT, 'index.html'), home);

// ---- the Headmaster's back office ------------------------------------------
fs.writeFileSync(path.join(OUT, 'rooms.html'),
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<title>Headmaster — Tokyo Brain Pop!?</title>\n' +
  '<link rel="icon" type="image/png" href="assets/icon_tbp.png">\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=DotGothic16&display=swap" rel="stylesheet">\n' +
  '<style>html,body{margin:0;padding:0;background:#EEE41B}</style>\n' +
  '<script>window.__TBPNetReady=new Promise(function(r){window.__TBPNetResolve=r;});</script>\n' +
  '<script type="module" src="js/tbp-net.js"></script>\n' +
  '</head>\n<body>\n<div id="app"></div>\n' +
  '<script type="module" src="js/tbp-rooms.js"></script>\n</body>\n</html>\n');

const stray = new RegExp('(^|[^/\\w-])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![.\\w-])', 'g');
console.log('local files', uuid2path.size - fontCount, '| fonts', fontCount, '| vendor', Object.keys(VENDOR).length + 1);
console.log('unresolved uuid refs:', (template.match(stray) || []).length);
console.log('logic class grafted:', /class Component extends TBPBase/.test(template));
console.log('pages: index.html (title), play.html (game), rooms.html (headmaster)');
