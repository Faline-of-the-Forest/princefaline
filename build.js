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
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function dt(d) { return new Date(d + "T12:00:00Z"); }
function fDate(d) { return +d.slice(8, 10) + " " + MONTHS[+d.slice(5, 7) - 1] + " " + d.slice(0, 4); }
function fShort(d) { return +d.slice(8, 10) + " " + MONTHS[+d.slice(5, 7) - 1].slice(0, 3); }
function fMY(d) { return d ? MONTHS[+d.slice(5, 7) - 1].slice(0, 3) + " " + d.slice(0, 4) : ""; }
function fMonth(d) { return MONTHS[+d.slice(5, 7) - 1] + " " + d.slice(0, 4); }
function fDay(d) { return WEEKDAYS[dt(d).getUTCDay()] + " " + +d.slice(8, 10); }
function rtMin(rt, h) { const m = /^(\d+):(\d+)$/.exec(String(rt || "")); return m ? +m[1] * 60 + +m[2] : Math.round((h || 0) * 60); }
function dur(min) { return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0"); }
function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
function slug(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function same(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
function edTag(e) { return e ? ` <span class="ed">${esc(e)}</span>` : ""; }
function chip(t, c) { return `<span class="chip ${c || ""}">${t}</span>`; }
function starsHtml(n) { return n ? `<span class="stars" aria-label="${n} out of 5">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>` : `<span class="unrated">Not rated yet</span>`; }
const STATUS = { running: "Running", concluded: "Concluded" };
const TYPE_LABEL = t => t === "System" ? "Core Rulebook" : t;
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");

// Image box with a typographic fallback that shows until (or unless) the image loads.
const TONES = [["#5f391d","#fdefc8"],["#b3101c","#fdefc8"],["#7c8a5b","#24160a"],["#d9b25a","#3a2413"],["#3f4f2c","#f2e7b4"],["#a79362","#24160a"],["#ead9a8","#5f391d"]];
function tone(n) { return TONES[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]; }
function pic(url, label, cls) {
  const [bg, fg] = tone(label);
  return `<div class="pic ${cls || ""}" style="--bg:${bg};--fg:${fg}"><span class="pic-t">${esc(label)}</span>${url ? `<img src="${esc(url)}" alt="" loading="lazy" onload="this.parentNode.classList.add('has')" onerror="this.remove()">` : ""}</div>`;
}

// Signed-in editing hooks (assets/edit.js): "+ New" buttons and per-item edit tools.
function addBtn(type, text, campaign) { return `<button type="button" class="add admin-only" data-add="${type}"${campaign ? ` data-campaign="${esc(campaign)}"` : ""}>+ ${text}</button>`; }
function editAttr(type, id, name) { return ` data-edit="${type}:${esc(id)}" data-name="${esc(name)}"`; }

// ---------- derived model ----------
const reviewBySys = sys => reviews.find(r => r.type === "System" && same(r.t, sys)) || reviews.find(r => r.type === "System" && same(r.sys, sys));
// Every session, newest first, with its image and write-up resolved.
const S = sessions.map(s => {
  const camp = s.campaignSlug ? campaignBySlug[s.campaignSlug] : null;
  const o = { n: s.n, date: s.d, title: s.t, camp, sys: camp ? camp.sys : s.s, ed: camp ? camp.ed || "" : s.ed || "", min: rtMin(s.rt, s.h), img: "", recap: "", raw: s };
  if (camp) {
    const i = sessions.filter(x => x.campaignSlug === camp.slug).indexOf(s);
    const ep = (camp.episodes || [])[i] || {};
    o.ep = i + 1;
    o.img = ep.img || (camp.covers || [])[i] || "";
    o.recap = ep.hook || "";
    o.epTitle = ep.title || s.t;
    o.href = `/campaigns/${camp.slug}/#ep-${i + 1}`;
  } else {
    o.img = s.cover || "";
    o.recap = (s.writeup || []).join(" ");
    o.writeup = s.writeup || [];
    o.cast = (s.cast || []).filter(c => c && c.name);
    o.slug = s.slug;
    o.href = s.slug ? `/one-shots/${s.slug}/` : "/one-shots/";
  }
  return o;
}).sort((a, b) => b.date.localeCompare(a.date) || b.n - a.n);
campaigns.forEach(c => { c.S = S.filter(s => s.camp === c).reverse(); c.min = c.S.reduce((a, s) => a + s.min, 0); });
const OS = S.filter(s => !s.camp);
const SYS = {};
OS.forEach(s => (SYS[s.sys] = SYS[s.sys] || []).push(s));
const sysList = Object.entries(SYS).map(([name, games]) => ({ name, slug: slug(name), games, min: games.reduce((a, s) => a + s.min, 0) }))
  .sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
const allSys = {};
S.forEach(s => { allSys[s.sys] = (allSys[s.sys] || 0) + 1; });
const PLAYERS = {};
campaigns.forEach(c => (c.cast || []).forEach(pc => { if (pc.player) (PLAYERS[pc.player] = PLAYERS[pc.player] || []).push({ ...pc, camp: c }); }));
const playerHref = p => `/players/${slug(p)}/`;
const sysHref = sys => SYS[sys] ? `/one-shots/system/${slug(sys)}/` : "/one-shots/";
const totalMin = S.reduce((a, s) => a + s.min, 0);
const years = [...new Set(S.map(s => s.date.slice(0, 4)))].sort().reverse();
const shelfSorted = reviews.slice().sort((a, b) => b.stars - a.stars || a.t.localeCompare(b.t));
function gameRange(p) { const m = String(p || "").match(/(\d+)\D+(\d+)/); const one = String(p || "").match(/\d+/); return m ? [+m[1], +m[2]] : one ? [+one[0], +one[0]] : [0, 0]; }

// ---------- layout ----------
const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,500;0,700;0,800;1,500&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">`;
const assetVer = f => require("crypto").createHash("md5").update(fs.readFileSync(path.join(ROOT, "assets", f))).digest("hex").slice(0, 8);
let CSS_VER, JS_VER, SITE_VER;
function nav(active) {
  return [["Home", "/"], ["Campaigns", "/campaigns/"], ["One-shots", "/one-shots/"], ["Shelf", "/reviews/"], ["Games", "/games/"]]
    .map(([l, href]) => `<a href="${href}"${active === l ? ' class="on"' : ""}>${l}</a>`).join("");
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
<script src="/assets/site.js?v=${SITE_VER}" defer></script>
<script src="/assets/edit.js?v=${JS_VER}" defer></script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/" aria-label="RPG Diaries, home"><img class="logo-img" src="/assets/logo.webp" alt="Prince Faline's RPG Diaries" width="427" height="122"></a>
  <nav class="nav" aria-label="Sections">${nav(active)}</nav>
  <div class="gsearch"><label class="vh" for="q">Search the diaries</label><input id="q" type="search" placeholder="Search, or a player codename" autocomplete="off"><div id="results" hidden></div></div>
</div></header>
<main id="app">
${body}
</main>
<footer><div class="wrap"><b>Prince Faline's RPG Diaries</b><span>Kept since July 2024</span><span class="grow"></span><button type="button" id="pf-signin" class="signed-out">Sign in</button><span class="admin-only" style="gap:16px">Signed in <button type="button" id="pf-signout">Sign out</button></span></div></footer>
<div id="tip" hidden></div>
</body>
</html>`;
}
function write(relPath, html) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}
// Toolbar controls (the mock's segmented buttons and labelled selects); site.js wires them up.
function seg(key, opts, cur) { return `<div class="seg" role="group" data-key="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}"${(cur || opts[0][0]) === v ? ' class="on"' : ""}>${l}</button>`).join("")}</div>`; }
function sel(key, opts, label) { return `<label class="sel"><span>${label}</span><select data-key="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></label>`; }
const yearOpts = [["", "All years"], ...years.map(y => [y, y])];

// ---------- shared pieces ----------
const where = s => s.camp ? esc(s.camp.name) : "One-shot, " + esc(s.sys);
const poster = c => `<a class="poster" href="/campaigns/${c.slug}/"${editAttr("campaign", c.slug, c.name)} data-status="${esc(c.status)}" data-sys="${esc(c.sys)}" data-first="${c.first || ""}" data-last="${c.last || ""}" data-count="${c.S.length}">${pic(c.banner, c.name, "p45")}
  <h3>${esc(c.name)}</h3><p class="sub">${esc(c.sys)}${edTag(c.ed)}</p><p class="sub">${plural(c.S.length, "session")}, ${c.status === "running" ? "since " + fMY(c.first) : fMY(c.first) + " to " + fMY(c.last)}</p></a>`;
const book = r => `<a class="book" href="/reviews/${r.slug}/"${editAttr("review", r.slug, r.t)} data-type="${esc(TYPE_LABEL(r.type))}" data-stars="${r.stars}">${pic(bookCover(r), r.t, "p34 contain")}<h3>${esc(r.t)}</h3><p class="sub">${esc(TYPE_LABEL(r.type))}</p>${starsHtml(r.stars)}</a>`;
const shotCard = (s, showSys) => `<a class="shot" href="${s.href}" data-shot="${s.n}"${editAttr("session", s.n, s.title)} data-year="${s.date.slice(0, 4)}" data-sys="${esc(s.sys)}" data-date="${s.date}" data-min="${s.min}">${pic(s.img, s.title, "sq")}<h3>${esc(s.title)}</h3><p class="chips">${chip(fMY(s.date))}${chip(dur(s.min))}${showSys ? chip(esc(s.sys), "g") : ""}</p></a>`;
const shotData = list => `<script type="application/json" id="shot-data">${json(list.map(s => ({ n: s.n, t: s.title, sys: s.sys, ed: s.ed, d: fDate(s.date), m: dur(s.min), img: s.img, w: s.writeup || [], cast: s.cast.map(c => ({ name: c.name, player: c.player || "", href: PLAYERS[c.player] ? playerHref(c.player) : "" })), href: s.href, sysHref: sysHref(s.sys), book: (r => r ? { t: r.t, href: `/reviews/${r.slug}/` } : null)(reviewBySys(s.sys)) })))}</script>`;

// ---------- the ledger ----------
function ledger() {
  const rows = S.map(s => `<tr data-n="${s.n}" data-year="${s.date.slice(0, 4)}" data-type="${s.camp ? "c" : "o"}" data-sys="${esc(s.sys)}" data-month="${esc(fMonth(s.date))}" data-camp="${esc(s.camp ? s.camp.name : "One-shots")}" data-dshort="${fDay(s.date)}" data-dfull="${fDate(s.date)}" data-text="${esc((s.title + " " + (s.camp ? s.camp.name : "") + " " + s.sys).toLowerCase())}"><td class="n">${s.n}</td><td class="d">${fDay(s.date)}</td><td class="t"${editAttr("session", s.n, s.title)}><a href="${s.href}">${esc(s.title)}</a></td><td class="w">${s.camp ? `<a href="/campaigns/${s.camp.slug}/">${esc(s.camp.name)}</a>` : `<span class="tag">One-shot</span> <a href="${sysHref(s.sys)}">${esc(s.sys)}</a>`}</td><td class="h">${dur(s.min)}</td></tr>`).join("");
  return `<div class="tools" id="lg-tools">
    <label class="search"><span class="vh">Search the ledger</span><input type="search" data-key="q" placeholder="Search sessions, campaigns, systems"></label>
    ${seg("type", [["all", "Everything"], ["c", "Campaigns"], ["o", "One-shots"]])}
    ${sel("year", yearOpts, "Year")}
    ${sel("sys", [["", "All systems"], ...Object.keys(allSys).sort().map(s => [s, s])], "System")}
    ${sel("group", [["month", "Month"], ["campaign", "Campaign"], ["system", "System"]], "Group by")}
  </div>
  <table class="ledger" id="ledger"><tbody>${rows}</tbody></table>
  <button class="btn line" type="button" id="lg-more">Show all ${S.length} sessions</button>`;
}

// ---------- HOME ----------
function calendar() {
  const by = {};
  S.forEach(s => { by[s.date] = (by[s.date] || 0) + s.min; });
  return years.map(y => {
    let cells = "";
    const start = new Date(Date.UTC(+y, 0, 1));
    for (let i = 0; i < (start.getUTCDay() + 6) % 7; i++) cells += '<i class="x"></i>';
    for (let d = new Date(start); d.getUTCFullYear() === +y; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10), m = by[k];
      cells += m ? `<i class="p${m > 300 ? 3 : m > 220 ? 2 : 1}" data-d="${k}" tabindex="0"></i>` : "<i></i>";
    }
    return `<div class="cal-row"><span class="cal-y">${y}</span><div class="cal">${cells}</div><span class="cal-n">${S.filter(s => s.date.startsWith(y)).length}</span></div>`;
  }).join("");
}
function topLists() {
  const tops = {
    sys: ["Most sessions by system", Object.entries(allSys).sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, v, v, sysHref(n)])],
    camps: ["Longest campaigns", campaigns.slice().sort((a, b) => b.S.length - a.S.length).map(c => [c.name, c.S.length, c.S.length, `/campaigns/${c.slug}/`])],
    long: ["Longest sessions", S.slice().sort((a, b) => b.min - a.min).map(s => [s.title, s.min, dur(s.min), s.href])],
    shots: ["Most one-shots by system", sysList.map(s => [s.name, s.games.length, s.games.length, `/one-shots/system/${s.slug}/`])],
  };
  return `<label class="top-pick"><span class="vh">Choose a top list</span><select id="top-pick">${Object.entries(tops).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
  ${Object.entries(tops).map(([k, [, rows]], i) => {
    const top = rows.slice(0, 5), max = top[0] ? top[0][1] : 1;
    return `<div class="top-list" data-top="${k}"${i ? " hidden" : ""}>${top.map(([n, v, l, href]) => `<div class="bar"><span>${href ? `<a href="${href}">${esc(n)}</a>` : esc(n)}</span><i><b style="width:${v / max * 100}%"></b></i><em>${l}</em></div>`).join("")}</div>`;
  }).join("")}`;
}
function renderHome() {
  const L = S[0], prev = S.slice(1, 5), running = campaigns.filter(c => c.status === "running");
  const tipData = {};
  S.forEach(s => (tipData[s.date] = tipData[s.date] || []).push([s.title, s.camp ? s.camp.name : "One-shot, " + s.sys, dur(s.min)]));
  const body = `
<section class="hero band"><div class="wrap hero-grid">
  <a class="hero-art" href="${L.href}"${editAttr("session", L.n, L.title)}>${pic(L.img, L.title, "sq")}</a>
  <div class="hero-main">
    <p class="over">Latest session, #${L.n}</p>
    <h1>${esc(L.title)}</h1>
    <p class="hero-meta">${L.camp ? `<a href="/campaigns/${L.camp.slug}/">${esc(L.camp.name)}</a>${same(L.camp.name, L.sys) ? "" : ", " + esc(L.sys)}` : `A one-shot in <a href="${sysHref(L.sys)}">${esc(L.sys)}</a>`}<br>${fDate(L.date)}, ${dur(L.min)}</p>
    ${L.recap ? `<p class="hero-recap">${esc(L.recap)}</p>` : ""}
    <a class="btn gold" href="${L.href}">Read more</a>
    ${addBtn("session", "Log session")}
  </div>
  <div class="hero-prev"><h2>Recent sessions</h2>
    ${prev.map(s => `<a href="${s.href}" class="mini"${editAttr("session", s.n, s.title)}>${pic(s.img, s.camp ? s.camp.name : s.sys, "sq tiny")}<span><b>${esc(s.title)}</b><small>${where(s)}, ${fShort(s.date)}</small></span></a>`).join("")}
    <a class="more" href="#ledger-sec">The whole ledger</a></div>
</div></section>
<section class="wrap sec"><header class="sec-h"><h2>At the table now</h2>${addBtn("campaign", "New campaign")}<a class="more" href="/campaigns/">All ${campaigns.length} campaigns</a></header>
  <div class="posters">${running.map(poster).join("")}</div></section>

<section class="record band"><div class="wrap">
  <header class="sec-h"><h2>Lifetime record</h2></header>
  <div class="rec-grid">
    <dl class="rec-nums">
      <div><dd>${S.length}</dd><dt>sessions</dt></div><div><dd>${Math.round(totalMin / 60)}</dd><dt>hours</dt></div>
      <div><dd>${Object.keys(allSys).length}</dd><dt>systems</dt></div><div><dd>${campaigns.length}</dd><dt>campaigns</dt></div><div><dd>${OS.length}</dd><dt>one-shots</dt></div>
    </dl>
    <div class="rec-cal">${calendar()}</div>
    <div class="rec-sys">${topLists()}</div>
  </div></div></section>
<script type="application/json" id="tip-data">${json(tipData)}</script>

<section class="wrap sec"><header class="sec-h"><h2>From the shelf</h2>${addBtn("review", "New review")}<a class="more" href="/reviews/">All ${reviews.length} books</a></header>
  <div class="strip">${shelfSorted.slice(0, 7).map(book).join("")}</div></section>

<section class="wrap sec" id="ledger-sec"><header class="sec-h"><h2>The ledger</h2>${addBtn("session", "Log session")}<span class="note">${S.length} sessions</span></header>${ledger()}</section>

<section class="wrap about"><img src="/assets/portrait.webp" alt="Prince Faline reading beneath a tree" width="530" height="650">
  <div><h2>About these diaries</h2><p>Since 2024 I've been obsessed with tabletop RPGs. There's something addictive about running a story I don't know the ending of. The dice decide what happens and I figure out what it means, which makes me less the author of these stories than their oracle. Not being responsible for making the story compelling frees me up to become its audience.</p>
  <p>The list of games I want to play would already take a few lifetimes to play through, and it only ever gets longer, so all I can do is play as much as I can and be grateful for the people who show up every week to see these stories through.</p>
  <p>This site is an archive of every session I've played, along with my thoughts on the books and modules I've read, and the dashboards, playsets and sheets I build for my games.</p></div></section>`;
  write("index.html", layout({ title: "Prince Faline's RPG Diaries", active: "Home", body, description: "A permanent home for ephemeral games: campaigns, sessions, reviews and dashboards since July 2024." }));
}

