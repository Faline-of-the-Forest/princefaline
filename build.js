const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CONTENT = path.join(ROOT, "content");
const DIST = path.join(ROOT, "dist");

const sessions = JSON.parse(fs.readFileSync(path.join(CONTENT, "sessions.json"), "utf8")).sessions;
const dashboards = JSON.parse(fs.readFileSync(path.join(CONTENT, "dashboards.json"), "utf8")).dashboards;
const campaigns = fs.readdirSync(path.join(CONTENT, "campaigns"))
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(CONTENT, "campaigns", f), "utf8")));
const reviews = fs.readdirSync(path.join(CONTENT, "reviews"))
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(CONTENT, "reviews", f), "utf8")));

// ---------- derive stats from the ledger (single source of truth) ----------
// Sessions link to campaigns by stable slug (campaignSlug), never by name text —
// avoids ambiguity if two campaigns ever share a display name.
function computeCampaignStats(slug) {
  const rows = sessions.filter(s => s.campaignSlug === slug);
  const h = rows.reduce((a, s) => a + s.h, 0);
  const first = rows.length ? rows[0].d : null;
  const last = rows.length ? rows[rows.length - 1].d : null;
  return { n: rows.length, h, first, last, rt: hrsToRt(h) };
}
function hrsToRt(h) {
  const totalMin = Math.round(h * 60);
  return String(Math.floor(totalMin / 60)).padStart(2, "0") + ":" + String(totalMin % 60).padStart(2, "0");
}
campaigns.forEach(c => Object.assign(c, computeCampaignStats(c.slug)));
const campaignBySlug = Object.fromEntries(campaigns.map(c => [c.slug, c]));

const oneShots = sessions.filter(s => !s.campaignSlug);
const stats = {
  games: sessions.length,
  hours: sessions.reduce((a, s) => a + s.h, 0),
  campaigns: campaigns.length,
  oneShots: oneShots.length,
  systems: new Set(sessions.map(s => s.s)).size,
  since: sessions[0] ? mon(sessions[0].d) : "",
};
stats.avg = hrsToRt(stats.hours / stats.games);
const byYear = {};
sessions.forEach(s => { const y = s.d.slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; });
stats.byYear = byYear;
const bySystem = {};
sessions.forEach(s => { bySystem[s.s] = (bySystem[s.s] || 0) + 1; });
const topSystem = Object.entries(bySystem).sort((a, b) => b[1] - a[1])[0];
stats.topSystem = topSystem;
const longest = campaigns.slice().sort((a, b) => b.n - a.n)[0];
stats.longest = longest;

// ---------- helpers ----------
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function mon(d) { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return d ? m[+d.slice(5,7)-1] + " " + d.slice(0,4) : ""; }
function stars(n) { return { full: "★".repeat(n), empty: "☆".repeat(5 - n) }; }
const CAMPAIGN_BLURBS = {
  "bloodletting": "New Orleans, 1990. Three dead men circle each other while the living city bleeds.",
  "Yazeba's Bed & Breakfast": "A house, its residents, and whichever chapter we feel like turning to that night.",
  "The Mall": "Six retail employees, one dying shopping centre, and an infection nobody clocked out of.",
  "50 Fathoms": "A drowned world and a privateer crew chasing L’Ollonaise’s treasure across it.",
  "Predator: Savage Planet": "Just begun — a hunt where the party is not the one doing the hunting.",
  "P'tite Arcadie": "Un héxacrâwl acadien, run in French, one chapter of Fond-des-Chicots at a time.",
  "Gradient Descent": "Twelve descents into the Deep. The station rearranged itself whether we looked or not.",
  "The Heart of the Mystery": "Magical girls, a small town, and a case board that kept growing new pins.",
  "Mondo Carne": "Italian-dubbed sci-fi horror, played for the grime and the melodrama.",
  "Skunks": "A cabal crossing America state by state, one obsession at a time.",
  "The Blooming of Hungry Hollow": "Brea Gibney, undone, erased, then dreaming. A town that will not stay put.",
  "The Parthenogenesis of Hungry Hollow": "Five sessions of scripture and rot in the first Hungry Hollow cycle.",
  "Strange Adventures!": "Skateland, Chanky Cheez and a lake that remembers. Kids on bikes, second edition.",
  "Hollowed Roots": "The long DC20 playtest campaign: firbolgs, churches, and the Malum Tree.",
  "SUB_URBIA": "Town, milk, meat. Three sessions of suburban dread.",
  "Donjons & Catacombes Classique": "Classic DCC in French, played straight and deadly.",
  "When Night Falls on Sunnydale": "The very first campaign in this archive. Three nights in Sunnydale.",
  "TBD": "One session in, still unnamed. The Welling House is where it started.",
};
function blurb(c) { return CAMPAIGN_BLURBS[c.name] || (c.sys + " — " + c.n + " sessions logged."); }
function bookCover(review) {
  if (review.cover) return review.cover;
  // uploads/book_<slug>.webp if it exists locally
  const map = {
    "Gradient Descent": "book_mothership-gradientdescent",
    "Mothership": "book_mothership-hundreds",
    "Liminal Horror": "book_liminalhorror",
    "The Mall": "book_liminalhorror_themall",
    "Yazeba's Bed & Breakfast": "book_yazeba",
    "Chronicles of Darkness": "book_cod_chroniclesofdarkness",
    "Vampire: The Requiem": "book_cod_vampiretherequiem",
    "City of the Damned: New Orleans": "book_cod_neworleans",
    "Kids on Bikes": "book_kidsonbikes-deluxe",
    "Knave": "book_knave",
    "Apothecaria": "book_apothecaria",
    "Ravenloft": "book_dnda1-ravenloft",
    "Dead Planet": "book_mothership-deadplanet",
  };
  return map[review.t] ? `/uploads/${map[review.t]}.webp` : "";
}

