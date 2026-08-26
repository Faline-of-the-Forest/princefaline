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
  const res = await fetch(`${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    ...opts,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "princefaline-admin-worker",
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  });
  return res;
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
  const body = {
    message,
    content: b64EncodeUtf8(JSON.stringify(content, null, 2)),
    branch: BRANCH,
  };
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

function slugify(s) {
  return s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function handleApi(request, env, url) {
  if (!checkAuth(request, env)) return unauthorized();
  const path = url.pathname;

  try {
    if (path === "/api/session" && request.method === "POST") {
      const body = await request.json();
      const file = await getFile("content/sessions.json", env);
      const sessions = file.content.sessions;
      const nextN = sessions.length ? Math.max(...sessions.map(s => s.n)) + 1 : 1;
      sessions.push({ n: nextN, d: body.d, t: body.t, c: body.c, s: body.s, h: Number(body.h), rt: body.rt });
      await putFile("content/sessions.json", file.content, file.sha, `Add session: ${body.t}`, env);
      return json({ ok: true });
    }

    if (path === "/api/dashboard" && request.method === "POST") {
      const body = await request.json();
      const file = await getFile("content/dashboards.json", env);
      file.content.dashboards.push({
        t: body.t, c: body.c, sys: body.sys,
        tags: (body.tags || "").split(",").map(s => s.trim()).filter(Boolean),
        note: body.note, url: body.url, host: body.host || "",
      });
      await putFile("content/dashboards.json", file.content, file.sha, `Add game: ${body.t}`, env);
      return json({ ok: true });
    }

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
      await putFile(`content/campaigns/${slug}.json`, out, existing ? existing.sha : null, `${existing ? "Update" : "Add"} campaign: ${body.name}`, env);
      return json({ ok: true, slug });
    }

    if (path === "/api/review" && request.method === "POST") {
      const body = await request.json();
      const slug = body.slug || slugify(body.t + (body.ed ? "-" + body.ed : ""));
      const out = {
        slug, t: body.t, ed: body.ed || "", sys: body.sys, type: body.type,
        stars: Number(body.stars), date: body.date,
        tags: (body.tags || "").split(",").map(s => s.trim()).filter(Boolean),
        verdict: body.verdict, body: body.body,
        used: (body.used || "").split(",").map(s => s.trim()).filter(Boolean),
      };
      const existing = await getFile(`content/reviews/${slug}.json`, env);
      await putFile(`content/reviews/${slug}.json`, out, existing ? existing.sha : null, `${existing ? "Update" : "Add"} review: ${body.t}`, env);
      return json({ ok: true, slug });
    }

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
<style>
  body{font-family:Georgia,serif;background:#F6F1E4;color:#24211B;max-width:720px;margin:0 auto;padding:30px 20px 80px}
  h1{font-size:26px} h2{font-size:19px;margin-top:40px;border-top:2px solid #24211B;padding-top:20px}
  label{display:block;margin:12px 0 4px;font-size:14px;color:#5B5648}
  input,select,textarea{width:100%;padding:8px;border:1px solid #C8BFA6;background:#FBF8EF;font:inherit;font-size:15px;box-sizing:border-box}
  textarea{min-height:80px}
  button{margin-top:16px;padding:10px 18px;background:#2F4633;color:#F6F1E4;border:1px solid #24211B;font:inherit;cursor:pointer}
  button:hover{background:#24211B}
  .msg{margin-top:10px;font-size:14px}
  .msg.ok{color:#2F4633} .msg.err{color:#A5231F}
  .row{display:flex;gap:10px} .row > div{flex:1}
</style>
</head>
<body>
<h1>Prince Faline's RPG Diaries — Admin</h1>
<p>Add entries below. Each save commits directly to the site's repo and the live site rebuilds automatically within a minute or two.</p>

<h2>Add Session (Ledger Entry)</h2>
<form id="f-session">
  <div class="row">
    <div><label>Date</label><input name="d" type="date" required></div>
    <div><label>Runtime (HH:MM)</label><input name="rt" placeholder="04:00" required></div>
  </div>
  <label>Title</label><input name="t" required>
  <label>Campaign (exact name, or "One-Shot")</label><input name="c" required>
  <label>System</label><input name="s" required>
  <label>Hours (decimal, e.g. 4.0)</label><input name="h" type="number" step="0.01" required>
  <button type="submit">Save Session</button>
  <div class="msg"></div>
</form>

<h2>Add / Update Campaign</h2>
<form id="f-campaign">
  <label>Name (must match ledger campaign names exactly)</label><input name="name" required>
  <label>Slug (leave blank to auto-generate)</label><input name="slug">
  <label>System</label><input name="sys" required>
  <label>Status</label>
  <select name="status"><option value="running">Running</option><option value="between arcs">Between Arcs</option><option value="concluded">Concluded</option></select>
  <label>Tagline</label><input name="tagline">
  <label>Tags (comma-separated)</label><input name="tags">
  <label>Premise (separate paragraphs with a blank line)</label><textarea name="premise"></textarea>
  <label>Influences</label><input name="influences">
  <label>Banner image</label><input name="bannerFile" type="file" accept="image/*">
  <button type="submit">Save Campaign</button>
  <div class="msg"></div>
</form>

<h2>Add / Update Review</h2>
<form id="f-review">
  <div class="row">
    <div><label>Title</label><input name="t" required></div>
    <div><label>Edition (optional)</label><input name="ed"></div>
  </div>
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
  <button type="submit">Save Review</button>
  <div class="msg"></div>
</form>

<h2>Add Game</h2>
<form id="f-game">
  <label>Title</label><input name="t" required>
  <label>Campaign</label><input name="c" required>
  <label>System</label><input name="sys" required>
  <label>Tags (comma-separated)</label><input name="tags">
  <label>Note</label><textarea name="note"></textarea>
  <label>Live URL</label><input name="url" required>
  <button type="submit">Save Game</button>
  <div class="msg"></div>
</form>

<script>
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function submitForm(form, endpoint, extra) {
  const msg = form.querySelector(".msg");
  msg.textContent = "Saving…"; msg.className = "msg";
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    Object.assign(data, extra || {});
    const res = await fetch(endpoint, { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
    const out = await res.json();
    if (!res.ok || out.error) throw new Error(out.error || "Save failed");
    msg.textContent = "Saved. Site will rebuild shortly.";
    msg.className = "msg ok";
    form.reset();
  } catch (e) {
    msg.textContent = "Error: " + e.message;
    msg.className = "msg err";
  }
}

document.getElementById("f-session").addEventListener("submit", e => {
  e.preventDefault(); submitForm(e.target, "/api/session");
});
document.getElementById("f-game").addEventListener("submit", e => {
  e.preventDefault(); submitForm(e.target, "/api/dashboard");
});
document.getElementById("f-review").addEventListener("submit", e => {
  e.preventDefault(); submitForm(e.target, "/api/review");
});
document.getElementById("f-campaign").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const fileInput = form.querySelector('[name="bannerFile"]');
  let banner;
  if (fileInput.files[0]) {
    const b64 = await fileToBase64(fileInput.files[0]);
    const up = await fetch("/api/upload-image", { method: "POST", body: JSON.stringify({ filename: fileInput.files[0].name, base64: b64 }), headers: { "content-type": "application/json" } });
    const upOut = await up.json();
    if (upOut.path) banner = upOut.path;
  }
  submitForm(form, "/api/campaign", { banner });
});
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