// ---------- CAMPAIGNS ----------
function renderCampaignsIndex() {
  const list = campaigns.slice().sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  const n = s => campaigns.filter(c => c.status === s).length;
  const statusSeg = [["all", `All ${campaigns.length}`], ["running", `Running ${n("running")}`], ["concluded", `Concluded ${n("concluded")}`]];
  const body = `<div class="wrap page"><header class="page-h"><h1>Campaigns</h1>${addBtn("campaign", "New campaign")}</header>
  <div class="tools" id="c-tools">${seg("status", statusSeg)}
    ${sel("sys", [["", "All systems"], ...[...new Set(campaigns.map(c => c.sys))].sort().map(s => [s, s])], "System")}
    ${sel("sort", [["recent", "Last played"], ["long", "Most sessions"], ["old", "Oldest first"], ["az", "A to Z"]], "Sort")}
    <span class="grow"></span>${seg("view", [["posters", "Posters"], ["list", "List"]])}</div>
  <div class="posters" id="c-posters">${list.map(poster).join("")}</div>
  <table class="ledger clist" id="c-list" hidden><thead><tr><th>Campaign</th><th>System</th><th>Sessions</th><th>Played</th><th>Ran</th><th>Status</th></tr></thead><tbody>${list.map(c => `<tr data-status="${esc(c.status)}" data-sys="${esc(c.sys)}" data-name="${esc(c.name)}" data-first="${c.first || ""}" data-last="${c.last || ""}" data-count="${c.S.length}"><td class="t"${editAttr("campaign", c.slug, c.name)}><a href="/campaigns/${c.slug}/">${esc(c.name)}</a></td><td>${esc(c.sys)}${edTag(c.ed)}</td><td>${c.S.length}</td><td>${dur(c.min)}</td><td>${fMY(c.first)} to ${c.status === "running" ? "now" : fMY(c.last)}</td><td><span class="status ${c.status === "concluded" ? "concluded" : "running"}">${STATUS[c.status] || "Concluded"}</span></td></tr>`).join("")}</tbody></table>
  </div>`;
  write("campaigns/index.html", layout({ title: "Campaigns — Prince Faline's RPG Diaries", active: "Campaigns", body }));
}
function influenceList(s) { return String(s || "").split(/(?<=\)),\s*/).map(x => x.trim()).filter(Boolean); }
function renderCampaignDetail(c) {
  const rev = reviewBySys(c.sys);
  const paras = (c.summary && c.summary.length ? c.summary : c.premise && c.premise.length ? c.premise : [blurb(c)]);
  const cast = c.cast || [];
  const others = campaigns.filter(o => o.sys === c.sys && o !== c);
  const body = `<section class="c-hero band"${editAttr("campaign", c.slug, c.name)}>${c.banner ? `<img class="c-banner" src="${esc(c.banner)}" alt="" onerror="this.remove()">` : ""}<div class="c-shade"></div>
   <div class="wrap c-hero-in"><a class="back" href="/campaigns/">Campaigns</a>
    <h1>${esc(c.name)}</h1><p class="c-tag">${esc(c.tagline || blurb(c))}</p></div></section>
  <div class="facts"><div class="wrap facts-in">
    <div><dt>System</dt><dd>${rev ? `<a href="/reviews/${rev.slug}/">${esc(c.sys)}</a>` : esc(c.sys)}${edTag(c.ed)}</dd></div>
    <div><dt>Sessions</dt><dd>${c.S.length}</dd></div><div><dt>Played</dt><dd>${dur(c.min)}</dd></div>
    <div><dt>Ran</dt><dd>${fMY(c.first)} to ${c.status === "running" ? "now" : fMY(c.last)} <span class="status ${c.status === "concluded" ? "concluded" : "running"}">${STATUS[c.status] || "Concluded"}</span></dd></div>
    <nav class="jump">${cast.length ? `<a href="#cast">Cast</a>` : ""}<a href="#episodes">Episodes</a></nav></div></div>
  <div class="wrap c-body">
   <div class="c-main">
    <section class="prose">${paras.map(p => `<p>${esc(p)}</p>`).join("")}</section>
    ${cast.length ? `<section id="cast"><header class="sec-h"><h2>Cast</h2></header>
      <div class="cast">${cast.map(p => `<article>${pic(p.portrait, String(p.name).replace(/"[^"]+" /, ""), "sq")}<h3>${esc(p.name)}</h3>${p.role ? `<p class="sub">${esc(p.role)}</p>` : ""}<p class="by">Played by <a href="${playerHref(p.player)}">${esc(p.player)}</a></p><p>${esc(p.bio)}</p></article>`).join("")}</div></section>` : ""}
    <section id="episodes"><header class="sec-h"><h2>Episodes</h2><span class="note">${plural(c.S.length, "session")}</span>${addBtn("session", "Log session", c.slug)}</header>
      <ol class="eps">${c.S.map(s => { const full = s.recap || s.img; return `<li id="ep-${s.ep}" class="${full ? "full" : "bare"}"${editAttr("session", s.n, s.title)}>${full ? pic(s.img, s.epTitle, "sq") : ""}
        <div><p class="ep-n">Episode ${s.ep}</p><h3>${esc(s.epTitle)}</h3><p class="sub">${fDate(s.date)}, ${dur(s.min)}</p>${s.recap ? `<p class="ep-recap">${esc(s.recap)}</p>` : ""}</div></li>`; }).join("")}</ol></section>
   </div>
   <aside class="c-side">
    ${c.influences ? `<h3>Influences</h3><ul>${influenceList(c.influences).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${(c.materials || []).length ? `<h3>Materials</h3><ul>${c.materials.map(x => { const r = reviews.find(r => r.t === x); return `<li>${r ? `<a href="/reviews/${r.slug}/">${esc(x)}</a> ${starsHtml(r.stars)}` : esc(x)}</li>`; }).join("")}</ul>` : ""}
    <h3>More in ${esc(c.sys)}</h3><ul>${others.map(o => `<li><a href="/campaigns/${o.slug}/">${esc(o.name)}</a></li>`).join("")}${SYS[c.sys] ? `<li><a href="${sysHref(c.sys)}">${plural(SYS[c.sys].length, "one-shot")}</a></li>` : ""}${!others.length && !SYS[c.sys] ? '<li class="quiet">Nothing else yet</li>' : ""}</ul>
   </aside></div>`;
  write(`campaigns/${c.slug}/index.html`, layout({ title: c.name + " — Prince Faline's RPG Diaries", active: "Campaigns", body, description: blurb(c) }));
}

// ---------- ONE-SHOTS ----------
function mosaic(sy) {
  const g = sy.games.slice(0, 4), n = g.length >= 4 ? 4 : g.length >= 2 ? 2 : 1;
  return `<div class="mosaic m${n}">${g.slice(0, n).map(s => pic(s.img, s.title, "sq")).join("")}</div>`;
}
function renderOneShotsIndex() {
  const hrs = Math.round(OS.reduce((a, s) => a + s.min, 0) / 60);
  const systems = sysList.map(sy => `<a class="system" href="/one-shots/system/${sy.slug}/" data-name="${esc(sy.name)}" data-games="${esc(json(sy.games.map(s => [s.date.slice(0, 4), s.min, s.date])))}">${mosaic(sy)}<h3>${esc(sy.name)}</h3><p class="chips">${chip(plural(sy.games.length, "one-shot"), "g")}${chip(dur(sy.min))}</p></a>`).join("");
  const body = `<div class="wrap page"><header class="page-h"><h1>One-shots</h1><p class="chips big">${chip(OS.length + " one-shots", "g")}${chip(sysList.length + " systems")}${chip(hrs + " hours")}</p>${addBtn("session", "New one-shot")}</header>
  <div class="tools" id="os-tools">${seg("view", [["systems", "By system"], ["games", "Every game"]])}
   ${sel("year", yearOpts, "Year")}
   <span data-only="games" hidden>${sel("sys", [["", "All systems"], ...sysList.map(s => s.name).sort().map(s => [s, s])], "System")}</span>
   <span data-only="systems">${sel("sortS", [["count", "Most one-shots"], ["time", "Most time played"], ["recent", "Last played"], ["az", "A to Z"]], "Sort")}</span>
   <span data-only="games" hidden>${sel("sortG", [["recent", "Newest first"], ["time", "Longest first"], ["az", "A to Z"]], "Sort")}</span></div>
  <div class="systems" id="os-systems">${systems}</div>
  <div class="games-grid g5" id="os-games" hidden>${OS.map(s => shotCard(s, true)).join("")}</div>
  <p class="quiet" id="os-none" hidden>No one-shots match these filters.</p>
  ${shotData(OS)}</div>`;
  write("one-shots/index.html", layout({ title: "One-shots — Prince Faline's RPG Diaries", active: "One-shots", body }));
}
function renderSystemPage(sy) {
  const rev = reviewBySys(sy.name), camps = campaigns.filter(c => c.sys === sy.name);
  const body = `<div class="wrap page"><a class="back dark" href="/one-shots/">One-shots</a><header class="page-h"><h1>${esc(sy.name)}</h1>
   <p class="chips big">${chip(plural(sy.games.length, "one-shot"), "g")}${chip(dur(sy.min) + " played")}</p>
   ${rev || camps.length ? `<p class="also">${rev ? `On the shelf: <a href="/reviews/${rev.slug}/">${esc(rev.t)}</a>` : ""}${rev && camps.length ? ". " : ""}${camps.length ? `Campaigns: ${camps.map(c => `<a href="/campaigns/${c.slug}/">${esc(c.name)}</a>`).join(", ")}` : ""}</p>` : ""}
  </header>
   <div class="games-grid">${sy.games.map(s => shotCard(s, false)).join("")}</div>${shotData(sy.games)}</div>`;
  write(`one-shots/system/${sy.slug}/index.html`, layout({ title: sy.name + " one-shots — Prince Faline's RPG Diaries", active: "One-shots", body }));
}
function renderOneShotDetail(s) {
  const rev = reviewBySys(s.sys);
  const body = `<div class="wrap page"><a class="back dark" href="${sysHref(s.sys)}">${esc(s.sys)}</a>
  <article class="review"${editAttr("session", s.n, s.title)}><div class="rv-cover">${pic(s.img, s.title, "sq")}</div>
   <div class="rv-main">
    <p class="chips"><a href="${sysHref(s.sys)}">${chip(esc(s.sys) + (s.ed ? " " + esc(s.ed) : ""), "g")}</a>${chip(fDate(s.date))}${chip(dur(s.min))}${chip("#" + s.n)}</p>
    <h1>${esc(s.title)}</h1>
    ${s.writeup.length ? s.writeup.map(p => `<p class="rv-thoughts">${esc(p)}</p>`).join("") : `<p class="rv-thoughts ph">No write-up yet.</p>`}
    ${s.cast.length ? `<h2>Cast</h2><ul class="shot-cast">${s.cast.map(c => `<li><b>${esc(c.name)}</b>${c.player ? `<span>Played by ${PLAYERS[c.player] ? `<a href="${playerHref(c.player)}"><i>${esc(c.player)}</i></a>` : `<i>${esc(c.player)}</i>`}</span>` : ""}</li>`).join("")}</ul>` : ""}
    ${rev ? `<h2>Materials</h2><div class="rv-feat"><a href="/reviews/${rev.slug}/">${pic(bookCover(rev), rev.t, "sq tiny contain")}<span><b>${esc(rev.t)}</b><small>${esc(TYPE_LABEL(rev.type))}</small></span></a></div>` : ""}
   </div></article></div>`;
  write(`one-shots/${s.slug}/index.html`, layout({ title: s.title + " — Prince Faline's RPG Diaries", active: "One-shots", body }));
}

// ---------- SHELF ----------
function renderReviewsIndex() {
  const groups = {};
  shelfSorted.forEach(r => (groups[r.sys] = groups[r.sys] || []).push(r));
  const types = [...new Set(reviews.map(r => TYPE_LABEL(r.type)))];
  const order = ["Core Rulebook", "Module", "Supplement"];
  types.sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9));
  const body = `<div class="wrap page"><header class="page-h"><h1>Shelf</h1>${addBtn("review", "New review")}</header>
  <div class="tools" id="sh-tools">${seg("type", [["all", "Everything"], ...types.map(t => [t, t === "Core Rulebook" ? "Core rulebooks" : t + "s"])])}
   ${sel("sort", [["rating", "Highest rated"], ["az", "A to Z"]], "Sort")}<span class="grow"></span>${seg("view", [["covers", "Covers"], ["system", "By system"]])}</div>
  <div class="books" id="sh-covers">${shelfSorted.map(book).join("")}</div>
  <div id="sh-system" hidden>${Object.entries(groups).map(([s, bs]) => `<section class="sys-row"><header><h2>${esc(s)}</h2><ul class="sys-books">${bs.map(b => `<li><a href="/reviews/${b.slug}/">${esc(b.t)}</a><span>${esc(TYPE_LABEL(b.type))}</span></li>`).join("")}</ul></header><div class="books">${bs.map(book).join("")}</div></section>`).join("")}</div></div>`;
  write("reviews/index.html", layout({ title: "Shelf — Prince Faline's RPG Diaries", active: "Shelf", body }));
}
function renderReviewDetail(r) {
  const used = r.used || [];
  const camps = used.map(u => campaigns.find(c => same(c.name, u))).filter(Boolean);
  const shots = used.some(u => same(u, "One-Shots")) && SYS[r.t] ? SYS[r.t] : (used.some(u => same(u, "One-Shots")) ? OS.filter(s => same(s.sys, r.sys)) : []);
  const body = `<div class="wrap page"><a class="back dark" href="/reviews/">Shelf</a>
  <article class="review"${editAttr("review", r.slug, r.t)}><div class="rv-cover">${pic(bookCover(r), r.t, "p34 contain")}</div>
   <div class="rv-main">
    <p class="chips">${chip(esc(TYPE_LABEL(r.type)), "g")}${chip(esc(r.sys) + (r.ed ? " " + esc(r.ed) : ""))}</p>
    <h1>${esc(r.t)}</h1>
    <p class="rv-rate">${starsHtml(r.stars)}<span>${r.date ? "Reviewed " + fMonth(r.date + "-01") : ""}</span></p>
    ${r.verdict ? `<p class="rv-blurb">${esc(r.verdict)}</p>` : ""}
    <h2>My thoughts</h2>
    ${String(r.body || "").split(/\n\s*\n/).filter(Boolean).map(p => `<p class="rv-thoughts">${esc(p)}</p>`).join("") || `<p class="rv-thoughts ph">No review written yet.</p>`}
    ${(r.tags || []).length ? `<p class="chips" style="margin-top:18px">${r.tags.map(t => chip(esc(t))).join("")}</p>` : ""}
    ${camps.length || shots.length ? `<h2>Featured in</h2><div class="rv-feat">${camps.map(c => `<a href="/campaigns/${c.slug}/">${pic(c.banner, c.name, "sq tiny")}<span><b>${esc(c.name)}</b><small>Campaign, ${plural(c.S.length, "session")}</small></span></a>`).join("")}${shots.length ? `<a href="${sysHref(shots[0].sys)}">${pic(shots[0].img, shots[0].sys, "sq tiny")}<span><b>${plural(shots.length, "one-shot")}</b><small>${esc(shots[0].sys)}</small></span></a>` : ""}</div>` : ""}
   </div></article></div>`;
  write(`reviews/${r.slug}/index.html`, layout({ title: r.t + " — Prince Faline's RPG Diaries", active: "Shelf", body, description: r.verdict }));
}

// ---------- GAMES ----------
function renderGames() {
  const list = dashboards.map((d, i) => ({ d, i, range: gameRange(d.players) }));
  const filter = d => d.logoStyle === "white" ? "brightness(0) invert(1)" : "grayscale(1) invert(1)";
  const kinds = [...new Set(dashboards.map(d => d.kind).filter(Boolean))];
  const tiles = list.slice().reverse().map(({ d, i, range }) => `<a class="tile" href="${esc(d.url)}"${editAttr("game", i, d.t)} data-kind="${esc(d.kind || "")}" data-min="${range[0]}" data-max="${range[1]}" data-i="${i}" data-text="${esc((d.t + " " + (d.note || "") + " " + (d.sys || "")).toLowerCase())}" aria-label="${esc(d.t)}, ${esc(d.kind || "Game")}${d.players ? ", " + esc(d.players) + " players" : ""}">
    <div class="tile-art">${pic(d.icon, d.t, "sq")}<div class="tile-over"><div class="tile-logo">${d.logo ? `<img src="${esc(d.logo)}" alt="" style="filter:${filter(d)}" onload="this.parentNode.classList.add('has')" onerror="this.remove()">` : ""}<span>${esc(d.t)}</span></div>
      <i class="tile-rule"></i><p class="tile-desc">${esc(d.note || "")}</p>${d.players ? `<p class="tile-pl">${esc(d.players)} PLAYERS</p>` : ""}<p class="tile-kind">${esc(d.kind || "Game")}</p></div></div>
    <p class="tile-name">${esc(d.t)}</p><p class="tile-desc touch">${esc(d.note || "")}</p></a>`).join("");
  const rows = list.slice().reverse().map(({ d, i, range }) => `<tr data-kind="${esc(d.kind || "")}" data-min="${range[0]}" data-max="${range[1]}" data-i="${i}" data-name="${esc(d.t)}" data-text="${esc((d.t + " " + (d.note || "") + " " + (d.sys || "")).toLowerCase())}"><td class="gthumb">${pic(d.icon, d.t, "sq tiny")}</td><td class="t"${editAttr("game", i, d.t)}><a href="${esc(d.url)}">${esc(d.t)}</a></td><td>${esc(d.kind || "")}</td><td>${range[0] ? range[0] + " to " + range[1] : ""}</td><td>${esc(d.sys || "")}</td><td class="w">${esc(d.note || "")}</td></tr>`).join("");
  const maxPl = Math.max(8, ...list.map(x => x.range[1]));
  const body = `<div class="wrap page"><header class="page-h"><h1>Games</h1>${addBtn("game", "New game")}</header>
  <div class="tools" id="g-tools"><label class="search"><span class="vh">Search games</span><input type="search" data-key="q" placeholder="Search games"></label>
   ${seg("kind", [["all", "All"], ...["Dashboard", "Playset", "Character Sheet"].map(k => [k, k === "Character Sheet" ? "Character sheets" : k + "s"])])}
   <div class="slider"><label for="pl">Players</label><input id="pl" type="range" min="1" max="${maxPl}" step="1" value="2" class="unset"><output id="plVal">Any</output><button type="button" id="plClear" hidden>Clear</button></div>
   ${sel("sort", [["new", "Newest"], ["az", "A to Z"], ["big", "Largest table"]], "Sort")}
   <span class="grow"></span>${seg("view", [["grid", "Grid"], ["list", "List"]])}</div>
  <div id="gres"><p class="count" id="g-count">${dashboards.length} of ${dashboards.length} games</p>
   <div class="tiles" id="g-grid">${tiles}</div>
   <table class="ledger glist" id="g-list" hidden><thead><tr><th></th><th>Game</th><th>Type</th><th>Players</th><th>System</th><th>About</th></tr></thead><tbody>${rows}</tbody></table>
   <p class="quiet" id="g-none" hidden>No games match. Clear a filter to see more.</p></div></div>`;
  write("games/index.html", layout({ title: "Games — Prince Faline's RPG Diaries", active: "Games", body }));
}
function renderAppStub(d) {
  const slugPart = d.url.replace(/^\/games\//, "").replace(/\/$/, "");
  const i = dashboards.indexOf(d);
  const body = `<div class="wrap page"><a class="back dark" href="/games/">Games</a>
  <article class="review"${editAttr("game", i, d.t)}><div class="rv-cover">${pic(d.icon, d.t, "sq")}</div>
   <div class="rv-main"><p class="chips">${chip(esc(d.kind || "Game"), "g")}${d.players ? chip(esc(d.players) + " players") : ""}</p>
    <h1>${esc(d.t)}</h1><p class="rv-blurb">${esc(d.note || "")}</p>
    <p class="rv-thoughts ph" style="margin-top:24px">This one is still in the works. Check back soon.</p></div></article></div>`;
  write(`games/${slugPart}/index.html`, layout({ title: d.t + " — Prince Faline's RPG Diaries", active: "Games", body, description: d.note }));
}

// ---------- PLAYERS ----------
function renderPlayer(name) {
  const list = PLAYERS[name];
  const body = `<div class="wrap page"><header class="page-h"><p class="over dark">Player</p><h1>${esc(name)}</h1><p>${plural(new Set(list.map(p => p.camp)).size, "campaign")} at this table.</p></header>
  <div class="cast wide">${list.map(p => `<article>${pic(p.portrait || p.camp.banner, p.camp.name, "p169")}<h3>${esc(p.name)}</h3><p class="by">in <a href="/campaigns/${p.camp.slug}/">${esc(p.camp.name)}</a>, ${esc(p.camp.sys)}, ${plural(p.camp.S.length, "session")}</p><p>${esc(p.bio)}</p></article>`).join("")}</div></div>`;
  write(`players/${slug(name)}/index.html`, layout({ title: name + " — Prince Faline's RPG Diaries", active: "", body }));
}

// ---------- 404 ----------
function renderNotFound() {
  const body = `<div class="wrap nf"><svg viewBox="0 0 200 200" aria-hidden="true"><polygon points="100,8 180,54 180,146 100,192 20,146 20,54"/><polygon points="100,52 146,132 54,132"/><path d="M100 8v44M20 54l80-2 80 2M20 146l34-14M180 146l-34-14M100 192l-46-60M100 192l46-60M20 54l34 78M180 54l-34 78"/><text x="100" y="118" text-anchor="middle">1</text></svg>
  <div><h1>You rolled a one</h1><p>This page doesn't exist. The link is broken or the entry has moved.</p>
  <p><a class="btn dark" href="/">Back to the front page</a> <a class="btn line" href="/campaigns/">Browse campaigns</a></p></div></div>`;
  write("404.html", layout({ title: "Page not found — Prince Faline's RPG Diaries", active: "", body }));
}

// ---------- search index (fetched by site.js the first time someone types) ----------
function writeSearchIndex() {
  const out = [];
  Object.keys(PLAYERS).forEach(p => out.push(["Player", p, playerHref(p)]));
  campaigns.forEach(c => out.push(["Campaign", c.name, `/campaigns/${c.slug}/`]));
  sysList.forEach(s => out.push(["One-shot system", s.name, `/one-shots/system/${s.slug}/`]));
  reviews.forEach(r => out.push(["Book", r.t, `/reviews/${r.slug}/`]));
  dashboards.forEach(d => out.push(["Game", d.t, d.url]));
  S.forEach(s => out.push(["Session " + s.n, s.title, s.href]));
  write("search.json", JSON.stringify(out));
}

// ---------- run ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
CSS_VER = assetVer("site.css"); JS_VER = assetVer("edit.js"); SITE_VER = assetVer("site.js");
renderHome();
renderCampaignsIndex();
campaigns.forEach(renderCampaignDetail);
renderOneShotsIndex();
sysList.forEach(renderSystemPage);
OS.filter(s => s.slug).forEach(renderOneShotDetail);
renderReviewsIndex();
reviews.forEach(renderReviewDetail);
renderGames();
dashboards.filter(d => d.t !== "Tokyo Brain Pop!?" && d.t !== "Don't Rest Your Head" && /^\/games\//.test(d.url)).forEach(renderAppStub);
Object.keys(PLAYERS).forEach(renderPlayer);
renderNotFound();
writeSearchIndex();

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