// ---------- formatting ----------
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function monthLong(d) { return MONTHS_LONG[+d.slice(5, 7) - 1] + " " + d.slice(0, 4); }
function fmtDate(d) { return +d.slice(8, 10) + " " + MONTHS_LONG[+d.slice(5, 7) - 1] + " " + d.slice(0, 4); }
function fmtRt(rt) { return String(rt || "").replace(/^0/, ""); }
function same(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
function statusLabel(s) { return s === "running" ? "Running" : s === "between arcs" ? "Between arcs" : "Concluded"; }
function runSpan(c) { return mon(c.first) + " – " + (c.status === "running" ? "present" : mon(c.last)); }
function sysLine(base, ed) { return esc(base) + (ed ? `<span class="ed">${esc(ed)}</span>` : ""); }
function starsHtml(n) { return `<span class="stars" aria-label="${n} out of 5">${"★".repeat(n)}<i>${"☆".repeat(5 - n)}</i></span>`; }
function label(title, aside, add) { return `<div class="label"><h2>${title}</h2><span class="rule"></span>${aside ? `<span class="aside">${aside}</span>` : ""}${add || ""}</div>`; }
// Signed-in editing hooks (assets/edit.js): "+ New" buttons and per-item edit tools.
function addBtn(type, text, campaign) { return `<button type="button" class="add admin-only" data-add="${type}"${campaign ? ` data-campaign="${esc(campaign)}"` : ""}>+ ${text}</button>`; }
function editAttr(type, id, name) { return ` data-edit="${type}:${esc(id)}" data-name="${esc(name)}"`; }

// A two-colour "print cover" stands in wherever there is no image yet.
function cover(name, sys, img, opts) {
  const o = opts || {};
  if (img) return `<div class="cv${o.contain ? " contain" : ""}" style="width:100%;height:100%"><img src="${esc(img)}" alt="${esc(name)}" loading="lazy"></div>`;
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<div class="pc ${h % 4 === 0 ? "red" : ""} l${h % 3}"><div class="pc-dots"></div><div class="pc-title">${esc(name)}</div>${sys && !o.noSys ? `<div class="pc-sys">${esc(sys)}</div>` : ""}</div>`;
}

// ---------- layout ----------
const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Courier+Prime&display=swap" rel="stylesheet">`;
const assetVer = f => require("crypto").createHash("md5").update(fs.readFileSync(path.join(ROOT, "assets", f))).digest("hex").slice(0, 8);
const CSS_VER = assetVer("site.css"), JS_VER = assetVer("edit.js");
const latestSession = sessions.slice().sort((a, b) => b.d.localeCompare(a.d) || b.n - a.n)[0];

function nav(active) {
  const items = [["Front Page", "/", "Home"], ["Campaigns", "/campaigns/", "Campaigns"], ["One-Shots", "/one-shots/", "One-Shots"], ["The Shelf", "/reviews/", "Reviews"], ["Games", "/games/", "Games"]];
  return items.map(([l, href, key]) => `<a href="${href}"${active === key ? ' class="on"' : ""}>${l}</a>`).join("");
}

function layout({ title, active, body, description }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="/uploads/faline-s-rpg-guild-icon-1024.png">
<link rel="apple-touch-icon" href="/uploads/faline-s-rpg-guild-icon-1024.png">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}
${FONT_LINK}
<link rel="stylesheet" href="/assets/site.css?v=${CSS_VER}">
<script src="/assets/edit.js?v=${JS_VER}" defer></script>
</head>
<body>
<div class="container">
  <header class="mast">
    <div class="issue"><span>No. ${sessions.length}</span><span>A tabletop journal · Est. 2024</span><span>${latestSession ? fmtDate(latestSession.d) : ""}</span></div>
    <a href="/" class="mast-title" aria-label="Prince Faline's RPG Diaries"><small>Prince Faline's</small><b><img class="mast-r" src="/assets/logo-r.webp" alt="R" width="372" height="353">PG Diaries</b></a>
    <p class="mast-sub">Sessions · Campaigns · Reviews · Games</p>
    <nav>${nav(active)}</nav>
  </header>
  <main>
${body}
  </main>
</div>
<footer><div class="container">
  <div class="fleurons">❦︎ ❦︎ ❦︎</div>
  <p>Prince Faline's RPG Diaries · Kept since July 2024 · Every session, every book, every build.</p>
  <div class="foot-links"><button type="button" id="pf-signin" class="signed-out">Sign in</button><span class="admin-only" style="gap:16px">Signed in <button type="button" id="pf-signout">Sign out</button></span></div>
</div></footer>
</body>
</html>`;
}

function write(relPath, html) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}

function pageHead(kicker, title, desc, add) {
  return `<header class="ph-head"><p class="kicker">${kicker}</p><h1>${title}</h1><p class="ph-desc">${desc}</p>${add || ""}</header>`;
}
// Text-style filter bar (design) wired up with a few lines of script (feature).
function filterBar(id, buttons, selectOpts, selectLabel) {
  return `<div class="filters" id="${id}">${buttons.map(([v, l], i) => `<button type="button" data-v="${esc(v)}"${i === 0 ? ' class="on"' : ""}>${l}</button>`).join("<span>·</span>")}${selectOpts ? `<span>·</span><select aria-label="${selectLabel}"><option value="all">${selectLabel}</option>${selectOpts.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select>` : ""}</div>`;
}
function filterScript(id, itemSel, total, noun, match) {
  return `<script>
(function(){
  var bar=document.getElementById('${id}'),items=document.querySelectorAll('${itemSel}'),count=document.getElementById('${id}-count');
  var btns=bar.querySelectorAll('button'),sel=bar.querySelector('select'),v='all',s='all';
  function apply(){var n=0;items.forEach(function(el){var ok=(function(){${match}})();el.hidden=!ok;if(ok)n++;});count.textContent=n+' of ${total} ${noun}';}
  btns.forEach(function(b){b.addEventListener('click',function(){btns.forEach(function(x){x.classList.remove('on')});b.classList.add('on');v=b.dataset.v;apply();});});
  if(sel)sel.addEventListener('change',function(){s=sel.value;apply();});
})();
</script>`;
}

function campaignOf(s) { return s.campaignSlug ? campaignBySlug[s.campaignSlug] : null; }
function sessionHref(s) {
  const c = campaignOf(s);
  return c ? `/campaigns/${c.slug}/` : (s.slug ? `/one-shots/${s.slug}/` : null);
}
function sessionCover(s) {
  const c = campaignOf(s);
  if (c) return cover(c.name, c.sys, c.banner);
  const os = s.slug ? oneShots.find(o => o.slug === s.slug) : null;
  return cover(s.t, s.s, os && os.cover);
}

// ---------- The Ledger: errata-sheet list of sessions ----------
function ledger(rows, opts) {
  const o = opts || {};
  const limit = o.limit || Infinity;
  let out = "", cur = "", shown = 0;
  rows.forEach(s => {
    const mo = monthLong(s.d);
    const hidden = shown >= limit;
    if (mo !== cur) { cur = mo; out += `<li class="lg-mo${hidden ? " x" : ""}">${mo}</li>`; }
    shown++;
    const c = campaignOf(s);
    const href = sessionHref(s);
    const where = c ? `<a href="/campaigns/${c.slug}/">${esc(c.name)}</a>` : `<span class="os">One-shot</span>`;
    const sys = c ? "" : ` · ${sysLine(s.s, s.ed)}`;
    const title = href && !c ? `<a href="${href}">${esc(s.t)}</a>` : esc(s.t);
    out += `<li class="lg${hidden ? " x" : ""}"${editAttr("session", s.n, s.t)}><span class="lg-d">${s.d.slice(8)}</span><span class="lg-t">${title}<i class="lg-w"> — ${o.noWhere ? sysLine(s.s, s.ed) : where + sys}</i></span><span class="lg-dots"></span><span class="lg-n">#${s.n}</span><span class="lg-h">${fmtRt(s.rt)}</span></li>`;
  });
  return `<ul class="ledger${rows.length > limit ? " folded" : ""}" id="${o.id || "ledger"}">${out}</ul>`;
}

