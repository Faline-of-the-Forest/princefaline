/* Prince Faline's RPG Diaries — in-page editing.
   Inert for visitors. After "Sign in" (footer, or Ctrl/Cmd+Shift+L) it adds
   "+ New" buttons and edit/delete tools to the pages themselves, and saves
   through the same /api endpoints the old /admin panel used: every save is a
   commit to GitHub, and the site rebuilds itself a minute or two later. */
(function () {
  "use strict";
  var TOKEN_KEY = "pf-admin-token";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  var I = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>'
  };

  // ---------- API ----------
  async function api(method, url, body) {
    var res = await fetch(url, {
      method: method,
      headers: Object.assign({ authorization: "Bearer " + getToken() }, body ? { "content-type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    var out = await res.json().catch(function () { return {}; });
    if (res.status === 401) { signOut(); throw new Error("Your sign-in has expired. Sign in again."); }
    if (!res.ok || out.error) throw new Error(out.error || res.status + " error");
    return out;
  }
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1]); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  async function upload(input) {
    if (!input || !input.files || !input.files[0]) return null;
    var f = input.files[0];
    var up = await api("POST", "/api/upload-image", { filename: f.name, base64: await fileToBase64(f) });
    return up.path;
  }
  var cache = {};
  async function list(type) {
    if (!cache[type]) { try { cache[type] = (await api("GET", "/api/list?type=" + type)).items || []; } catch (e) { cache[type] = []; } }
    return cache[type];
  }
  function hoursFromRuntime(rt) {
    var m = /^\s*(\d+)\s*:\s*([0-5]?\d)\s*$/.exec(String(rt || ""));
    return m ? String(Math.round((+m[1] + +m[2] / 60) * 100) / 100) : "";
  }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

  // ---------- UI shell ----------
  var modal, form, mTitle, mMsg, toastEl;
  function buildShell() {
    modal = document.createElement("dialog");
    modal.id = "pf-modal";
    modal.innerHTML = '<header id="pf-title"></header><form id="pf-form" novalidate></form>';
    document.body.appendChild(modal);
    form = $("#pf-form"); mTitle = $("#pf-title");
    toastEl = document.createElement("div");
    toastEl.className = "pf-toast";
    document.body.appendChild(toastEl);
  }
  var toastTimer;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, ms || 6000);
  }
  function openModal(title, html, onSave, saveLabel) {
    mTitle.textContent = title;
    form.innerHTML = html + '<p class="err" id="pf-msg"></p><div class="actions"><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">' + (saveLabel || "Save") + "</button></div>";
    mMsg = $("#pf-msg", form);
    $("[data-cancel]", form).onclick = function () { modal.close(); };
    form.onsubmit = async function (e) {
      e.preventDefault();
      var btn = $(".primary", form);
      btn.disabled = true; mMsg.textContent = ""; mMsg.className = "meta"; mMsg.textContent = "Saving…";
      try { await onSave(); }
      catch (err) { mMsg.className = "err"; mMsg.textContent = err.message; btn.disabled = false; }
    };
    $$("[data-today]", form).forEach(function (b) { b.onclick = function () { b.previousElementSibling.value = today(); }; });
    if (!modal.open) modal.showModal();
  }
  function saved(what) {
    modal.close();
    toast(what + " saved. It's committed to GitHub; the page updates in a minute or two once the site rebuilds.", 9000);
  }
  function val(name) { var f = form.elements[name]; return f ? f.value : ""; }
  function setVal(name, v) { var f = form.elements[name]; if (f) f.value = v == null ? "" : v; }
  function fld(label, inner, hint) { return "<label>" + label + (hint ? " <small>" + hint + "</small>" : "") + inner + "</label>"; }
  function inp(name, attrs) { return '<input name="' + name + '" ' + (attrs || "") + ">"; }
  function area(name, rows, attrs) { return '<textarea name="' + name + '" rows="' + (rows || 4) + '" ' + (attrs || "") + "></textarea>"; }
  function imgField(label, name, current, hint) {
    return fld(label, '<span class="pf-img">' + (current ? '<img src="' + esc(current) + '" alt="">' : "") + '<input type="file" accept="image/*" name="' + name + '"></span>', hint);
  }

  // A system dropdown filled from Reviews of type "System" (where editions live).
  // A value with no matching review is kept as "~keep" so editing never rewrites it.
  async function systemSelect(curSys, curEd) {
    var systems = (await list("reviews")).filter(function (r) { return r.type === "System"; });
    var match = systems.find(function (r) { return r.t === curSys && (r.ed || "") === (curEd || ""); });
    var html = '<option value="">— choose a system —</option>' + systems.map(function (r) {
      return '<option value="' + esc(r.slug) + '"' + (match && match.slug === r.slug ? " selected" : "") + ">" + esc(r.t) + (r.ed ? " (" + esc(r.ed) + ")" : "") + "</option>";
    }).join("");
    if (curSys && !match) html += '<option value="~keep" selected>' + esc(curSys) + (curEd ? " (" + esc(curEd) + ")" : "") + " — not on the Shelf</option>";
    return html;
  }
  function bindSystem(selName, sysName, edName) {
    var sel = form.elements[selName];
    sel.addEventListener("change", async function () {
      if (sel.value === "~keep") return;
      var r = (await list("reviews")).find(function (x) { return x.slug === sel.value; });
      setVal(sysName, r ? r.t : ""); setVal(edName, r ? r.ed || "" : "");
    });
  }

  // ---------- Sessions (campaign sessions and one-shots) ----------
  async function sessionForm(n, preset) {
    var item = {};
    if (n) item = (await api("GET", "/api/item?type=sessions&n=" + encodeURIComponent(n))).item;
    else item = { d: today(), campaignSlug: (preset && preset.campaign) || "" };
    var camps = await list("campaigns");
    var campOpts = '<option value="">— One-shot —</option>' + camps.map(function (c) {
      return '<option value="' + esc(c.slug) + '"' + (c.slug === item.campaignSlug ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
    var html =
      '<div class="two-up">' + fld("Date", '<span class="pf-with">' + inp("d", 'type="date" required') + '<button type="button" data-today>Today</button></span>') +
      fld("Runtime", inp("rt", 'placeholder="04:00" required'), "HH:MM") + "</div>" +
      fld("Title", inp("t", "required")) +
      fld("Campaign", '<select name="campaignSlug">' + campOpts + "</select>") +
      '<p class="meta" id="pf-inherit"></p>' +
      '<div id="pf-os">' +
        fld("System", '<select name="sysPick">' + (await systemSelect(item.campaignSlug ? "" : item.s, item.campaignSlug ? "" : item.ed)) + "</select>", "from the Shelf") +
        fld("Write-up", area("writeup", 6), "blank line between paragraphs") +
        imgField("Cover image", "coverFile", item.cover, "square works best") +
      "</div>" +
      inp("s", 'type="hidden"') + inp("ed", 'type="hidden"') + inp("slug", 'type="hidden"');
    openModal(n ? "Edit Session" : "Log a Session", html, async function () {
      var oneShot = !val("campaignSlug");
      if (!val("d") || !val("t") || !hoursFromRuntime(val("rt"))) throw new Error("Date, title and a runtime like 03:30 are required.");
      if (oneShot && !val("s")) throw new Error("Pick a system for the one-shot.");
      var data = { d: val("d"), t: val("t"), rt: val("rt"), h: hoursFromRuntime(val("rt")), campaignSlug: val("campaignSlug"), s: val("s"), ed: val("ed") };
      if (n) data.n = n;
      if (oneShot) {
        data.slug = val("slug");
        data.writeup = val("writeup");
        data.cover = (await upload(form.elements.coverFile)) || item.cover || "";
      }
      await api("POST", "/api/session", data);
      saved("Session");
    }, n ? "Save" : "Log session");
    ["d", "rt", "t", "s", "ed", "slug"].forEach(function (k) { setVal(k, item[k]); });
    setVal("writeup", (item.writeup || []).join("\n\n"));
    bindSystem("sysPick", "s", "ed");
    function sync() {
      var slug = val("campaignSlug");
      var c = camps.find(function (x) { return x.slug === slug; });
      $("#pf-os", form).hidden = !!slug;
      $("#pf-inherit", form).textContent = c ? "System: " + c.sys + (c.ed ? " · " + c.ed : "") + " (from the campaign)" : "";
      if (c) { setVal("s", c.sys); setVal("ed", c.ed || ""); }
      else if (form.elements.sysPick.value && form.elements.sysPick.value !== "~keep") form.elements.sysPick.dispatchEvent(new Event("change"));
    }
    form.elements.campaignSlug.addEventListener("change", sync);
    sync();
  }

  // ---------- Campaigns ----------
  function castRow(pc) {
    var d = document.createElement("div");
    d.className = "pf-row";
    d.dataset.portrait = pc.portrait || "";
    d.innerHTML =
      '<div class="two-up"><label>Name<input data-f="name"></label><label>Role<input data-f="role"></label></div>' +
      '<label>Portrayed by<input data-f="player" list="pf-people"></label>' +
      '<label>Description<textarea data-f="bio" rows="3"></textarea></label>' +
      '<label>Portrait <span class="pf-img">' + (pc.portrait ? '<img src="' + esc(pc.portrait) + '" alt="">' : "") + '<input type="file" accept="image/*" data-f="file"></span></label>' +
      '<button type="button" class="pf-rm">Remove character</button>';
    $('[data-f="name"]', d).value = pc.name || "";
    $('[data-f="role"]', d).value = pc.role || pc.kind || "";
    $('[data-f="player"]', d).value = pc.player || "";
    $('[data-f="bio"]', d).value = pc.bio || "";
    $(".pf-rm", d).onclick = function () { d.remove(); };
    return d;
  }
  function episodeRow(ep) {
    var d = document.createElement("div");
    d.className = "pf-row";
    d.dataset.n = ep.n; d.dataset.date = ep.date; d.dataset.rt = ep.rt; d.dataset.img = ep.img || "";
    d.innerHTML =
      '<p class="kicker">Episode ' + esc(ep.n) + " · " + esc(ep.date) + " · " + esc(ep.rt) + "</p>" +
      '<label>Title<input data-f="title"></label>' +
      '<label>Summary<textarea data-f="hook" rows="3"></textarea></label>' +
      '<label>Image <span class="pf-img">' + (ep.img ? '<img src="' + esc(ep.img) + '" alt="">' : "") + '<input type="file" accept="image/*" data-f="file"></span></label>';
    $('[data-f="title"]', d).value = ep.title || "";
    $('[data-f="hook"]', d).value = ep.hook || "";
    return d;
  }
  async function campaignForm(slug) {
    var item = { status: "running", cast: [], episodes: [], materials: [] };
    if (slug) item = (await api("GET", "/api/item?type=campaigns&slug=" + encodeURIComponent(slug))).item;
    var reviews = await list("reviews");
    var people = await list("people");
    var materials = (item.materials || []).slice();
    var html =
      fld("Name", inp("name", "required")) +
      '<div class="two-up">' + fld("System", '<select name="sysPick">' + (await systemSelect(item.sys, item.ed)) + "</select>", "from the Shelf") +
      fld("Status", '<select name="status"><option value="running">Running</option><option value="between arcs">Between arcs</option><option value="concluded">Concluded</option></select>') + "</div>" +
      fld("Tagline", inp("tagline")) +
      fld("Summary", area("summary", 6), "blank line between paragraphs") +
      fld("Influences", inp("influences")) +
      fld("Materials", '<input id="pf-mat-q" placeholder="Search the Shelf…" autocomplete="off"><span class="pf-chips" id="pf-mat"></span><span class="pf-results" id="pf-mat-r"></span>') +
      imgField("Banner", "bannerFile", item.banner, "wide image") +
      '<div class="pf-sub"><p class="kicker">Cast</p><div id="pf-cast"></div><button type="button" id="pf-add-cast">+ Add character</button></div>' +
      '<div class="pf-sub"><p class="kicker">Episodes</p><p class="meta">Date, number and runtime come from the logged sessions. Add a title, summary and image for each.</p><div id="pf-eps"></div></div>' +
      inp("sys", 'type="hidden"') + inp("ed", 'type="hidden"') + inp("slug", 'type="hidden"') +
      '<datalist id="pf-people">' + people.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join("") + "</datalist>";
    openModal(slug ? "Edit Campaign" : "New Campaign", html, async function () {
      if (!val("name") || !val("sys")) throw new Error("A name and a system are required.");
      var cast = [];
      for (var row of $$("#pf-cast .pf-row", form)) {
        var p = (await upload($('[data-f="file"]', row))) || row.dataset.portrait;
        var c = { name: $('[data-f="name"]', row).value, role: $('[data-f="role"]', row).value, player: $('[data-f="player"]', row).value, bio: $('[data-f="bio"]', row).value, portrait: p || "" };
        if (c.name) cast.push(c);
      }
      var eps = [];
      for (var er of $$("#pf-eps .pf-row", form)) {
        eps.push({ n: er.dataset.n, date: er.dataset.date, rt: er.dataset.rt, title: $('[data-f="title"]', er).value, hook: $('[data-f="hook"]', er).value, img: (await upload($('[data-f="file"]', er))) || er.dataset.img });
      }
      var data = {
        name: val("name"), slug: val("slug"), sys: val("sys"), ed: val("ed"), status: val("status"),
        tagline: val("tagline"), summary: val("summary"), influences: val("influences"),
        materials: JSON.stringify(materials), cast: JSON.stringify(cast), episodes: JSON.stringify(eps),
        banner: (await upload(form.elements.bannerFile)) || item.banner || ""
      };
      await api("POST", "/api/campaign", data);
      saved("Campaign");
    });
    ["name", "slug", "sys", "ed", "status", "tagline", "influences"].forEach(function (k) { setVal(k, item[k]); });
    setVal("summary", (item.summary || item.premise || []).join("\n\n"));
    bindSystem("sysPick", "sys", "ed");
    (item.cast || []).forEach(function (pc) { $("#pf-cast", form).appendChild(castRow(pc)); });
    $("#pf-add-cast", form).onclick = function () { $("#pf-cast", form).appendChild(castRow({})); };
    if ((item.episodes || []).length) item.episodes.forEach(function (ep) { $("#pf-eps", form).appendChild(episodeRow(ep)); });
    else $("#pf-eps", form).innerHTML = '<p class="meta">No sessions logged for this campaign yet.</p>';
    function chips() {
      $("#pf-mat", form).innerHTML = materials.map(function (t, i) { return "<span>" + esc(t) + ' <b data-i="' + i + '">×</b></span>'; }).join("");
      $$("#pf-mat b", form).forEach(function (b) { b.onclick = function () { materials.splice(+b.dataset.i, 1); chips(); }; });
    }
    chips();
    $("#pf-mat-q", form).addEventListener("input", function () {
      var q = this.value.trim().toLowerCase(), box = $("#pf-mat-r", form);
      var hits = q ? reviews.filter(function (r) { return r.t.toLowerCase().indexOf(q) >= 0 && materials.indexOf(r.t) < 0; }).slice(0, 8) : [];
      box.innerHTML = hits.map(function (r) { return '<span data-t="' + esc(r.t) + '">' + esc(r.t) + "</span>"; }).join("");
      $$("span", box).forEach(function (s) { s.onclick = function () { materials.push(s.dataset.t); chips(); box.innerHTML = ""; $("#pf-mat-q", form).value = ""; }; });
    });
  }

  // ---------- Reviews (the Shelf) ----------
  async function reviewForm(slug) {
    var item = { type: "System", stars: 4, date: today().slice(0, 7) };
    if (slug) item = (await api("GET", "/api/item?type=reviews&slug=" + encodeURIComponent(slug))).item;
    var html =
      '<div class="two-up">' + fld("Title", inp("t", "required")) + fld("Edition", inp("ed"), "optional") + "</div>" +
      fld("System", inp("sys", "required")) +
      '<div class="two-up">' + fld("Material", '<select name="type"><option>System</option><option>Module</option><option>Supplement</option><option>Resource</option></select>') +
      fld("Stars", inp("stars", 'type="number" min="0" max="5" required')) + "</div>" +
      fld("Reviewed", inp("date", 'placeholder="2026-08" required'), "YYYY-MM") +
      fld("Verdict", inp("verdict", "required"), "one line") +
      fld("Review", area("body", 7)) +
      fld("Tags", inp("tags"), "comma-separated") +
      fld("Put to the table in", inp("used"), "campaign names, or One-Shots, comma-separated") +
      imgField("Cover", "coverFile", item.cover) +
      inp("slug", 'type="hidden"');
    openModal(slug ? "Edit Review" : "New Review", html, async function () {
      if (!val("t") || !val("sys") || !val("verdict") || !/^\d{4}-\d{2}$/.test(val("date"))) throw new Error("Title, system, verdict and a YYYY-MM date are required.");
      var data = {};
      ["t", "ed", "slug", "sys", "type", "stars", "date", "tags", "verdict", "body", "used"].forEach(function (k) { data[k] = val(k); });
      data.cover = (await upload(form.elements.coverFile)) || item.cover || "";
      await api("POST", "/api/review", data);
      saved("Review");
    });
    ["t", "ed", "slug", "sys", "type", "stars", "date", "verdict", "body"].forEach(function (k) { setVal(k, item[k]); });
    setVal("tags", (item.tags || []).join(", "));
    setVal("used", (item.used || []).join(", "));
  }

  // ---------- Games ----------
  async function gameForm(index) {
    var item = { kind: "Dashboard" };
    if (index !== undefined && index !== "") item = (await api("GET", "/api/item?type=dashboards&index=" + encodeURIComponent(index))).item;
    var html =
      fld("Title", inp("t", "required")) +
      '<div class="two-up">' + fld("Campaign", inp("c", "required")) + fld("System", inp("sys", "required")) + "</div>" +
      '<div class="two-up">' + fld("Type", '<select name="kind"><option>Dashboard</option><option>Playset</option><option>Character Sheet</option></select>') + fld("Players", inp("players", 'placeholder="3–5"')) + "</div>" +
      fld("Description", area("note", 3, 'maxlength="110"'), '<span id="pf-count">0/110</span> so it fits the tile') +
      fld("Live URL", inp("url", "required")) +
      imgField("Photo", "photoFile", item.icon, "tile background") +
      imgField("Logo", "logoFile", item.logo, "shown over the photo on hover") +
      fld("Logo colour", '<select name="logoStyle"><option value="">Dark / black logo (shown inverted)</option><option value="white">White / light logo</option></select>');
    openModal(item.t ? "Edit Game" : "New Game", html, async function () {
      if (!val("t") || !val("url")) throw new Error("A title and a live URL are required.");
      var data = {};
      ["t", "c", "sys", "kind", "players", "note", "url", "logoStyle"].forEach(function (k) { data[k] = val(k); });
      data.host = item.host || "";
      if (index !== undefined && index !== "") data.index = index;
      var icon = await upload(form.elements.photoFile), logo = await upload(form.elements.logoFile);
      if (icon) data.icon = icon;
      if (logo) data.logo = logo;
      await api("POST", "/api/dashboard", data);
      saved("Game");
    });
    ["t", "c", "sys", "kind", "players", "note", "url", "logoStyle"].forEach(function (k) { setVal(k, item[k]); });
    var note = form.elements.note, count = $("#pf-count", form);
    var upd = function () { count.textContent = note.value.length + "/110"; };
    note.addEventListener("input", upd); upd();
  }

  // ---------- dispatch ----------
  var FORMS = { session: sessionForm, campaign: campaignForm, review: reviewForm, game: gameForm };
  var DELETE = {
    session: function (id) { return "/api/session?n=" + encodeURIComponent(id); },
    campaign: function (id) { return "/api/campaign?slug=" + encodeURIComponent(id); },
    review: function (id) { return "/api/review?slug=" + encodeURIComponent(id); },
    game: function (id) { return "/api/dashboard?index=" + encodeURIComponent(id); }
  };
  async function run(fn) {
    try { await fn(); }
    catch (e) { if (modal.open && mMsg) { mMsg.className = "err"; mMsg.textContent = e.message; } else toast(e.message); }
  }
  function decorate() {
    $$("[data-edit]").forEach(function (el) {
      if (el.querySelector(":scope > .tools")) return;
      var parts = el.dataset.edit.split(":"), type = parts[0], id = parts.slice(1).join(":");
      var t = document.createElement("span");
      t.className = "tools admin-only";
      t.innerHTML = '<button type="button" title="Edit">' + I.edit + '</button><button type="button" class="del" title="Delete">' + I.del + "</button>";
      var b = t.querySelectorAll("button");
      b[0].onclick = function (e) { e.preventDefault(); e.stopPropagation(); run(function () { return FORMS[type](id); }); };
      b[1].onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var name = el.dataset.name || id;
        if (!confirm('Delete "' + name + '"?\n\nIt disappears from the site after the next rebuild (it stays recoverable in the GitHub history).')) return;
        run(async function () { await api("DELETE", DELETE[type](id)); toast('"' + name + '" deleted. The page updates once the site rebuilds.', 9000); });
      };
      el.appendChild(t);
    });
    $$("[data-add]").forEach(function (b) {
      if (b._pf) return;
      b._pf = true;
      b.onclick = function (e) { e.preventDefault(); run(function () { return FORMS[b.dataset.add](null, { campaign: b.dataset.campaign }); }); };
    });
  }

  // ---------- sign in / out ----------
  function setAdmin(on) {
    document.body.classList.toggle("admin", on);
    if (on) decorate();
  }
  function signOut() { setToken(""); setAdmin(false); }
  function loginForm() {
    openModal("Sign in", fld("Password", '<input name="pw" type="password" autocomplete="current-password" required autofocus>'), async function () {
      var res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: val("pw") }) });
      var out = await res.json().catch(function () { return {}; });
      if (!res.ok || !out.token) throw new Error(out.error || "Sign-in failed (" + res.status + ").");
      setToken(out.token);
      modal.close();
      setAdmin(true);
      toast("Signed in. Use the + buttons and the edit tools that appear on hover.");
    }, "Sign in");
  }

  function init() {
    buildShell();
    var signIn = $("#pf-signin"), signOutBtn = $("#pf-signout");
    if (signIn) signIn.onclick = function (e) { e.preventDefault(); loginForm(); };
    if (signOutBtn) signOutBtn.onclick = function (e) { e.preventDefault(); signOut(); toast("Signed out."); };
    addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); getToken() ? signOut() : loginForm(); }
    });
    if (getToken()) {
      setAdmin(true);
      api("GET", "/api/whoami").catch(function () {}); // drops an expired token quietly
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
