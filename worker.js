// Serves the built static site, and a self-contained password-protected admin
// panel at /admin that commits content changes straight to GitHub via a
// Personal Access Token (no OAuth dance — just one password, one token).

const REPO_OWNER = "Faline-of-the-Forest";
const REPO_NAME = "princefaline";
const BRANCH = "main";
const GH_API = "https://api.github.com";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html;charset=utf-8" } });
}
function unauthorized() {
  return new Response("Auth required", { status: 401, headers: { "www-authenticate": 'Basic realm="admin"' } });
}

function checkAuth(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice(6));
  const idx = decoded.indexOf(":");
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
  return pass === env.ADMIN_PASSWORD;
}

async function ghRequest(path, env, opts = {}) {
  return fetch(`${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    ...opts,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "princefaline-admin-worker",
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  });
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
}

async function getFile(path, env) {
  const res = await ghRequest(`/contents/${path}?ref=${BRANCH}`, env);
  if (!res.ok) return null;
  const data = await res.json();
  return { content: JSON.parse(b64DecodeUtf8(data.content)), sha: data.sha };
}

async function putFile(path, content, sha, message, env) {
  const body = { message, content: b64EncodeUtf8(JSON.stringify(content, null, 2)), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await ghRequest(`/contents/${path}`, env, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("GitHub write failed: " + (await res.text()));
  return res.json();
}

async function putBinaryFile(path, base64Content, message, env) {
  const body = { message, content: base64Content, branch: BRANCH };
  const res = await ghRequest(`/contents/${path}`, env, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error("GitHub image upload failed: " + (await res.text()));
  return res.json();
}

async function deleteFile(path, sha, message, env) {
  const res = await ghRequest(`/contents/${path}`, env, { method: "DELETE", body: JSON.stringify({ message, sha, branch: BRANCH }) });
  if (!res.ok) throw new Error("GitHub delete failed: " + (await res.text()));
  return res.json();
}

async function listDir(path, env) {
  const res = await ghRequest(`/contents/${path}?ref=${BRANCH}`, env);
  if (!res.ok) return [];
  return res.json(); // array of { name, path, sha, ... }
}

function slugify(s) {
  return s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function handleApi(request, env, url) {
  if (!checkAuth(request, env)) return unauthorized();
  const path = url.pathname;
  const q = url.searchParams;

  try {
    // ---------- LIST ----------
    if (path === "/api/list" && request.method === "GET") {
      const type = q.get("type");
      if (type === "sessions") {
        const file = await getFile("content/sessions.json", env);
        return json({ items: file.content.sessions.slice().reverse() });
      }
      if (type === "dashboards") {
        const file = await getFile("content/dashboards.json", env);
        return json({ items: file.content.dashboards.map((d, i) => ({ ...d, _index: i })) });
      }
      if (type === "campaigns") {
        const entries = await listDir("content/campaigns", env);
        const items = await Promise.all(entries.filter(e => e.name.endsWith(".json")).map(async e => {
          const f = await getFile(`content/campaigns/${e.name}`, env);
          return { slug: f.content.slug, name: f.content.name, status: f.content.status, sys: f.content.sys };
        }));
        return json({ items });
      }
      if (type === "reviews") {
        const entries = await listDir("content/reviews", env);
        const items = await Promise.all(entries.filter(e => e.name.endsWith(".json")).map(async e => {
          const f = await getFile(`content/reviews/${e.name}`, env);
          return { slug: f.content.slug, t: f.content.t, type: f.content.type, stars: f.content.stars };
        }));
        return json({ items });
      }
      return json({ error: "unknown type" }, 400);
    }

    // ---------- GET SINGLE ITEM ----------
    if (path === "/api/item" && request.method === "GET") {
      const type = q.get("type"), slug = q.get("slug");
      if (type === "campaigns") {
        const f = await getFile(`content/campaigns/${slug}.json`, env);
        if (!f) return json({ error: "not found" }, 404);
        return json({ item: f.content });
      }
      if (type === "reviews") {
        const f = await getFile(`content/reviews/${slug}.json`, env);
        if (!f) return json({ error: "not found" }, 404);
        return json({ item: f.content });
      }
      if (type === "sessions") {
        const file = await getFile("content/sessions.json", env);
        const item = file.content.sessions.find(s => String(s.n) === q.get("n"));
        if (!item) return json({ error: "not found" }, 404);
        return json({ item });
      }
      if (type === "dashboards") {
        const file = await getFile("content/dashboards.json", env);
        const idx = Number(q.get("index"));
        const item = file.content.dashboards[idx];
        if (!item) return json({ error: "not found" }, 404);
        return json({ item: { ...item, _index: idx } });
      }
      return json({ error: "unknown type" }, 400);
    }

    // ---------- SESSION create/update/delete ----------
    if (path === "/api/session" && request.method === "POST") {
      const body = await request.json();
      const file = await getFile("content/sessions.json", env);
      const sessions = file.content.sessions;
      const rec = { d: body.d, t: body.t, c: body.c, s: body.s, h: Number(body.h), rt: body.rt };
      if (body.n) {
        const idx = sessions.findIndex(s => String(s.n) === String(body.n));
        if (idx === -1) return json({ error: "session not found" }, 404);
        sessions[idx] = { n: sessions[idx].n, ...rec };
      } else {
        const nextN = sessions.length ? Math.max(...sessions.map(s => s.n)) + 1 : 1;
        sessions.push({ n: nextN, ...rec });
      }
      await putFile("content/sessions.json", file.content, file.sha, `${body.n ? "Update" : "Add"} session: ${body.t}`, env);
      return json({ ok: true });
    }
    if (path === "/api/session" && request.method === "DELETE") {
      const n = q.get("n");
      const file = await getFile("content/sessions.json", env);
      file.content.sessions = file.content.sessions.filter(s => String(s.n) !== n);
      await putFile("content/sessions.json", file.content, file.sha, `Delete session #${n}`, env);
      return json({ ok: true });
    }

    // ---------- DASHBOARD (game) create/update/delete ----------
    if (path === "/api/dashboard" && request.method === "POST") {
      const body = await request.json();
      const file = await getFile("content/dashboards.json", env);
      const rec = {
        t: body.t, c: body.c, sys: body.sys,
        tags: (body.tags || "").split(",").map(s => s.trim()).filter(Boolean),
        note: body.note, url: body.url, host: body.host || "",
      };
      if (body.index !== undefined && body.index !== "") {
        file.content.dashboards[Number(body.index)] = rec;
      } else {
        file.content.dashboards.push(rec);
      }
      await putFile("content/dashboards.json", file.content, file.sha, `${body.index ? "Update" : "Add"} game: ${body.t}`, env);
      return json({ ok: true });
    }
    if (path === "/api/dashboard" && request.method === "DELETE") {
      const idx = Number(q.get("index"));
      const file = await getFile("content/dashboards.json", env);
      file.content.dashboards.splice(idx, 1);
      await putFile("content/dashboards.json", file.content, file.sha, `Delete game at index ${idx}`, env);
      return json({ ok: true });
    }

    // ---------- CAMPAIGN create/update/delete ----------
    if (path === "/api/campaign" && request.method === "POST") {
      const body = await request.json();
      const slug = body.slug || slugify(body.name);
      const existing = await getFile(`content/campaigns/${slug}.json`, env);
      const out = {
        slug, name: body.name, sys: body.sys, status: body.status,
        banner: body.banner || (existing ? existing.content.banner : "") || "",
        covers: existing ? existing.content.covers || [] : [],
      };
      if (body.tagline) out.tagline = body.tagline;
      if (body.tags) out.tags = body.tags.split(",").map(s => s.trim()).filter(Boolean);
      if (body.premise) out.premise = body.premise.split("\n\n").map(s => s.trim()).filter(Boolean);
      if (body.influences) out.influences = body.influences;
      if (existing && existing.content.cast) out.cast = existing.content.cast;
      if (existing && existing.content.episodes) out.episodes = existing.content.episodes;
      if (existing && existing.content.materials) out.materials = existing.content.materials;
      await putFile(`content/campaigns/${slug}.json`, out, existing ? existing.sha : null, `${existing ? "Update" : "Add"} campaign: ${body.name}`, env);
      return json({ ok: true, slug });
    }
    if (path === "/api/campaign" && request.method === "DELETE") {
      const slug = q.get("slug");
      const existing = await getFile(`content/campaigns/${slug}.json`, env);
      if (!existing) return json({ error: "not found" }, 404);
      await deleteFile(`content/campaigns/${slug}.json`, existing.sha, `Delete campaign: ${slug}`, env);
      return json({ ok: true });
    }

    // ---------- REVIEW create/update/delete ----------
    if (path === "/api/review" && request.method === "POST") {
      const body = await request.json();
      const slug = body.slug || slugify(body.t + (body.ed ? "-" + body.ed : ""));
      const existing = await getFile(`content/reviews/${slug}.json`, env);
      const out = {
        slug, t: body.t, ed: body.ed || "", sys: body.sys, type: body.type,
        stars: Number(body.stars), date: body.date,
        tags: (body.tags || "").split(",").map(s => s.trim()).filter(Boolean),
        verdict: body.verdict, body: body.body,
        used: (body.used || "").split(",").map(s => s.trim()).filter(Boolean),
        cover: body.cover || (existing ? existing.content.cover : "") || "",
      };
      await putFile(`content/reviews/${slug}.json`, out, existing ? existing.sha : null, `${existing ? "Update" : "Add"} review: ${body.t}`, env);
      return json({ ok: true, slug });
    }
    if (path === "/api/review" && request.method === "DELETE") {
      const slug = q.get("slug");
      const existing = await getFile(`content/reviews/${slug}.json`, env);
      if (!existing) return json({ error: "not found" }, 404);
      await deleteFile(`content/reviews/${slug}.json`, existing.sha, `Delete review: ${slug}`, env);
      return json({ ok: true });
    }

    // ---------- IMAGE UPLOAD ----------
    if (path === "/api/upload-image" && request.method === "POST") {
      const body = await request.json(); // { filename, base64 }
      const safeName = body.filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const dest = `uploads/${Date.now()}-${safeName}`;
      await putBinaryFile(dest, body.base64, `Upload image: ${safeName}`, env);
      return json({ ok: true, path: "/" + dest });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function adminPage() {
  return html(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — Prince Faline's RPG Diaries</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
<style>
  :root{--bg:#F6F1E4;--panel:#FBF8EF;--ink:#24211B;--muted:#5B5648;--faint:#8A836F;--line:#C8BFA6;--accent:#A5231F;--green:#2F4633}
  *{box-sizing:border-box}
  body{font-family:'EB Garamond',Georgia,serif;background:var(--bg);color:var(--ink);max-width:920px;margin:0 auto;padding:0 20px 100px}
  header{position:sticky;top:0;background:var(--bg);border-bottom:2px solid var(--ink);padding:18px 0;margin-bottom:24px;z-index:10}
  h1{font-size:24px;margin:0 0 12px;font-weight:400}
  .tabs{display:flex;gap:4px;flex-wrap:wrap}
  .tab{padding:8px 16px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer;font:inherit;font-size:16px}
  .tab.active{background:var(--green);border-color:var(--green);color:var(--bg)}
  .panel{display:none} .panel.active{display:block}
  .list{border:2px solid var(--ink);background:var(--panel);margin-bottom:20px}
  .list-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #E6DFCB}
  .list-row:last-child{border-bottom:none}
  .list-row .info{flex:1;min-width:0}
  .list-row .title{font-size:17px} .list-row .sub{font-size:13px;color:var(--faint)}
  .list-row img{width:40px;height:40px;object-fit:cover;border:1px solid var(--line)}
  .list-row button{font-size:13px;padding:5px 10px;margin:0}
  .pill{padding:2px 7px;border:1px solid var(--line);font-size:12px;color:var(--muted)}
  .empty{padding:20px;text-align:center;color:var(--faint)}
  h2{font-size:18px;margin:0 0 14px;font-weight:400;color:var(--accent)}
  .formwrap{border:2px solid var(--ink);background:var(--panel);padding:18px;display:none;margin-bottom:20px}
  .formwrap.active{display:block}
  label{display:block;margin:12px 0 4px;font-size:13px;color:var(--muted)}
  input,select,textarea{width:100%;padding:8px;border:1px solid var(--line);background:var(--bg);font:inherit;font-size:15px}
  textarea{min-height:80px}
  button{padding:9px 16px;background:var(--green);color:var(--bg);border:1px solid var(--ink);font:inherit;font-size:14px;cursor:pointer}
  button:hover{background:var(--ink)}
  button.secondary{background:transparent;color:var(--muted);border-color:var(--line)}
  button.danger{background:transparent;color:var(--accent);border-color:var(--accent)}
  .actions{display:flex;gap:8px;margin-top:16px}
  .msg{margin-top:10px;font-size:14px}
  .msg.ok{color:var(--green)} .msg.err{color:var(--accent)}
  .row{display:flex;gap:10px} .row > div{flex:1}
  .toprow{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .thumb{width:60px;height:60px;object-fit:cover;border:1px solid var(--line);margin-bottom:8px;display:block}
</style>
</head>
<body>
<header>
  <h1>Prince Faline's RPG Diaries — Admin</h1>
  <div class="tabs">
    <div class="tab active" data-tab="sessions">Sessions</div>
    <div class="tab" data-tab="campaigns">Campaigns</div>
    <div class="tab" data-tab="reviews">Reviews</div>
    <div class="tab" data-tab="dashboards">Games</div>
  </div>
</header>

<div class="panel active" id="panel-sessions">
  <div class="toprow"><h2>Ledger</h2><button data-new="sessions">+ Add Session</button></div>
  <div class="list" id="list-sessions"><div class="empty">Loading…</div></div>
  <div class="formwrap" id="form-sessions">
    <div class="row">
      <div><label>Date</label><input name="d" type="date" required></div>
      <div><label>Runtime (HH:MM)</label><input name="rt" placeholder="04:00" required></div>
    </div>
    <label>Title</label><input name="t" required>
    <label>Campaign (exact name, or "One-Shot")</label><input name="c" required>
    <label>System</label><input name="s" required>
    <label>Hours (decimal, e.g. 4.0)</label><input name="h" type="number" step="0.01" required>
    <div class="actions"><button data-save="sessions">Save</button><button type="button" class="secondary" data-cancel>Cancel</button></div>
    <div class="msg"></div>
  </div>
</div>

<div class="panel" id="panel-campaigns">
  <div class="toprow"><h2>Campaigns</h2><button data-new="campaigns">+ Add Campaign</button></div>
  <div class="list" id="list-campaigns"><div class="empty">Loading…</div></div>
  <div class="formwrap" id="form-campaigns">
    <label>Name (must match ledger campaign names exactly)</label><input name="name" required>
    <label>Slug (leave blank to auto-generate; don't change when editing)</label><input name="slug">
    <label>System</label><input name="sys" required>
    <label>Status</label>
    <select name="status"><option value="running">Running</option><option value="between arcs">Between Arcs</option><option value="concluded">Concluded</option></select>
    <label>Tagline</label><input name="tagline">
    <label>Tags (comma-separated)</label><input name="tags">
    <label>Premise (separate paragraphs with a blank line)</label><textarea name="premise"></textarea>
    <label>Influences</label><input name="influences">
    <label>Banner image</label>
    <img class="thumb" style="display:none">
    <input name="bannerFile" type="file" accept="image/*">
    <div class="actions"><button data-save="campaigns">Save</button><button type="button" class="secondary" data-cancel>Cancel</button></div>
    <div class="msg"></div>
  </div>
</div>

<div class="panel" id="panel-reviews">
  <div class="toprow"><h2>Reviews</h2><button data-new="reviews">+ Add Review</button></div>
  <div class="list" id="list-reviews"><div class="empty">Loading…</div></div>
  <div class="formwrap" id="form-reviews">
    <div class="row">
      <div><label>Title</label><input name="t" required></div>
      <div><label>Edition (optional)</label><input name="ed"></div>
    </div>
    <label>Slug (leave blank to auto-generate; don't change when editing)</label><input name="slug">
    <label>System</label><input name="sys" required>
    <div class="row">
      <div><label>Type</label><select name="type"><option>System</option><option>Module</option><option>Supplement</option><option>Resource</option></select></div>
      <div><label>Stars (1-5)</label><input name="stars" type="number" min="1" max="5" required></div>
    </div>
    <label>Date reviewed (YYYY-MM)</label><input name="date" placeholder="2026-08" required>
    <label>Tags (comma-separated)</label><input name="tags">
    <label>Verdict (one line)</label><input name="verdict" required>
    <label>Body</label><textarea name="body" required></textarea>
    <label>Used in (comma-separated campaign names, or One-Shots)</label><input name="used">
    <label>Cover image</label>
    <img class="thumb" style="display:none">
    <input name="coverFile" type="file" accept="image/*">
    <div class="actions"><button data-save="reviews">Save</button><button type="button" class="secondary" data-cancel>Cancel</button></div>
    <div class="msg"></div>
  </div>
</div>

<div class="panel" id="panel-dashboards">
  <div class="toprow"><h2>Games</h2><button data-new="dashboards">+ Add Game</button></div>
  <div class="list" id="list-dashboards"><div class="empty">Loading…</div></div>
  <div class="formwrap" id="form-dashboards">
    <label>Title</label><input name="t" required>
    <label>Campaign</label><input name="c" required>
    <label>System</label><input name="sys" required>
    <label>Tags (comma-separated)</label><input name="tags">
    <label>Note</label><textarea name="note"></textarea>
    <label>Live URL</label><input name="url" required>
    <div class="actions"><button data-save="dashboards">Save</button><button type="button" class="secondary" data-cancel>Cancel</button></div>
    <div class="msg"></div>
  </div>
</div>

<script>
const state = { editing: {} }; // type -> current identifier (n / slug / index) or null for new

function el(sel, root) { return (root || document).querySelector(sel); }
function els(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function api(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(out.error || (res.status + " error"));
  return out;
}

// ---------- tabs ----------
els(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    els(".tab").forEach(t => t.classList.remove("active"));
    els(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    el("#panel-" + tab.dataset.tab).classList.add("active");
    loadList(tab.dataset.tab);
  });
});

// ---------- list rendering ----------
async function loadList(type) {
  const listEl = el("#list-" + type);
  listEl.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const { items } = await api("GET", "/api/list?type=" + type);
    if (!items.length) { listEl.innerHTML = '<div class="empty">Nothing yet.</div>'; return; }
    listEl.innerHTML = "";
    items.forEach(item => listEl.appendChild(renderRow(type, item)));
  } catch (e) {
    listEl.innerHTML = '<div class="empty">Error: ' + e.message + '</div>';
  }
}

function renderRow(type, item) {
  const row = document.createElement("div");
  row.className = "list-row";
  let title = "", sub = "", id = "";
  if (type === "sessions") { title = item.t; sub = item.d + " · " + item.c + " · " + item.s; id = item.n; }
  if (type === "campaigns") { title = item.name; sub = item.sys + " · " + item.status; id = item.slug; }
  if (type === "reviews") { title = item.t; sub = item.type + " · " + "★".repeat(item.stars); id = item.slug; }
  if (type === "dashboards") { title = item.t; sub = item.c + " · " + item.sys; id = item._index; }
  row.innerHTML = '<div class="info"><div class="title">' + escapeHtml(title) + '</div><div class="sub">' + escapeHtml(sub) + '</div></div>' +
    '<button class="secondary" data-edit>Edit</button><button class="danger" data-del>Delete</button>';
  el("[data-edit]", row).addEventListener("click", () => openForEdit(type, id));
  el("[data-del]", row).addEventListener("click", () => doDelete(type, id, title));
  return row;
}

function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// ---------- forms ----------
function showForm(type) {
  el("#form-" + type).classList.add("active");
}
function hideForm(type) {
  el("#form-" + type).classList.remove("active");
  el("#form-" + type).querySelectorAll("input,select,textarea").forEach(i => { if (i.type !== "file") i.value = ""; else i.value = ""; });
  const thumb = el(".thumb", el("#form-" + type));
  if (thumb) { thumb.style.display = "none"; thumb.src = ""; }
  el(".msg", el("#form-" + type)).textContent = "";
  state.editing[type] = null;
}

els("[data-new]").forEach(btn => btn.addEventListener("click", () => {
  const type = btn.dataset.new;
  hideForm(type);
  showForm(type);
}));
els("[data-cancel]").forEach(btn => btn.addEventListener("click", (e) => {
  const type = e.target.closest(".formwrap").id.replace("form-", "");
  hideForm(type);
}));

async function openForEdit(type, id) {
  const form = el("#form-" + type);
  hideForm(type);
  showForm(type);
  state.editing[type] = id;
  try {
    let qs = "type=" + type;
    if (type === "sessions") qs += "&n=" + id;
    else if (type === "dashboards") qs += "&index=" + id;
    else qs += "&slug=" + encodeURIComponent(id);
    const { item } = await api("GET", "/api/item?" + qs);
    Object.keys(item).forEach(k => {
      const field = form.querySelector('[name="' + k + '"]');
      if (!field) return;
      if (Array.isArray(item[k])) field.value = item[k].join(", ");
      else if (k === "premise" && Array.isArray(item.premise)) field.value = item.premise.join("\\n\\n");
      else field.value = item[k] == null ? "" : item[k];
    });
    const thumb = el(".thumb", form);
    if (thumb && (item.banner || item.cover)) {
      thumb.src = item.banner || item.cover;
      thumb.style.display = "block";
    }
  } catch (e) {
    el(".msg", form).textContent = "Error loading: " + e.message;
    el(".msg", form).className = "msg err";
  }
}

async function doDelete(type, id, title) {
  if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
  try {
    let qs = "type=" + type;
    if (type === "sessions") qs = "n=" + id;
    else if (type === "dashboards") qs = "index=" + id;
    else qs = "slug=" + encodeURIComponent(id);
    await api("DELETE", "/api/" + singularEndpoint(type) + "?" + qs);
    loadList(type);
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
}
function singularEndpoint(type) {
  return { sessions: "session", campaigns: "campaign", reviews: "review", dashboards: "dashboard" }[type];
}

els("[data-save]").forEach(btn => btn.addEventListener("click", async () => {
  const type = btn.dataset.save;
  const form = el("#form-" + type);
  const msg = el(".msg", form);
  msg.textContent = "Saving…"; msg.className = "msg";
  try {
    const data = {};
    els("input,select,textarea", form).forEach(f => {
      if (f.type === "file") return;
      data[f.name] = f.value;
    });
    const editingId = state.editing[type];
    if (type === "sessions" && editingId) data.n = editingId;
    if (type === "dashboards" && editingId !== null && editingId !== undefined) data.index = editingId;

    const bannerFile = el('[name="bannerFile"]', form);
    if (bannerFile && bannerFile.files[0]) {
      const b64 = await fileToBase64(bannerFile.files[0]);
      const up = await api("POST", "/api/upload-image", { filename: bannerFile.files[0].name, base64: b64 });
      data.banner = up.path;
    }
    const coverFile = el('[name="coverFile"]', form);
    if (coverFile && coverFile.files[0]) {
      const b64 = await fileToBase64(coverFile.files[0]);
      const up = await api("POST", "/api/upload-image", { filename: coverFile.files[0].name, base64: b64 });
      data.cover = up.path;
    }

    await api("POST", "/api/" + singularEndpoint(type), data);
    msg.textContent = "Saved. Site will rebuild shortly.";
    msg.className = "msg ok";
    setTimeout(() => { hideForm(type); loadList(type); }, 700);
  } catch (e) {
    msg.textContent = "Error: " + e.message;
    msg.className = "msg err";
  }
}));

loadList("sessions");
</script>
</body>
</html>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin/index.html") {
      if (!checkAuth(request, env)) return unauthorized();
      return adminPage();
    }

    // Everything else: serve the static site build.
    return env.ASSETS.fetch(request);
  },
};