// ---------- FRONT PAGE ----------
function renderHome() {
  const ss = sessions.slice().sort((a, b) => b.d.localeCompare(a.d) || b.n - a.n);
  const lead = ss[0], rest = ss.slice(1, 5);
  const running = campaigns.filter(c => c.status === "running");
  const leadHref = sessionHref(lead), leadCamp = campaignOf(lead);
  const recentReviews = reviews.slice().sort((a, b) => b.date.localeCompare(a.date) || a.t.localeCompare(b.t)).slice(0, 4);
  const games = dashboards.slice().sort((a, b) => a.t.localeCompare(b.t));

  const statCells = [
    ["Games Played", stats.games, ""],
    ["Total Playtime", Math.round(stats.hours) + "h", ""],
    ["Systems Played", stats.systems, ""],
    ["Campaigns Run", stats.campaigns, ""],
    ["Most Played", stats.topSystem[1] + "×", stats.topSystem[0]],
    ["Longest Campaign", stats.longest.n + " eps", stats.longest.name],
    ["One-Shots", stats.oneShots, ""],
  ];
  const years = Object.keys(byYear).sort();
  const maxY = Math.max(...years.map(y => byYear[y]));

  const body = `
  <section class="intro">
    <div>
      <p class="dropcap">Since 2024 I've been obsessed with tabletop RPGs. There's something addictive about running a story I don't know the ending of. The dice decide what happens and I figure out what it means, which makes me less the author of these stories than their oracle. Not being responsible for making the story compelling frees me up to become its audience.</p>
      <p>The list of games I want to play would already take a few lifetimes to play through, and it only ever gets longer, so all I can do is play as much as I can and be grateful for the people who show up every week to see these stories through.</p>
      <p>This site is an archive of every session I've played, along with my thoughts on the books and modules I've read, and the dashboards, playsets and sheets I build for my games.</p>
    </div>
    <figure class="plate"><img src="/assets/portrait.webp" alt="Prince Faline reading beneath a tree"><figcaption>Prince Faline, reading</figcaption></figure>
  </section>

  <div class="front">
    <aside class="col-left">
      ${label("At the Table", "", addBtn("campaign", "New"))}
      <ul class="shelf-list">${running.map(c => `<li${editAttr("campaign", c.slug, c.name)}><a href="/campaigns/${c.slug}/" class="sl"><div class="sl-cover">${cover(c.name, c.sys, c.banner, { noSys: true })}</div><div><h3>${esc(c.name)}</h3><p class="meta">${sysLine(c.sys, c.ed)}</p><p class="meta">${plural(c.n, "session")} · since ${mon(c.first)}</p></div></a></li>`).join("")}</ul>
      <a class="more" href="/campaigns/">All campaigns →</a>
    </aside>

    <section class="col-main">
      ${label("Latest Session", "", addBtn("session", "Log session"))}
      <article class="lead"${editAttr("session", lead.n, lead.t)}>
        ${leadHref ? `<a class="lead-cover" href="${leadHref}">${sessionCover(lead)}</a>` : `<div class="lead-cover">${sessionCover(lead)}</div>`}
        <p class="kicker">${esc(leadCamp ? leadCamp.name : "One-shot")}${same(leadCamp ? leadCamp.name : "One-shot", lead.s) ? "" : " · " + sysLine(lead.s, lead.ed)}</p>
        <h1>${leadHref ? `<a href="${leadHref}">${esc(lead.t)}</a>` : esc(lead.t)}</h1>
        <p class="byline">Session ${lead.n} · ${fmtDate(lead.d)} · ${fmtRt(lead.rt)} at the table</p>
      </article>
      <ul class="recent">${rest.map(s => {
        const c = campaignOf(s), href = sessionHref(s);
        return `<li${editAttr("session", s.n, s.t)}><p class="kicker">${esc(c ? c.name : "One-shot")}</p><h3>${href ? `<a href="${href}">${esc(s.t)}</a>` : esc(s.t)}</h3><p class="meta">${fmtDate(s.d)} · #${s.n}</p></li>`;
      }).join("")}</ul>
    </section>

    <aside class="col-right">
      ${label("Recently Read", "", addBtn("review", "New"))}
      <ul class="read">${recentReviews.map(r => `<li${editAttr("review", r.slug, r.t)}><a href="/reviews/${r.slug}/" class="rd"><div class="rd-cover">${cover(r.t, r.sys, bookCover(r), { noSys: true, contain: true })}</div><div><h3>${esc(r.t)}</h3><p class="meta">${esc(r.type)} · ${sysLine(r.sys, r.ed)}</p>${starsHtml(r.stars)}</div></a></li>`).join("")}</ul>
      <a class="more" href="/reviews/">The full shelf →</a>
      ${label("From the Workshop", "", addBtn("game", "New"))}
      <ul class="ws">${games.map(g => `<li${editAttr("game", dashboards.indexOf(g), g.t)}><a href="${g.url}"><b>${esc(g.t)}</b><span>${esc(g.kind || "Game")}</span></a></li>`).join("")}</ul>
    </aside>
  </div>

  <section class="record-wrap">
    ${label("Lifetime Record", `Since ${stats.since}`)}
    <dl class="record">
      ${statCells.map(([l, v, sub]) => `<div class="rec"><dt>${esc(l)}</dt><dd>${esc(v)}</dd>${sub ? `<dd>${esc(sub)}</dd>` : ""}</div>`).join("")}
      <div class="rec years"><dt>Sessions per Year</dt>${years.map(y => `<div class="yr"><span>${y}</span><i><b style="width:${Math.round(byYear[y] / maxY * 100)}%"></b></i><em>${byYear[y]}</em></div>`).join("")}</div>
    </dl>
  </section>

  <section class="ledger-wrap">
    ${label("The Ledger", `${sessions.length} sessions · ${Math.round(stats.hours)} hours · ${stats.systems} systems · since ${stats.since}`, addBtn("session", "Log session"))}
    ${ledger(ss, { limit: 24 })}
    ${ss.length > 24 ? `<button type="button" class="more" id="ledger-toggle">Every entry ↓</button>
    <script>
      (function(){
        var l=document.getElementById('ledger'),b=document.getElementById('ledger-toggle');
        b.addEventListener('click',function(){var f=l.classList.toggle('folded');b.textContent=f?'Every entry ↓':'Fewer entries ↑';});
      })();
    </script>` : ""}
  </section>`;
  write("index.html", layout({ title: "Prince Faline's RPG Diaries", active: "Home", body, description: "A permanent home for ephemeral games — campaigns, sessions, reviews and dashboards since July 2024." }));
}

function slugFor(name) {
  const c = campaigns.find(c => c.name === name);
  return c ? c.slug : "";
}

// ---------- CAMPAIGNS INDEX ----------
function renderCampaignsIndex() {
  const list = campaigns.slice().sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  const cards = list.map(c => `<a class="gi" href="/campaigns/${c.slug}/"${editAttr("campaign", c.slug, c.name)} data-status="${esc(c.status)}" data-sys="${esc(c.sys)}">
      <div class="gi-cover">${cover(c.name, c.sys, c.banner)}</div>
      <p class="kicker">${statusLabel(c.status)}</p>
      <h3>${esc(c.name)}</h3>
      <p class="meta"><b>${sysLine(c.sys, c.ed)}</b></p>
      <p class="meta">${plural(c.n, "session")} · ${c.rt} · ${runSpan(c)}</p>
      <p class="blurb">${esc(blurb(c))}</p>
    </a>`).join("");
  const sysNames = Array.from(new Set(campaigns.map(c => c.sys))).sort();
  const body = `
    ${pageHead(`${campaigns.length} campaigns`, "Campaigns", "Every campaign I've run since 2024, with its system, its length and its session diaries.", addBtn("campaign", "New campaign"))}
    ${filterBar("cf", [["all", "All"], ["running", "Running"], ["between arcs", "Between Arcs"], ["concluded", "Concluded"]], sysNames, "All systems")}
    <p class="count" id="cf-count">${campaigns.length} of ${campaigns.length} campaigns · ${stats.oneShots} one-shots logged separately</p>
    <div class="grid" id="cf-list">${cards}</div>
    ${filterScript("cf", "#cf-list .gi", campaigns.length, "campaigns", "return (v==='all'||el.dataset.status===v)&&(s==='all'||el.dataset.sys===s);")}`;
  write("campaigns/index.html", layout({ title: "Campaign Library — Prince Faline's RPG Diaries", active: "Campaigns", body }));
}

// ---------- cast grid ----------
// Groups cast cards into centered rows so the grid never leaves an
// awkward lone card dangling on the last line.
const CAST_ROW_PLANS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [3, 2, 2], 8: [3, 3, 2], 9: [3, 3, 3], 10: [3, 3, 2, 2] };
function castRows(n) {
  if (CAST_ROW_PLANS[n]) return CAST_ROW_PLANS[n];
  const rows = []; let left = n;
  while (left > 0) { const take = Math.min(3, left); rows.push(take); left -= take; }
  return rows;
}
function castCard(pc) {
  return `<div class="cc">
    <div class="cc-p">${cover(pc.name, "", pc.portrait, { noSys: true })}</div>
    <div>
      <h3>${esc(pc.name)}</h3>
      <p class="role">${esc(pc.role || pc.kind || "")}</p>
      <p class="by">Portrayed by ${esc(pc.player)}</p>
      <p>${esc(pc.bio)}</p>
    </div>
  </div>`;
}
function castLayout(cast) {
  if (!cast.length) return "";
  let i = 0;
  return `<div class="cast">${castRows(cast.length).map(size => {
    const chunk = cast.slice(i, i + size); i += size;
    return `<div class="cast-row">${chunk.map(castCard).join("")}</div>`;
  }).join("")}</div>`;
}

// ---------- CAMPAIGN DETAIL ----------
function renderCampaignDetail(c) {
  const hasDetail = !!c.episodes && c.episodes.length > 0;
  const summary = c.summary || c.premise || [];
  const paras = summary.length ? summary : [blurb(c)];
  const rows = sessions.filter(s => s.campaignSlug === c.slug).slice().reverse();

  let extra = "";
  if (hasDetail) {
    const materials = (c.materials || []).map(t => {
      const r = reviews.find(x => x.t === t);
      return `<li>${r ? `<a href="/reviews/${r.slug}/">${esc(t)}</a>${starsHtml(r.stars)}` : `<span>${esc(t)}</span>`}</li>`;
    }).join("");
    extra = `
      ${(c.influences || materials) ? `<section class="sec two">
        ${c.influences ? `<div>${label("Influences")}<p class="infl">${esc(c.influences)}</p></div>` : "<div></div>"}
        ${materials ? `<div>${label("Materials")}<ul class="mats">${materials}</ul></div>` : "<div></div>"}
      </section>` : ""}
      ${(c.cast || []).length ? `<section class="sec">${label("Casting")}${castLayout(c.cast)}</section>` : ""}
      <section class="sec">
        ${label("Episodes", plural(c.episodes.length, "episode"), addBtn("session", "Log session", c.slug))}
        <ul class="eps">${c.episodes.map(e => `<li><a class="ep-row" href="#ep-${e.n}"><span class="d">${esc(e.date)}</span><span class="n">${e.n}</span><span class="t">${esc(e.title)}</span><span class="r">${fmtRt(e.rt)}</span></a></li>`).join("")}</ul>
        <div style="margin-top:20px">${c.episodes.map((e, i) => `<article class="recap" id="ep-${e.n}">
          <div class="cv">${cover(e.title, "", e.img || (c.covers && c.covers[i]) || "", { noSys: true })}</div>
          <div><h3><span>${e.n}.</span>${esc(e.title)}</h3><p>${esc(e.hook)}</p><p class="meta" style="margin-top:6px">${esc(e.date)} · ${fmtRt(e.rt)}</p></div>
        </article>`).join("")}</div>
      </section>`;
  } else {
    extra = `<section class="sec">
        <p class="note">Diary not yet transcribed — the session log below is drawn from the master ledger. Premise, casting and recaps get written up here.</p>
        ${label("Session Log", plural(rows.length, "session"), addBtn("session", "Log session", c.slug))}
        ${ledger(rows, { id: "sessions", noWhere: true })}
      </section>`;
  }

  const body = `
    <a class="back" href="/campaigns/">◂ Campaigns</a>
    ${c.banner ? `<div class="banner cv"><img src="${esc(c.banner)}" alt=""></div>` : ""}
    <article class="detail${c.banner ? " wide" : ""}"${editAttr("campaign", c.slug, c.name)}>
      ${c.banner ? "" : `<div class="d-cover">${cover(c.name, c.sys)}</div>`}
      <div class="d-body">
        <p class="kicker">${sysLine(c.sys, c.ed)} · ${statusLabel(c.status)}</p>
        <h1>${esc(c.name)}</h1>
        ${c.tagline ? `<p class="tagline">${esc(c.tagline)}</p>` : ""}
        ${paras.map((p, i) => `<p${i === 0 ? ' class="dropcap"' : ""}>${esc(p)}</p>`).join("")}
        <dl class="facts"><div><dt>Sessions</dt><dd>${c.n}</dd></div><div><dt>At the table</dt><dd>${c.rt}</dd></div><div><dt>Run</dt><dd>${runSpan(c)}</dd></div></dl>
      </div>
    </article>
    ${extra}`;
  write(`campaigns/${c.slug}/index.html`, layout({ title: c.name + " — Prince Faline's RPG Diaries", active: "Campaigns", body, description: blurb(c) }));
}

// ---------- REVIEWS INDEX ----------
const CORE_TYPES = ["System", "Module", "Supplement"];
function reviewGroup(t) { return CORE_TYPES.includes(t) ? t : "Resource"; }
function renderReviewsIndex() {
  const sorted = reviews.slice().sort((a, b) => b.stars - a.stars || a.t.localeCompare(b.t));
  const cards = sorted.map(r => `<a class="gi" href="/reviews/${r.slug}/"${editAttr("review", r.slug, r.t)} data-type="${reviewGroup(r.type)}" data-sys="${esc(r.sys)}">
      <div class="gi-cover">${cover(r.t, r.sys, bookCover(r), { contain: true })}
        <div class="gi-over"><p class="kicker">${esc(r.type)} · ${mon(r.date + "-01")}</p><h4>${esc(r.t)}</h4>${starsHtml(r.stars)}<p>${esc(r.verdict)}</p></div></div>
      <p class="kicker">${esc(r.type)}</p>
      <h3>${esc(r.t)}</h3>
      <p class="meta">${sysLine(r.sys, r.ed)}</p>
      ${starsHtml(r.stars)}
    </a>`).join("");
  const sysNames = Array.from(new Set(reviews.map(r => r.sys))).sort();
  const body = `
    ${pageHead(`${reviews.length} books`, "The Shelf", "Short notes on every system, module and supplement I've read.", addBtn("review", "New review"))}
    ${filterBar("rf", [["all", "Everything"], ["System", "Systems"], ["Module", "Modules"], ["Supplement", "Supplements"], ["Resource", "Resources"]], sysNames, "All systems")}
    <p class="count" id="rf-count">${reviews.length} of ${reviews.length} entries</p>
    <div class="grid books" id="rf-list">${cards}</div>
    ${filterScript("rf", "#rf-list .gi", reviews.length, "entries", "return (v==='all'||el.dataset.type===v)&&(s==='all'||el.dataset.sys===s);")}`;
  write("reviews/index.html", layout({ title: "The Shelf — Prince Faline's RPG Diaries", active: "Reviews", body }));
}

// ---------- REVIEW DETAIL ----------
function renderReviewDetail(r) {
  const used = (r.used || []).map(u => {
    const href = u === "One-Shots" ? "/one-shots/" : `/campaigns/${slugFor(u)}/`;
    return `<a href="${href}">${esc(u)}</a>`;
  }).join("");
  const body = `
    <a class="back" href="/reviews/">◂ The Shelf</a>
    <article class="detail"${editAttr("review", r.slug, r.t)}>
      <div class="d-cover">${cover(r.t, r.sys, bookCover(r), { contain: true })}</div>
      <div class="d-body">
        <p class="kicker">${esc(r.type)} · ${sysLine(r.sys, r.ed)}</p>
        <h1>${esc(r.t)}</h1>
        <p class="pq">${esc(r.verdict)}</p>
        <p class="dropcap">${esc(r.body)}</p>
        ${(r.tags || []).length ? `<div class="tags">${r.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
        <dl class="facts"><div><dt>Rating</dt><dd>${starsHtml(r.stars)}</dd></div><div><dt>Reviewed</dt><dd>${mon(r.date + "-01")}</dd></div><div><dt>${r.ed ? "Edition" : "Edition"}</dt><dd>${r.ed ? esc(r.ed) : "Standalone"}</dd></div></dl>
        ${used ? `<div style="margin-top:28px"><p class="kicker" style="margin-bottom:10px">Put to the table in</p><div class="tags" style="margin-top:0">${used}</div></div>` : ""}
      </div>
    </article>`;
  write(`reviews/${r.slug}/index.html`, layout({ title: r.t + " — Prince Faline's RPG Diaries", active: "Reviews", body, description: r.verdict }));
}

