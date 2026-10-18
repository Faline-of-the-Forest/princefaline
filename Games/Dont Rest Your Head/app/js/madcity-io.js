// Mad City location import / export (Markdown), shared by Mad City Map.dc.html
// and the dashboard's GM panel. Plain script, no dependencies: window.MadCityIO.
//
// Export: one .md per location in a store-only zip. Each file is readable
// Markdown plus YAML front matter (id, x, y) and a trailing machine block
//   <!-- dryh-data {"node":{…},"edges":[edges whose from === this id]} -->
// so a round trip is lossless. Import reads the data block when present and
// falls back to parsing the Markdown when it isn't.
(function () {
  const KEY = 'dryh_madcity_map_v1';
  const CHARS = [['c1','Toad'],['c2','Phee'],['c3','Fat Jack'],['c4','Peter'],['c5','Henry'],['c6','Alice'],['c7','Jane'],['c8','Ben']];
  const KINDS = { obj: 'object', objects: 'object', item: 'object' };
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const W = 290;

  // ------------------------------------------------------------ export
  function nodeMd(n, data) {
    const nodes = (data && data.nodes) || [], edges = (data && data.edges) || [];
    const name = id => (nodes.find(o => o.id === id) || {}).name || '?';
    const L = ['---', 'id: ' + n.id, 'x: ' + Math.round(n.x || 0), 'y: ' + Math.round(n.y || 0), '---', '# ' + (n.name || 'Untitled'), ''];
    if ((n.desc || '').trim()) L.push(n.desc.trim(), '');
    if ((n.nightmare || '').trim()) L.push('**Nightmare:** ' + n.nightmare.trim() + ((n.nmDesc || '').trim() ? ' — ' + n.nmDesc.trim() : ''), '');
    if ((n.crashDesc || '').trim()) L.push('**Crash:** ' + n.crashDesc.trim(), '');
    if ((n.favText || '').trim()) L.push('**Favor:** ' + n.favText.trim(), '');
    if ((n.boons || []).length) { L.push('## Boons'); n.boons.forEach(b => L.push('- **' + (b.name || '') + '**' + ((b.note || '').trim() ? ' — ' + b.note.trim() : ''))); L.push(''); }
    const st = CHARS.filter(c => (n.starts || []).includes(c[0])).map(c => c[1]);
    if (st.length) L.push('**Starting here:** ' + st.join(', '), '');
    const rt = edges.filter(e => e.from === n.id || e.to === n.id);
    if (rt.length) {
      L.push('## Routes');
      rt.forEach(e => { const out = e.from === n.id; L.push('- ' + (e.both ? '⇄' : out ? '→' : '←') + ' ' + name(out ? e.to : e.from) + (e.locked ? ' (locked)' : '') + ((e.label || '').trim() ? ' — ' + e.label.trim() : '')); });
      L.push('');
    }
    (n.subs || []).forEach(s => {
      L.push('## ' + (s.name || 'Untitled'), '');
      if ((s.desc || '').trim()) L.push(s.desc.trim(), '');
      (s.items || []).forEach(it => {
        L.push('### ' + (it.text || '') + ' `' + (it.kind || 'see') + '`');
        const meta = [];
        if ((it.acts || []).length) meta.push('Acts ' + it.acts.slice().sort().join(', '));
        if (it.diff != null && it.diff !== '') meta.push('Difficulty ' + it.diff);
        if (meta.length) L.push('*' + meta.join(' · ') + '*');
        L.push('');
        if ((it.sub || '').trim()) L.push(it.sub.trim(), '');
        (it.subjects || []).forEach(q => L.push('- **' + (q.name || '') + ':** ' + (q.info || ''), ''));
      });
    });
    L.push('<!-- dryh-data', JSON.stringify({ node: n, edges: edges.filter(e => e.from === n.id) }).replace(/--/g, '-\\u002d'), '-->', '');
    return L.join('\n');
  }

  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {   // [{name, text}] -> Blob, store-only
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    files.forEach(f => {
      const nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(h, nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true);
      c.setUint32(42, off, true);
      cen.push(c, nm); off += 30 + nm.length + data.length;
    });
    const csize = cen.reduce((a, p) => a + p.byteLength, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, e], { type: 'application/zip' });
  }
  function exportZip(data) {
    const used = {};
    const files = (data.nodes || []).map(n => {
      let base = (n.name || 'Untitled').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Untitled', nm = base, i = 2;
      while (used[nm.toLowerCase()]) nm = base + ' (' + i++ + ')';
      used[nm.toLowerCase()] = 1;
      return { name: nm + '.md', text: nodeMd(n, data) };
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(zip(files)); a.download = 'Mad City Locations.zip';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Exported ' + files.length + ' location' + (files.length === 1 ? '' : 's'));
  }

  // ------------------------------------------------------------ import
  async function unzip(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
    let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('not a zip');
    const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true); const out = [];
    for (let k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), raw = u8.slice(ds, ds + csz);
      if (name.endsWith('/')) continue;
      let bytes = raw;
      if (method === 8) bytes = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else if (method !== 0) { out.push({ name, skip: 'unsupported compression' }); continue; }
      out.push({ name, text: dec.decode(bytes) });
    }
    return out;
  }

  // Markdown fallback (no data block). Returns { node, routes:[{name, dir, locked, label}] }.
  function parseMd(text) {
    let src = text.replace(/\r/g, ''), fm = {};
    const m = src.match(/^---\n([\s\S]*?)\n---\n/);
    if (m) { m[1].split('\n').forEach(l => { const k = l.match(/^(\w+):\s*(.*)$/); if (k) fm[k[1]] = k[2].trim(); }); src = src.slice(m[0].length); }
    const node = { id: fm.id || uid(), name: '', subs: [], boons: [] };
    if (fm.x != null && fm.x !== '' && !isNaN(+fm.x)) node.x = +fm.x;
    if (fm.y != null && fm.y !== '' && !isNaN(+fm.y)) node.y = +fm.y;
    const routes = [];
    let sec = 'top', sub = null, item = null, para = [];
    const flush = () => {
      const t = para.join('\n').trim(); para = []; if (!t) return;
      if (item) item.sub = item.sub ? item.sub + '\n\n' + t : t;
      else if (sub) sub.desc = sub.desc ? sub.desc + '\n\n' + t : t;
      else if (sec === 'top') node.desc = node.desc ? node.desc + '\n\n' + t : t;
    };
    src.split('\n').forEach(raw => {
      const l = raw.trimEnd(), s = l.trim();
      let k;
      if (!s) { flush(); return; }
      if ((k = s.match(/^#\s+(.+)$/))) { flush(); node.name = k[1].trim(); return; }
      if ((k = s.match(/^##\s+(.+)$/))) {
        flush(); item = null; const h = k[1].trim();
        if (/^boons$/i.test(h)) { sec = 'boons'; sub = null; }
        else if (/^routes$/i.test(h)) { sec = 'routes'; sub = null; }
        else { sec = 'sub'; sub = { id: uid(), name: h, items: [] }; node.subs.push(sub); }
        return;
      }
      if ((k = s.match(/^###\s+(.*?)\s*`([^`]+)`\s*$/)) || (k = s.match(/^###\s+(.+)$/))) {
        flush();
        if (!sub) { sub = { id: uid(), name: 'General', items: [] }; node.subs.push(sub); sec = 'sub'; }
        const kind = (k[2] || 'see').trim().toLowerCase();
        item = { id: uid(), kind: KINDS[kind] || kind, text: k[1].trim(), sub: '', acts: [1, 2, 3] };
        sub.items.push(item); return;
      }
      if (item && (k = s.match(/^\*(Acts?[^*]*|Difficulty[^*]*)\*$/))) {
        const a = k[1].match(/Acts?\s+([\d,\s]+)/), d = k[1].match(/Difficulty\s+(\d+)/);
        if (a) item.acts = a[1].split(/[,\s]+/).filter(Boolean).map(Number);
        if (d) item.diff = +d[1];
        return;
      }
      if (sec === 'boons' && (k = s.match(/^-\s+\*\*(.*?)\*\*\s*(?:[—–-]\s*(.*))?$/))) { node.boons.push({ id: uid(), name: k[1].trim(), note: (k[2] || '').trim() }); return; }
      if (sec === 'routes' && (k = s.match(/^-\s+([⇄→←])\s+(.*?)(\s+\(locked\))?(?:\s+[—–]\s+(.*))?$/))) { routes.push({ dir: k[1], name: k[2].trim(), locked: !!k[3], label: (k[4] || '').trim() }); return; }
      if (item && (k = s.match(/^-\s+\*\*(.*?):\*\*\s*(.*)$/))) { flush(); (item.subjects = item.subjects || []).push({ id: uid(), name: k[1].trim(), info: k[2].trim() }); return; }
      if (!sub && (k = s.match(/^\*\*(Nightmare|Crash|Favor|Starting here):\*\*\s*(.*)$/i))) {
        flush(); const f = k[1].toLowerCase(), v = k[2].trim();
        if (f === 'nightmare') { const p = v.split(/\s+—\s+/); node.nightmare = p[0].trim(); if (p.length > 1) node.nmDesc = p.slice(1).join(' — ').trim(); }
        else if (f === 'crash') node.crashDesc = v;
        else if (f === 'favor') node.favText = v;
        else node.starts = v.split(/\s*,\s*/).map(nm => (CHARS.find(c => c[1].toLowerCase() === nm.toLowerCase()) || [])[0]).filter(Boolean);
        return;
      }
      if (sec === 'routes' || sec === 'boons') return;
      para.push(s);
    });
    flush();
    if (!node.boons.length) delete node.boons;
    return { node, routes };
  }

  function parseFile(text) {
    const m = text.match(/<!--\s*dryh-data\s*\n?([\s\S]*?)-->/);
    if (m) { try { const d = JSON.parse(m[1].trim()); if (d && d.node && d.node.id) return { node: d.node, edges: d.edges || [], exact: true }; } catch (e) {} }
    const p = parseMd(text);
    if (!p.node.name) return null;
    return { node: p.node, edges: [], routes: p.routes, exact: false };
  }

  // FileList -> { entries:[{node, edges, exact, routes}], skipped:[name] }
  async function readFiles(fileList) {
    const entries = [], skipped = [];
    for (const f of Array.from(fileList)) {
      try {
        if (/\.zip$/i.test(f.name)) {
          for (const z of await unzip(await f.arrayBuffer())) {
            if (z.skip || !/\.md$/i.test(z.name)) { skipped.push(z.name + (z.skip ? ' (' + z.skip + ')' : '')); continue; }
            const r = parseFile(z.text); r ? entries.push(r) : skipped.push(z.name);
          }
        } else if (/\.(md|markdown|txt)$/i.test(f.name)) {
          const r = parseFile(await f.text()); r ? entries.push(r) : skipped.push(f.name);
        } else skipped.push(f.name);
      } catch (e) { skipped.push(f.name + ' (' + e.message + ')'); }
    }
    return { entries, skipped };
  }

  function plan(data, entries) {
    const nodes = data.nodes || [];
    return entries.map(en => {
      const n = en.node;
      const match = nodes.find(o => o.id === n.id) || nodes.find(o => (o.name || '').trim().toLowerCase() === (n.name || '').trim().toLowerCase());
      return { en, match };
    });
  }

  // mode: 'replace' (matching locations are overwritten) | 'copy' (everything is added fresh)
  function merge(data, planned, mode) {
    const nodes = (data.nodes || []).slice(), edges = (data.edges || []).slice(), idMap = {};
    let x0 = nodes.reduce((a, o) => Math.max(a, (o.x || 0) + W), 0) + 120, y0 = nodes.reduce((a, o) => Math.min(a, o.y || 0), 0), placed = 0;
    const spot = () => { const p = { x: x0 + (placed % 4) * (W + 60), y: y0 + Math.floor(placed / 4) * 300 }; placed++; return p; };
    let added = 0, updated = 0;
    planned.forEach(({ en, match }) => {
      const n = JSON.parse(JSON.stringify(en.node));
      if (mode === 'replace' && match) {
        idMap[n.id] = match.id; n.id = match.id;
        if (!en.exact || n.x == null) { n.x = match.x; n.y = match.y; }
        nodes[nodes.indexOf(match)] = n; updated++;
      } else {
        const old = n.id;
        if (mode === 'copy' || nodes.some(o => o.id === n.id)) n.id = uid();
        idMap[old] = n.id;
        if (mode === 'copy' && match) n.name = (n.name || '') + ' (copy)';
        if (n.x == null || n.y == null || (mode === 'copy' && match)) Object.assign(n, spot());
        nodes.push(n); added++;
      }
    });
    let routes = 0;
    planned.forEach(({ en }) => (en.edges || []).forEach(e0 => {
      const e = { ...e0, from: idMap[e0.from] || e0.from, to: idMap[e0.to] || e0.to };
      if (!nodes.some(o => o.id === e.from) || !nodes.some(o => o.id === e.to)) return;
      if (mode === 'copy') e.id = uid();
      const at = edges.findIndex(o => o.id === e.id);
      if (at >= 0) edges[at] = e; else edges.push(e);
      routes++;
    }));
    return { data: { ...data, nodes, edges }, added, updated, routes };
  }

  // ------------------------------------------------------------ UI (DOM, styled like the app)
  function css() {
    if (document.getElementById('mcio-css')) return;
    const st = document.createElement('style'); st.id = 'mcio-css';
    st.textContent = "#mcio-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(5,5,6,.82);font-family:'Barlow',sans-serif}"
      + "#mcio-modal .bx{width:min(420px,calc(100vw - 32px));max-height:80vh;overflow:auto;background:oklch(0.1 0.008 50);border:1px solid oklch(0.93 0.012 85 / 0.3);padding:22px;color:oklch(0.92 0.01 80);box-shadow:0 20px 60px rgba(0,0,0,.7)}"
      + "#mcio-modal h3{margin:0 0 10px;font:700 24px 'Barlow Condensed',sans-serif;text-transform:uppercase;color:oklch(0.96 0.012 85)}"
      + "#mcio-modal p{margin:0 0 8px;font:400 16px/1.4 'Crimson Text',serif;color:oklch(0.82 0.01 80)}"
      + "#mcio-modal .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}"
      + "#mcio-modal button{height:34px;padding:0 12px;cursor:pointer;background:transparent;border:1px solid oklch(0.93 0.012 85 / 0.35);color:oklch(0.9 0.01 80);font:600 12px 'Barlow',sans-serif;letter-spacing:.18em}"
      + "#mcio-modal button.pri{background:oklch(0.55 0.21 27);border-color:oklch(0.55 0.21 27);color:oklch(0.97 0.01 85)}"
      + "#mcio-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10001;max-width:calc(100vw - 32px);padding:10px 16px;background:oklch(0.1 0.008 50);border:1px solid oklch(0.55 0.21 27);color:oklch(0.95 0.012 85);font:600 12px 'Barlow',sans-serif;letter-spacing:.14em;box-shadow:0 10px 30px rgba(0,0,0,.6);transition:opacity .3s}";
    document.head.appendChild(st);
  }
  function toast(msg) {
    css(); let t = document.getElementById('mcio-toast');
    if (!t) { t = document.createElement('div'); t.id = 'mcio-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.opacity = '0'; }, 4200);
  }
  function ask(nNew, nUpd, nSkip) {
    css();
    return new Promise(res => {
      const m = document.createElement('div'); m.id = 'mcio-modal';
      m.innerHTML = '<div class="bx"><h3>Import locations</h3><p>' + nNew + ' new location' + (nNew === 1 ? '' : 's') + ', ' + nUpd + ' matching existing one' + (nUpd === 1 ? '' : 's') + '.</p>'
        + (nSkip ? '<p>' + nSkip + ' file' + (nSkip === 1 ? '' : 's') + ' will be skipped.</p>' : '')
        + '<p>The current map is backed up first.</p><div class="row">'
        + (nUpd ? '<button class="pri" data-a="replace">REPLACE MATCHING</button><button data-a="copy">ADD AS COPIES</button>' : '<button class="pri" data-a="replace">IMPORT</button>')
        + '<button data-a="">CANCEL</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', e => { const b = e.target.closest('button'); if (!b && e.target !== m) return; m.remove(); res(b ? b.dataset.a || null : null); });
    });
  }
  // opts: { get: () => data, apply: (data) => void }
  function importFlow(opts) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.md,.zip'; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const files = inp.files; inp.remove(); if (!files || !files.length) return;
      const { entries, skipped } = await readFiles(files);
      if (!entries.length) { toast('Nothing to import' + (skipped.length ? ' — skipped ' + skipped.join(', ') : '')); return; }
      const cur = opts.get() || { nodes: [], edges: [] }, planned = plan(cur, entries);
      const nUpd = planned.filter(p => p.match).length, mode = await ask(planned.length - nUpd, nUpd, skipped.length);
      if (!mode) return;
      try { const raw = localStorage.getItem(KEY); if (raw) localStorage.setItem(KEY + '_backup', raw); } catch (e) {}
      const r = merge(cur, planned, mode);
      opts.apply(r.data);
      toast('Imported ' + (r.added + r.updated) + ' location' + (r.added + r.updated === 1 ? '' : 's') + ', ' + r.routes + ' route' + (r.routes === 1 ? '' : 's')
        + (skipped.length ? ' · skipped ' + skipped.join(', ') : ''));
    };
    inp.click();
  }

  window.MadCityIO = { KEY, nodeMd, zip, exportZip, unzip, parseMd, parseFile, readFiles, plan, merge, importFlow, toast, uid };
})();
