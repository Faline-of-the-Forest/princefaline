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

// Merges the session ledger into a campaign's episode list: ledger supplies
// date/rt/n (and a default title) for every logged session; any episode data
// already written by the admin (title, hook/summary, img) is kept by matching
// on session order, so re-syncing never clobbers hand-written recaps.
function syncEpisodes(existing, sessions, slug) {
  const rows = sessions.filter(s => s.campaignSlug === slug);
  return rows.map((s, i) => {
    const prev = existing[i] || {};
    return {
      n: String(i + 1).padStart(2, "0"),
      date: s.d,
      rt: s.rt,
      title: prev.title || s.t,
      hook: prev.hook || "",
      img: prev.img || "",
    };
  });
}

async function loadCampaignsIndex(env) {
  const entries = await listDir("content/campaigns", env);
  return Promise.all(entries.filter(e => e.name.endsWith(".json")).map(async e => {
    const f = await getFile(`content/campaigns/${e.name}`, env);
    return { slug: f.content.slug, name: f.content.name, status: f.content.status, sys: f.content.sys };
  }));
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
        const [file, camps] = await Promise.all([getFile("content/sessions.json", env), loadCampaignsIndex(env)]);
        const byId = Object.fromEntries(camps.map(c => [c.slug, c.name]));
        const items = file.content.sessions.slice().reverse().map(s => ({
          ...s,
          campaignName: s.campaignSlug ? (byId[s.campaignSlug] || "(unknown campaign)") : "One-Shot",
        }));
        return json({ items, campaigns: camps });
      }
      if (type === "dashboards") {
        const file = await getFile("content/dashboards.json", env);
        return json({ items: file.content.dashboards.map((d, i) => ({ ...d, _index: i })) });
      }
      if (type === "campaigns") {
        return json({ items: await loadCampaignsIndex(env) });
      }
      if (type === "reviews") {
        const entries = await listDir("content/reviews", env);
        const items = await Promise.all(entries.filter(e => e.name.endsWith(".json")).map(async e => {
          const f = await getFile(`content/reviews/${e.name}`, env);
          return { slug: f.content.slug, t: f.content.t, ed: f.content.ed || "", type: f.content.type, sys: f.content.sys, stars: f.content.stars };
        }));
        return json({ items });
      }
      if (type === "people") {
        const entries = await listDir("content/campaigns", env);
        const camps = await Promise.all(entries.filter(e => e.name.endsWith(".json")).map(async e => {
          const f = await getFile(`content/campaigns/${e.name}`, env);
          return f.content;
        }));
        const byName = {};
        camps.forEach(c => (c.cast || []).forEach(pc => {
          if (!pc.player) return;
          if (!byName[pc.player]) byName[pc.player] = [];
          byName[pc.player].push({ campaign: c.name, slug: c.slug, role: pc.role || pc.kind || "" });
        }));
        return json({ items: Object.entries(byName).map(([name, appearances]) => ({ name, appearances })) });
      }
      return json({ error: "unknown type" }, 400);
    }

    // ---------- GET SINGLE ITEM ----------
    if (path === "/api/item" && request.method === "GET") {
      const type = q.get("type"), slug = q.get("slug");
      if (type === "campaigns") {
        const f = await getFile(`content/campaigns/${slug}.json`, env);
        if (!f) return json({ error: "not found" }, 404);
        const sessFile = await getFile("content/sessions.json", env);
        const episodes = syncEpisodes(f.content.episodes || [], sessFile.content.sessions, slug);
        return json({ item: { ...f.content, episodes } });
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
      const rec = { d: body.d, t: body.t, campaignSlug: body.campaignSlug || "", s: body.s, h: Number(body.h), rt: body.rt };
      if (body.ed) rec.ed = body.ed;
      if (!rec.campaignSlug) {
        // Every one-shot automatically gets its own page.
        const existingSlugs = sessions.filter(s => !s.campaignSlug && String(s.n) !== String(body.n)).map(s => s.slug).filter(Boolean);
        if (body.slug) {
          rec.slug = body.slug;
        } else {
          const base = slugify(body.t) || "session";
          let candidate = base, i = 2;
          while (existingSlugs.includes(candidate)) { candidate = base + "-" + i; i++; }
          rec.slug = candidate;
        }
        if (body.writeup) rec.writeup = body.writeup.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
        if (body.cover) rec.cover = body.cover;
      }
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
      if (body.ed) out.ed = body.ed;
      if (body.tagline) out.tagline = body.tagline;
      if (body.summary) out.summary = body.summary.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      if (body.influences) out.influences = body.influences;
      if (body.materials) { try { out.materials = JSON.parse(body.materials); } catch (e) { out.materials = []; } }
      if (body.cast) { try { out.cast = JSON.parse(body.cast); } catch (e) { out.cast = []; } }

      // Episodes are always re-derived from the session ledger so newly
      // logged sessions show up automatically; hand-written titles/summaries
      // sent up from the form (admin edits) are preserved by session order.
      const sessFile = await getFile("content/sessions.json", env);
      let incomingEpisodes = [];
      if (body.episodes) { try { incomingEpisodes = JSON.parse(body.episodes); } catch (e) { incomingEpisodes = []; } }
      out.episodes = syncEpisodes(incomingEpisodes.length ? incomingEpisodes : (existing ? existing.content.episodes || [] : []), sessFile.content.sessions, slug);

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
  .list-row button{font-size:13px;padding:5px 10px;margin:0;flex-shrink:0}
  .empty{padding:20px;text-align:center;color:var(--faint)}
  h2{font-size:18px;margin:0;font-weight:400;color:var(--accent)}
  label{display:block;margin:12px 0 4px;font-size:13px;color:var(--muted)}
  input,select,textarea{width:100%;padding:8px;border:1px solid var(--line);background:var(--bg);font:inherit;font-size:15px}
  textarea{min-height:80px}
  button{padding:9px 16px;background:var(--green);color:var(--bg);border:1px solid var(--ink);font:inherit;font-size:14px;cursor:pointer}
  button:hover{background:var(--ink)}
  button.secondary{background:transparent;color:var(--muted);border-color:var(--line)}
  button.danger{background:transparent;color:var(--accent);border-color:var(--accent)}
  .actions{display:flex;gap:8px;margin-top:20px}
  .msg{margin-top:10px;font-size:14px}
  .msg.ok{color:var(--green)} .msg.err{color:var(--accent)}
  .row{display:flex;gap:10px} .row > div{flex:1}
  .toprow{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .thumb{width:100%;max-width:220px;max-height:140px;object-fit:cover;border:1px solid var(--line);margin-bottom:8px;display:block}

  .modal-backdrop{display:none;position:fixed;inset:0;background:rgba(36,33,27,.55);z-index:100;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 16px}
  .modal-backdrop.active{display:flex}
  .modal{background:var(--panel);border:2px solid var(--ink);max-width:560px;width:100%;padding:24px;margin-bottom:40px}
  .modal-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
  .modal-close{background:transparent;border:none;color:var(--muted);font-size:22px;cursor:pointer;padding:0;line-height:1}
  .hidden{display:none !important}
</style>
</head>
<body>
<header>
  <h1>Prince Faline's RPG Diaries — Admin</h1>
  <div class="tabs">
    <div class="tab active" data-tab="sessions">Sessions</div>
    <div class="tab" data-tab="campaigns">Campaigns</div>
    <div class="tab" data-tab="oneshots">One-Shots</div>
    <div class="tab" data-tab="reviews">Reviews</div>
    <div class="tab" data-tab="dashboards">Games</div>
  </div>
</header>

<div class="panel active" id="panel-sessions">
  <div class="toprow"><h2>Ledger</h2><button data-new="sessions">+ Add Session</button></div>
  <p style="font-size:13px;color:var(--faint);margin-top:0">Every session played, campaigns and one-shots together. For a one-shot's write-up and cover image, use the One-Shots tab instead.</p>
  <div class="list" id="list-sessions"><div class="empty">Loading…</div></div>
</div>

<div class="panel" id="panel-campaigns">
  <div class="toprow"><h2>Campaigns</h2><button data-new="campaigns">+ Add Campaign</button></div>
  <div class="list" id="list-campaigns"><div class="empty">Loading…</div></div>
</div>

<div class="panel" id="panel-oneshots">
  <div class="toprow"><h2>One-Shots</h2><button data-new="oneshots">+ Add One-Shot</button></div>
  <p style="font-size:13px;color:var(--faint);margin-top:0">Every one-shot automatically gets its own page. Add the write-up and cover here.</p>
  <div class="list" id="list-oneshots"><div class="empty">Loading…</div></div>
</div>

<div class="panel" id="panel-reviews">
  <div class="toprow"><h2>Reviews</h2><button data-new="reviews">+ Add Review</button></div>
  <div class="list" id="list-reviews"><div class="empty">Loading…</div></div>
</div>

<div class="panel" id="panel-dashboards">
  <div class="toprow"><h2>Games</h2><button data-new="dashboards">+ Add Game</button></div>
  <div class="list" id="list-dashboards"><div class="empty">Loading…</div></div>
</div>

<!-- ============ MODAL ============ -->
<div class="modal-backdrop" id="modal-backdrop">
  <div class="modal">
    <div class="modal-head"><h2 id="modal-title">Add</h2><button class="modal-close" id="modal-close">&times;</button></div>

    <form id="form-sessions" class="editform hidden">
      <div class="row">
        <div><label>Date</label><input name="d" type="date" required></div>
        <div><label>Runtime (HH:MM)</label><input name="rt" placeholder="04:00" required></div>
      </div>
      <label>Title</label><input name="t" required>
      <label>Campaign</label>
      <select name="campaignSlug" id="campaignSelect"><option value="">— One-Shot —</option></select>
      <div class="row">
        <div><label>System</label><input name="s" required></div>
        <div><label>Edition/Version (optional)</label><input name="ed" placeholder="e.g. 2e, VTR"></div>
      </div>
      <label>Hours (decimal, e.g. 4.0)</label><input name="h" type="number" step="0.01" required>
    </form>

    <form id="form-oneshots" class="editform hidden">
      <div class="row">
        <div><label>Date</label><input name="d" type="date" required></div>
        <div><label>Runtime (HH:MM)</label><input name="rt" placeholder="04:00" required></div>
      </div>
      <label>Title</label><input name="t" required>
      <div class="row">
        <div><label>System</label><input name="s" required></div>
        <div><label>Edition/Version (optional)</label><input name="ed" placeholder="e.g. 2e, VTR"></div>
      </div>
      <label>Hours (decimal, e.g. 4.0)</label><input name="h" type="number" step="0.01" required>
      <label>Slug (leave blank to auto-generate; don't change when editing)</label><input name="slug">
      <label>Write-up (separate paragraphs with a blank line)</label><textarea name="writeup"></textarea>
      <label>Cover image (square works best)</label>
      <img class="thumb hidden">
      <input name="coverFile" type="file" accept="image/*">
    </form>

    <form id="form-campaigns" class="editform hidden">
      <label>Name (must match ledger campaign names exactly)</label><input name="name" required>
      <label>Slug (leave blank to auto-generate; don't change when editing)</label><input name="slug">
      <label>System (from Reviews marked as "System")</label>
      <select name="sysReview" id="sysReviewSelect"><option value="">— choose a system —</option></select>
      <input type="hidden" name="sys"><input type="hidden" name="ed">
      <label>Status</label>
      <select name="status"><option value="running">Running</option><option value="between arcs">Between Arcs</option><option value="concluded">Concluded</option></select>
      <label>Tagline</label><input name="tagline">
      <label>Summary (separate paragraphs with a blank line)</label><textarea name="summary"></textarea>
      <label>Influences</label><input name="influences">
      <label>Materials (search Reviews)</label>
      <input id="materialsSearch" placeholder="Type to search reviews…" autocomplete="off">
      <div id="materialsChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
      <div id="materialsResults" style="border:1px solid var(--line);background:var(--panel);max-height:160px;overflow-y:auto;display:none;margin-top:4px"></div>
      <input type="hidden" name="materials">
      <label>Banner image</label>
      <img class="thumb hidden">
      <input name="bannerFile" type="file" accept="image/*">

      <label style="margin-top:22px">Cast</label>
      <div id="castRows"></div>
      <button type="button" class="secondary" id="addCastRow" style="margin-top:6px">+ Add Character</button>
      <input type="hidden" name="cast">

      <label style="margin-top:22px">Episodes (from the ledger)</label>
      <p style="font-size:13px;color:var(--faint);margin:0 0 6px">Date, number and runtime come from logged sessions automatically. Add a title, summary and portrait for each.</p>
      <div id="episodeRows"></div>
      <input type="hidden" name="episodes">
    </form>

    <form id="form-reviews" class="editform hidden">
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
      <img class="thumb hidden">
      <input name="coverFile" type="file" accept="image/*">
    </form>

    <form id="form-dashboards" class="editform hidden">
      <label>Title</label><input name="t" required>
      <label>Campaign</label><input name="c" required>
      <label>System</label><input name="sys" required>
      <label>Tags (comma-separated)</label><input name="tags">
      <label>Note</label><textarea name="note"></textarea>
      <label>Live URL</label><input name="url" required>
    </form>

    <div class="actions"><button id="modal-save">Save</button><button type="button" class="secondary" id="modal-cancel">Cancel</button></div>
    <div class="msg" id="modal-msg"></div>
  </div>
</div>

<script>
const state = { editing: null, type: null, campaigns: [] };

function el(sel, root) { return (root || document).querySelector(sel); }
function els(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

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

function singularEndpoint(type) {
  return { sessions: "session", oneshots: "session", campaigns: "campaign", reviews: "review", dashboards: "dashboard" }[type];
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
    const res = await api("GET", "/api/list?type=" + (type === "oneshots" ? "sessions" : type));
    if (type === "sessions" || type === "oneshots") state.campaigns = res.campaigns || state.campaigns;
    let items = res.items;
    if (type === "oneshots") items = items.filter(i => !i.campaignSlug);
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
  if (type === "sessions") { title = item.t; sub = item.d + " · " + item.campaignName + " · " + item.s; id = item.n; }
  if (type === "oneshots") { title = item.t; sub = item.d + " · " + item.s + (item.writeup ? " · has write-up" : ""); id = item.n; }
  if (type === "campaigns") { title = item.name; sub = item.sys + " · " + item.status; id = item.slug; }
  if (type === "reviews") { title = item.t; sub = item.type + " · " + "★".repeat(item.stars); id = item.slug; }
  if (type === "dashboards") { title = item.t; sub = item.c + " · " + item.sys; id = item._index; }
  row.innerHTML = '<div class="info"><div class="title">' + escapeHtml(title) + '</div><div class="sub">' + escapeHtml(sub) + '</div></div>' +
    '<button class="secondary" data-edit>Edit</button><button class="danger" data-del>Delete</button>';
  el("[data-edit]", row).addEventListener("click", () => openModal(type, id));
  el("[data-del]", row).addEventListener("click", () => doDelete(type, id, title));
  return row;
}

// ---------- modal ----------
const backdrop = el("#modal-backdrop");
const modalTitle = el("#modal-title");

// ---------- campaign form: system / materials / cast / episodes ----------
state.reviews = null;
state.people = null;
state.materials = [];
state.cast = [];
state.episodes = [];

async function ensureReviewsAndPeople() {
  if (!state.reviews) { try { state.reviews = (await api("GET", "/api/list?type=reviews")).items; } catch (e) { state.reviews = []; } }
  if (!state.people) { try { state.people = (await api("GET", "/api/list?type=people")).items; } catch (e) { state.people = []; } }
}

async function populateSysSelect(currentSys, currentEd) {
  await ensureReviewsAndPeople();
  const sel = el("#sysReviewSelect");
  const systems = state.reviews.filter(r => r.type === "System");
  sel.innerHTML = '<option value="">— choose a system —</option>' +
    systems.map(r => '<option value="' + r.slug + '">' + escapeHtml(r.t) + (r.ed ? ' (' + escapeHtml(r.ed) + ')' : '') + '</option>').join("");
  const match = systems.find(r => r.t === currentSys && (r.ed || "") === (currentEd || ""));
  sel.value = match ? match.slug : "";
}
el("#sysReviewSelect").addEventListener("change", () => {
  const r = (state.reviews || []).find(x => x.slug === el("#sysReviewSelect").value);
  el('#form-campaigns [name="sys"]').value = r ? r.t : "";
  el('#form-campaigns [name="ed"]').value = r ? (r.ed || "") : "";
});

function renderMaterialsChips() {
  const box = el("#materialsChips");
  box.innerHTML = state.materials.map((t, i) =>
    '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--line);font-size:13px">' +
      escapeHtml(t) + ' <span data-rm="' + i + '" style="cursor:pointer;color:var(--accent)">&times;</span></span>'
  ).join("");
  els("[data-rm]", box).forEach(x => x.addEventListener("click", () => { state.materials.splice(Number(x.dataset.rm), 1); renderMaterialsChips(); }));
  el('#form-campaigns [name="materials"]').value = JSON.stringify(state.materials);
}
el("#materialsSearch").addEventListener("input", async () => {
  await ensureReviewsAndPeople();
  const q = el("#materialsSearch").value.trim().toLowerCase();
  const results = el("#materialsResults");
  if (!q) { results.style.display = "none"; results.innerHTML = ""; return; }
  const matches = state.reviews.filter(r => r.t.toLowerCase().includes(q) && !state.materials.includes(r.t)).slice(0, 8);
  if (!matches.length) { results.style.display = "none"; results.innerHTML = ""; return; }
  results.style.display = "block";
  results.innerHTML = matches.map(r => '<div data-pick="' + escapeHtml(r.t) + '" style="padding:8px 10px;cursor:pointer;border-bottom:1px solid #E6DFCB">' + escapeHtml(r.t) + '</div>').join("");
  els("[data-pick]", results).forEach(x => x.addEventListener("click", () => {
    state.materials.push(x.dataset.pick);
    renderMaterialsChips();
    el("#materialsSearch").value = "";
    results.style.display = "none"; results.innerHTML = "";
  }));
});

function showAppearances(name, anchor) {
  const person = (state.people || []).find(p => p.name === name);
  const list = person ? person.appearances.map(a => a.campaign + (a.role ? " (" + a.role + ")" : "")).join("\\n") : "No other appearances yet.";
  alert(name + " has appeared in:\\n" + list);
}

async function uploadRowImage(fileInput, thumbImg) {
  if (!fileInput.files[0]) return null;
  const b64 = await fileToBase64(fileInput.files[0]);
  const up = await api("POST", "/api/upload-image", { filename: fileInput.files[0].name, base64: b64 });
  if (thumbImg) { thumbImg.src = up.path; thumbImg.classList.remove("hidden"); }
  return up.path;
}

function castRowEl(data) {
  const row = document.createElement("div");
  row.style.cssText = "border:1px solid var(--line);padding:10px;margin-bottom:10px;background:var(--panel)";
  row.innerHTML =
    '<div class="row"><div><label>Name</label><input data-f="name"></div><div><label>Role</label><input data-f="role"></div></div>' +
    '<label>Portrayed by</label>' +
    '<div style="display:flex;gap:6px"><input data-f="player" list="peopleList" style="flex:1"><button type="button" class="secondary" data-view>View</button></div>' +
    '<label>Description</label><textarea data-f="bio"></textarea>' +
    '<label>Portrait</label><img class="thumb hidden" data-thumb><input type="file" accept="image/*" data-f="portraitFile">' +
    '<button type="button" class="danger" data-remove style="margin-top:8px">Remove</button>';
  row.querySelector('[data-f="name"]').value = data.name || "";
  row.querySelector('[data-f="role"]').value = data.role || data.kind || "";
  row.querySelector('[data-f="player"]').value = data.player || "";
  row.querySelector('[data-f="bio"]').value = data.bio || "";
  row.dataset.portrait = data.portrait || "";
  const thumb = row.querySelector('[data-thumb]');
  if (data.portrait) { thumb.src = data.portrait; thumb.classList.remove("hidden"); }
  row.querySelector('[data-view]').addEventListener("click", () => showAppearances(row.querySelector('[data-f="player"]').value));
  row.querySelector('[data-remove]').addEventListener("click", () => row.remove());
  row.querySelector('[data-f="portraitFile"]').addEventListener("change", async (e) => {
    const path = await uploadRowImage(e.target, thumb);
    if (path) row.dataset.portrait = path;
  });
  return row;
}

async function renderCastRows(cast) {
  await ensureReviewsAndPeople();
  let dl = el("#peopleList");
  if (!dl) { dl = document.createElement("datalist"); dl.id = "peopleList"; document.body.appendChild(dl); }
  dl.innerHTML = state.people.map(p => '<option value="' + escapeHtml(p.name) + '">').join("");
  const box = el("#castRows");
  box.innerHTML = "";
  (cast || []).forEach(pc => box.appendChild(castRowEl(pc)));
}
el("#addCastRow").addEventListener("click", () => el("#castRows").appendChild(castRowEl({})));

function collectCastRows() {
  return els("#castRows > div").map(row => ({
    name: row.querySelector('[data-f="name"]').value,
    role: row.querySelector('[data-f="role"]').value,
    player: row.querySelector('[data-f="player"]').value,
    bio: row.querySelector('[data-f="bio"]').value,
    portrait: row.dataset.portrait || "",
  })).filter(c => c.name);
}

function episodeRowEl(ep) {
  const row = document.createElement("div");
  row.style.cssText = "border:1px solid var(--line);padding:10px;margin-bottom:10px;background:var(--panel)";
  row.dataset.n = ep.n; row.dataset.date = ep.date; row.dataset.rt = ep.rt;
  row.innerHTML =
    '<div style="font-size:13px;color:var(--faint);margin-bottom:6px">Episode ' + escapeHtml(ep.n) + ' · ' + escapeHtml(ep.date) + ' · ' + escapeHtml(ep.rt) + '</div>' +
    '<label>Title</label><input data-f="title">' +
    '<label>Summary</label><textarea data-f="hook"></textarea>' +
    '<label>Portrait</label><img class="thumb hidden" data-thumb><input type="file" accept="image/*" data-f="portraitFile">';
  row.querySelector('[data-f="title"]').value = ep.title || "";
  row.querySelector('[data-f="hook"]').value = ep.hook || "";
  row.dataset.img = ep.img || "";
  const thumb = row.querySelector('[data-thumb]');
  if (ep.img) { thumb.src = ep.img; thumb.classList.remove("hidden"); }
  row.querySelector('[data-f="portraitFile"]').addEventListener("change", async (e) => {
    const path = await uploadRowImage(e.target, thumb);
    if (path) row.dataset.img = path;
  });
  return row;
}

function renderEpisodeRows(episodes) {
  const box = el("#episodeRows");
  box.innerHTML = "";
  if (!episodes || !episodes.length) { box.innerHTML = '<div class="empty">No sessions logged for this campaign yet.</div>'; return; }
  episodes.forEach(ep => box.appendChild(episodeRowEl(ep)));
}

function collectEpisodeRows() {
  return els("#episodeRows > div").filter(row => row.dataset.n).map(row => ({
    n: row.dataset.n, date: row.dataset.date, rt: row.dataset.rt,
    title: row.querySelector('[data-f="title"]').value,
    hook: row.querySelector('[data-f="hook"]').value,
    img: row.dataset.img || "",
  }));
}

async function populateCampaignSelect() {
  const sel = el("#campaignSelect");
  if (!state.campaigns.length) {
    try { const r = await api("GET", "/api/list?type=campaigns"); state.campaigns = r.items; } catch (e) {}
  }
  sel.innerHTML = '<option value="">— One-Shot —</option>' +
    state.campaigns.map(c => '<option value="' + c.slug + '">' + escapeHtml(c.name) + '</option>').join("");
}

async function openModal(type, id) {
  state.type = type;
  state.editing = id;
  els(".editform").forEach(f => f.classList.add("hidden"));
  const form = el("#form-" + type);
  form.classList.remove("hidden");
  el(".thumb", form) && (el(".thumb", form).classList.add("hidden"));
  form.reset();
  el("#modal-msg").textContent = "";
  modalTitle.textContent = (id === null || id === undefined) ? "Add" : "Edit";
  backdrop.classList.add("active");

  if (type === "sessions") await populateCampaignSelect();

  if (type === "campaigns") {
    state.materials = []; state.cast = []; state.episodes = [];
    renderMaterialsChips();
    await renderCastRows([]);
    renderEpisodeRows([]);
    await populateSysSelect("", "");
  }

  if (id === null || id === undefined) return; // new entry, nothing to prefill

  try {
    const apiType = type === "oneshots" ? "sessions" : type;
    let qs = "type=" + apiType;
    if (apiType === "sessions") qs += "&n=" + id;
    else if (type === "dashboards") qs += "&index=" + id;
    else qs += "&slug=" + encodeURIComponent(id);
    const { item } = await api("GET", "/api/item?" + qs);
    Object.keys(item).forEach(k => {
      const field = form.querySelector('[name="' + k + '"]');
      if (!field) return;
      if (Array.isArray(item[k])) field.value = item[k].join(k === "summary" || k === "premise" || k === "writeup" ? "\\n\\n" : ", ");
      else field.value = item[k] == null ? "" : item[k];
    });
    if (type === "sessions") el("#campaignSelect").value = item.campaignSlug || "";
    if (type === "campaigns") {
      if (!item.summary && item.premise) el('#form-campaigns [name="summary"]').value = item.premise.join("\\n\\n");
      state.materials = (item.materials || []).slice();
      renderMaterialsChips();
      await renderCastRows(item.cast || []);
      renderEpisodeRows(item.episodes || []);
      await populateSysSelect(item.sys, item.ed);
    }
    const thumb = el(".thumb", form);
    if (thumb && (item.banner || item.cover)) {
      thumb.src = item.banner || item.cover;
      thumb.classList.remove("hidden");
    }
  } catch (e) {
    el("#modal-msg").textContent = "Error loading: " + e.message;
    el("#modal-msg").className = "msg err";
  }
}

function closeModal() {
  backdrop.classList.remove("active");
  state.editing = null;
  state.type = null;
}
el("#modal-close").addEventListener("click", closeModal);
el("#modal-cancel").addEventListener("click", closeModal);
backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });

els("[data-new]").forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.new, null)));

async function doDelete(type, id, title) {
  if (!confirm('Delete "' + title + '"? This cannot be undone.')) return;
  try {
    let qs = "";
    if (type === "sessions" || type === "oneshots") qs = "n=" + id;
    else if (type === "dashboards") qs = "index=" + id;
    else qs = "slug=" + encodeURIComponent(id);
    await api("DELETE", "/api/" + singularEndpoint(type) + "?" + qs);
    loadList(type);
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
}

el("#modal-save").addEventListener("click", async () => {
  const type = state.type;
  const form = el("#form-" + type);
  const msg = el("#modal-msg");
  msg.textContent = "Saving…"; msg.className = "msg";
  try {
    if (type === "campaigns") {
      el('[name="cast"]', form).value = JSON.stringify(collectCastRows());
      el('[name="episodes"]', form).value = JSON.stringify(collectEpisodeRows());
      el('[name="materials"]', form).value = JSON.stringify(state.materials);
    }
    const data = {};
    els("input,select,textarea", form).forEach(f => {
      if (f.type === "file") return;
      if (f.type === "checkbox") { data[f.name] = f.checked; return; }
      data[f.name] = f.value;
    });
    if ((type === "sessions" || type === "oneshots") && state.editing) data.n = state.editing;
    if (type === "dashboards" && state.editing !== null && state.editing !== undefined) data.index = state.editing;
    if (type === "oneshots") data.campaignSlug = "";

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
    setTimeout(() => { closeModal(); loadList(type); }, 700);
  } catch (e) {
    msg.textContent = "Error: " + e.message;
    msg.className = "msg err";
  }
});

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

    // Everything else: serve the static site build, but cap edge-cache
    // lifetime short so admin edits show up without needing a manual purge.
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "public, max-age=60, s-maxage=60, must-revalidate");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