// ---------- GAMES ----------
const GAME_FILTERS = [["", "All"], ["Dashboard", "Dashboards"], ["Playset", "Playsets"], ["Character Sheet", "Character Sheets"]];
function renderGames() {
  const sorted = dashboards.slice().sort((a, b) => a.t.localeCompare(b.t));
  const tiles = sorted.map(d => `<a href="${d.url}" target="_blank" rel="noopener" class="gi"${editAttr("game", dashboards.indexOf(d), d.t)} data-kind="${esc(d.kind || "")}">
      <div class="gi-cover"><div class="gm-tile">
        <div class="gm-art" style="background-image:url(${d.icon})"></div>
        <div class="gm-panel">
          ${d.logo ? `<img src="${d.logo}" alt="${esc(d.t)}" class="gm-logo" style="filter:${d.logoStyle === "white" ? "brightness(0) invert(1)" : "grayscale(1) invert(1)"}">` : `<div class="gm-name">${esc(d.t)}</div>`}
          <div class="gm-line"></div>
          <div class="gm-desc">${esc(d.note || "")}</div>
          <div class="gm-foot">${d.players ? `<span class="gm-pl">${esc(d.players)} players</span>` : ""}<span class="gm-kind">▸ ${esc(d.kind || "Game")}</span></div>
        </div>
      </div></div>
      <p class="kicker">${esc(d.kind || "Game")}</p>
      <h3>${esc(d.t)}</h3>
      ${d.players ? `<p class="meta">${esc(d.players)} players</p>` : ""}
    </a>`).join("");
  const distinctKinds = new Set(dashboards.map(d => d.kind)).size;
  const btns = GAME_FILTERS.map(([k, l]) => {
    const n = k ? dashboards.filter(d => d.kind === k).length : dashboards.length;
    return [k, `${l} ${n}`];
  });
  const body = `
    ${pageHead(`${dashboards.length} apps`, "Games", "Dashboards, playsets and sheets I've built for my tables.", addBtn("game", "New game"))}
    ${distinctKinds > 1 ? filterBar("gf", btns) : ""}
    <p class="count" id="gf-count">${dashboards.length} of ${dashboards.length} apps</p>
    <div class="grid games" id="gf-list">${tiles}</div>
    ${distinctKinds > 1 ? filterScript("gf", "#gf-list .gi", dashboards.length, "apps", "return v===''||el.dataset.kind===v;") : ""}`;
  write("games/index.html", layout({ title: "Games — Prince Faline's RPG Diaries", active: "Games", body }));
}

function renderAppStub(d) {
  const slug = d.url.replace(/^\/games\//, "").replace(/\/$/, "");
  const body = `
    <a class="back" href="/games/">◂ Games</a>
    <article class="detail"${editAttr("game", dashboards.indexOf(d), d.t)}>
      <div class="d-cover sq"><div class="cv" style="width:100%;height:100%"><img src="${d.icon}" alt=""></div></div>
      <div class="d-body">
        <p class="kicker">${esc(d.kind || "Game")}${d.players ? " · " + esc(d.players) + " players" : ""}</p>
        <h1>${esc(d.t)}</h1>
        <p class="dropcap">${esc(d.note)}</p>
        <p class="note" style="margin-top:26px">This dashboard is in the works — check back soon.</p>
      </div>
    </article>`;
  write(`games/${slug}/index.html`, layout({ title: d.t + " — Prince Faline's RPG Diaries", active: "Games", body, description: d.note }));
}

// ---------- ONE-SHOTS ----------
function renderOneShotsIndex() {
  const list = oneShots.slice().sort((a, b) => b.d.localeCompare(a.d));
  const cards = list.map(s => `<a class="gi" href="/one-shots/${s.slug}/"${editAttr("session", s.n, s.t)} data-sys="${esc(s.s)}">
      <div class="gi-cover">${cover(s.t, s.s, s.cover, { noSys: true })}</div>
      <p class="kicker">${sysLine(s.s, s.ed)}</p>
      <h3>${esc(s.t)}</h3>
      <p class="meta">${mon(s.d)} · ${fmtRt(s.rt)} at the table</p>
    </a>`).join("");
  const sysNames = Array.from(new Set(oneShots.map(s => s.s))).sort();
  const body = `
    ${pageHead(`${oneShots.length} one-shots`, "One-Shots", "Every single-session game I've run since 2024 with a short entry.", addBtn("session", "New one-shot"))}
    <div class="filters" id="of"><select aria-label="All systems"><option value="all">All systems</option>${sysNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select></div>
    <p class="count" id="of-count">${oneShots.length} of ${oneShots.length} entries</p>
    <div class="grid dense" id="of-list">${cards}</div>
    ${filterScript("of", "#of-list .gi", oneShots.length, "entries", "return s==='all'||el.dataset.sys===s;")}`;
  write("one-shots/index.html", layout({ title: "One-Shots — Prince Faline's RPG Diaries", active: "One-Shots", body }));
}

function renderOneShotDetail(s) {
  const paras = s.writeup || [];
  const body = `
    <a class="back" href="/one-shots/">◂ One-Shots</a>
    <article class="detail"${editAttr("session", s.n, s.t)}>
      <div class="d-cover sq">${cover(s.t, s.s, s.cover, { noSys: true })}</div>
      <div class="d-body">
        <p class="kicker">${sysLine(s.s, s.ed)}</p>
        <h1>${esc(s.t)}</h1>
        ${paras.length ? paras.map((p, i) => `<p${i === 0 ? ' class="dropcap"' : ""}>${esc(p)}</p>`).join("") : `<p class="meta" style="font-size:18px">No write-up yet.</p>`}
        <dl class="facts"><div><dt>Date</dt><dd>${mon(s.d)}</dd></div><div><dt>At the table</dt><dd>${fmtRt(s.rt)}</dd></div><div><dt>System</dt><dd>${sysLine(s.s, s.ed)}</dd></div></dl>
      </div>
    </article>`;
  write(`one-shots/${s.slug}/index.html`, layout({ title: s.t + " — Prince Faline's RPG Diaries", active: "One-Shots", body }));
}


// ---------- run ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
renderHome();
renderCampaignsIndex();
campaigns.forEach(renderCampaignDetail);
renderReviewsIndex();
reviews.forEach(renderReviewDetail);
renderOneShotsIndex();
oneShots.forEach(renderOneShotDetail);
renderGames();
dashboards.filter(d => d.t !== "Tokyo Brain Pop!?" && d.t !== "Don't Rest Your Head").forEach(renderAppStub);

// copy static assets
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.name.endsWith(".webp") || !entry.name.match(/\.(png|jpe?g|xlsx)$/i)) fs.copyFileSync(s, d);
  }
}
copyDir(path.join(ROOT, "uploads"), path.join(DIST, "uploads"));
copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
copyDirAll(path.join(ROOT, "app-icons"), path.join(DIST, "app-icons"));
copyDirAll(path.join(ROOT, "app-logo"), path.join(DIST, "app-logo"));
if (fs.existsSync(path.join(ROOT, "admin"))) copyDir(path.join(ROOT, "admin"), path.join(DIST, "admin"));

// copyDirAll: unlike copyDir above, copies every file verbatim (including
// .png/.jpg) — used for app bundles that ship their own art with no webp
// pipeline, where copyDir's image filter would silently drop them.
function copyDirAll(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirAll(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDirAll(path.join(ROOT, "Games", "Tokyo Brain Pop", "app"), path.join(DIST, "games", "tokyo-brain-pop"));
copyDirAll(path.join(ROOT, "Games", "Dont Rest Your Head", "app"), path.join(DIST, "games", "dont-rest-your-head"));

console.log("Built", campaigns.length + 1, "campaign pages,", reviews.length + 1, "review pages, home, games.");
