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
function stripes(a, b) { return `repeating-linear-gradient(135deg,${a} 0 7px,${b} 7px 14px)`; }
function statusStyle(s) {
  if (s === "running") return { label: "Running", pillBg: "#2F4633", pillFg: "#F6F1E4", pillBd: "#2F4633" };
  if (s === "between arcs") return { label: "Between Arcs", pillBg: "#E8C87A", pillFg: "#3A2E10", pillBd: "#B8892E" };
  return { label: "Concluded", pillBg: "transparent", pillFg: "#5B5648", pillBd: "#c8bfa6" };
}
function stars(n) { return { full: "★".repeat(n), empty: "☆".repeat(5 - n) }; }
// System name plus an optional small pill for the edition/version played (e.g. "Kids on Bikes" + "2e").
function sysTag(base, ed, opts) {
  const o = opts || {};
  const nameStyle = o.nameStyle || "font:400 16.1px/1.4 'EB Garamond',serif";
  const pillStyle = o.pillStyle || "font:400 12.5px/1 'EB Garamond',serif;color:#8A836F;border:1px solid #C8BFA6;padding:2px 5px;letter-spacing:.02em";
  return `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle"><span style="${nameStyle}">${esc(base)}</span>${ed ? `<span style="${pillStyle}">${esc(ed)}</span>` : ""}</span>`;
}
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

// ---------- layout ----------
const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Uncial+Antiqua&display=swap" rel="stylesheet">`;
const BASE_CSS = `html,body{margin:0;padding:0;background:#F6F1E4;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}a{color:#A5231F;text-decoration:none}a:hover{color:#2F4633;text-decoration:underline}::selection{background:#2F4633;color:#F6F1E4}.chip{cursor:pointer}.chip.active{background:#2F4633!important;color:#F6F1E4!important;border-color:#2F4633!important}`;

function nav(active) {
  const items = [["Home", "/"], ["Campaigns", "/campaigns/"], ["One-Shots", "/one-shots/"], ["Reviews", "/reviews/"], ["Games", "/games/"]];
  return items.map(([label, href]) => {
    const on = active === label;
    return `<a href="${href}" style="padding:7px 12px;border:1px solid ${on ? "#2F4633" : "#c8bfa6"};background:${on ? "#2F4633" : "transparent"};color:${on ? "#F6F1E4" : "#5B5648"};font:400 18px/1 'EB Garamond',serif;display:inline-block">${label}</a>`;
  }).join("");
}

function layout({ title, active, body, description }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}
${FONT_LINK}
<style>${BASE_CSS}</style>
</head>
<body>
<div style="min-height:100vh;background:#F6F1E4;color:#24211B;font-family:'EB Garamond',Georgia,serif">
  <header style="position:sticky;top:0;z-index:30;background:#F6F1E4;border-bottom:2px solid #24211B">
    <div style="max-width:1180px;margin:0 auto;padding:10px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:16px 22px">
      <a href="/" style="display:flex;align-items:center;gap:11px;margin-right:auto">
        <img src="/uploads/faline-s-rpg-guild-icon-1024.webp" alt="" style="display:block;width:34px;height:34px">
      </a>
      <nav style="display:flex;flex-wrap:wrap;gap:4px">${nav(active)}</nav>
    </div>
  </header>
  <main style="max-width:1180px;margin:0 auto;padding:0 20px">
${body}
  </main>
  <footer style="border-top:2px solid #24211B;margin-top:20px;background:#EDE7D6">
    <div style="max-width:1180px;margin:0 auto;padding:26px 20px;display:flex;flex-wrap:wrap;gap:22px;justify-content:space-between;align-items:flex-end">
      <div>
        <img src="/assets/wordmark.webp" alt="Prince Faline's RPG Diaries" style="display:block;height:44px;width:auto">
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${nav("").replace(/font:400 18px/g, "font:400 16.1px")}</div>
    </div>
  </footer>
</div>
</body>
</html>`;
}

function write(relPath, html) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}

// ---------- HOME ----------
function renderHome() {
  const running = campaigns.filter(c => c.status === "running");
  const statCells = [
    { label: "Games Played", value: stats.games + " games" },
    { label: "Total Playtime", value: Math.round(stats.hours) + "h" },
    { label: "Systems Played", value: stats.systems + " systems" },
    { label: "Campaigns Run", value: stats.campaigns + " campaigns" },
    { label: "Most Played", value: stats.topSystem[1] + "×", sub: stats.topSystem[0] },
    { label: "Longest Campaign", value: stats.longest.n + " eps", sub: stats.longest.name },
    { label: "One-shots", value: String(stats.oneShots) },
  ];
  const years = Object.keys(byYear).sort();
  const maxY = Math.max(...years.map(y => byYear[y]));

  const rows = sessions.slice().reverse();
  const ledgerRows = rows.map(r => {
    const camp = r.campaignSlug ? campaignBySlug[r.campaignSlug] : null;
    const campLabel = camp ? camp.name : "One-Shot";
    const href = camp ? `/campaigns/${camp.slug}/` : (r.slug ? `/one-shots/${r.slug}/` : null);
    const inner = `<span style="flex:0 0 86px;font:400 18.8px/1.4 'EB Garamond',serif;color:#A5231F">${esc(r.d)}</span><span style="flex:0 0 30px;font:400 17.1px/1.4 'EB Garamond',serif;color:#8A836F">#${r.n}</span><span style="flex:999 1 220px;font:400 16px/1.35 'EB Garamond',serif">${esc(r.t)}</span><span style="flex:1 1 150px;font:400 17.1px/1.4 'EB Garamond',serif">${esc(campLabel)}</span><span style="flex:1 1 140px">${sysTag(r.s, r.ed, { nameStyle: "font:400 17.1px/1.4 'EB Garamond',serif;color:#5B5648" })}</span><span style="flex:0 0 46px;text-align:right;font:400 17.1px/1.4 'EB Garamond',serif;color:#5B5648">${r.rt}</span>`;
    const style = "display:flex;flex-wrap:wrap;gap:4px 18px;padding:9px 15px;border-bottom:1px solid #E6DFCB;align-items:baseline";
    return href ? `<a href="${href}" style="${style};color:inherit" data-hover>${inner}</a>` : `<div style="${style}">${inner}</div>`;
  }).join("");

  const runningCards = running.map(c => campaignCard(c)).join("");

  const body = `
    <section style="display:flex;flex-wrap:wrap;gap:36px;padding:46px 0 40px;align-items:flex-start">
      <div style="flex:999 1 420px;max-width:640px">
        <div style="font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;margin-bottom:20px">◆ ${stats.games} sessions logged since July 2024</div>
        <h1 style="font:400 clamp(38px,5.4vw,58px)/1.02 'EB Garamond',serif;margin:0 0 22px;letter-spacing:-.01em">Prince Faline's<br>RPG Diaries</h1>
        <p style="font:400 17.5px/1.68 'EB Garamond',serif;color:#3A362C;margin:0 0 16px;text-wrap:pretty">
          <span style="float:left;font-family:'Uncial Antiqua',serif;font-size:44px;line-height:.84;color:#F6F1E4;background:#A5231F;border:1px solid #B8892E;padding:8px 10px 6px;margin:4px 12px 0 0">S</span>
          ince 2024 I've been obsessed with tabletop RPGs. There's something addictive about running a story I don't know the ending of. The dice decide what happens and I figure out what it means, which makes me less the author of these stories than their oracle. Not being responsible for making the story compelling frees me up to become its audience.
        </p>
        <p style="font:400 17.5px/1.68 'EB Garamond',serif;color:#3A362C;margin:0 0 16px;text-wrap:pretty">The list of games I want to play would already take a few lifetimes to play through, and it only ever gets longer, so all I can do is play as much as I can and be grateful for the people who show up every week to see these stories through.</p>
        <p style="font:400 17.5px/1.68 'EB Garamond',serif;color:#3A362C;margin:0 0 26px;text-wrap:pretty">This site is an archive of every session I've played, along with my thoughts on the books and modules I've read, and the dashboards, playsets and sheets I build for my games.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <a href="/campaigns/" style="padding:11px 18px;background:#2F4633;color:#F6F1E4;font:400 18.8px/1 'EB Garamond',serif;border:1px solid #24211B">▸ Browse Campaigns</a>
          <a href="/reviews/" style="padding:11px 18px;border:1px solid #24211B;font:400 18.8px/1 'EB Garamond',serif;color:#24211B">▸ Review Library</a>
        </div>
      </div>
      <div style="flex:1 1 300px;max-width:400px">
        <img src="/assets/portrait.webp" alt="Prince Faline reading beneath a tree" style="display:block;width:100%;height:auto">
      </div>
    </section>

    <section style="padding:14px 0 44px">
      <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 18px">
        <div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ Now Running</div>
        <div style="flex:1;height:1px;background:#C8BFA6"></div>
        <div style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648">${running.length} active tables</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px">${runningCards}</div>
    </section>

    <section style="padding:0 0 44px">
      <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 18px">
        <div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ Lifetime Record</div>
        <div style="flex:1;height:1px;background:#C8BFA6"></div>
        <div style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648">Since ${stats.since}</div>
      </div>
      <div style="border:2px solid #24211B;background:#24211B;display:flex;flex-wrap:wrap;gap:1px">
        ${statCells.map(s => `<div style="flex:1 1 148px;background:#FBF8EF;padding:16px 15px 14px"><div style="font:400 15.4px/1 'EB Garamond',serif;color:#5B5648;margin-bottom:11px">${esc(s.label)}</div><div style="font:400 clamp(26px,3vw,34px)/1 'EB Garamond',serif${s.sub ? ";margin-bottom:7px" : ""}">${esc(s.value)}</div>${s.sub ? `<div style="font:400 16.1px/1.35 'EB Garamond',serif;color:#8A836F">${esc(s.sub)}</div>` : ""}</div>`).join("")}
        <div style="flex:1 1 260px;background:#FBF8EF;padding:16px 15px 14px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#5B5648;margin-bottom:14px">Sessions per Year</div>
          <div style="display:flex;flex-direction:column;gap:9px">
            ${years.map(y => `<div style="display:flex;align-items:center;gap:10px"><span style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648;width:30px">${y}</span><div style="flex:1;height:12px;background:#EDE7D6;border:1px solid #C8BFA6"><div style="height:100%;width:${Math.round(byYear[y]/maxY*100)}%;background:#2F4633"></div></div><span style="font:400 17.1px/1 'EB Garamond',serif;color:#24211B;width:22px;text-align:right">${byYear[y]}</span></div>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <section style="padding:0 0 56px">
      <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 16px">
        <div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ The Ledger</div>
        <div style="flex:1;height:1px;background:#C8BFA6"></div>
        <div style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648">${sessions.length} logged</div>
      </div>
      <div style="border:2px solid #24211B;background:#FBF8EF">
        <div style="display:flex;flex-wrap:wrap;gap:6px 18px;padding:9px 15px;border-bottom:1px solid #24211B;background:#EDE7D6;font:400 15.4px/1 'EB Garamond',serif;color:#5B5648">
          <span style="flex:0 0 86px">Date</span><span style="flex:0 0 30px">№</span><span style="flex:999 1 220px">Session</span><span style="flex:1 1 150px">Campaign</span><span style="flex:1 1 140px">System</span><span style="flex:0 0 46px;text-align:right">Time</span>
        </div>
        <div id="ledger-rows" style="max-height:900px;overflow:hidden">${ledgerRows}</div>
        <div id="ledger-toggle" style="padding:11px 15px;font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;cursor:pointer;text-align:center">▾ Show all ${sessions.length} entries</div>
      </div>
    </section>
    <script>
      (function(){
        var rows = document.getElementById('ledger-rows');
        var toggle = document.getElementById('ledger-toggle');
        rows.style.maxHeight = '900px';
        toggle.addEventListener('click', function(){
          var open = rows.style.maxHeight === 'none';
          rows.style.maxHeight = open ? '900px' : 'none';
          toggle.textContent = open ? '▾ Show all ${sessions.length} entries' : '▴ Collapse';
        });
      })();
    </script>`;
  write("index.html", layout({ title: "Prince Faline's RPG Diaries", active: "Home", body, description: "A permanent home for ephemeral games — campaigns, sessions, reviews and dashboards since July 2024." }));
}

function slugFor(name) {
  const c = campaigns.find(c => c.name === name);
  return c ? c.slug : "";
}

function campaignCard(c) {
  const st = statusStyle(c.status);
  const banner = c.banner ? `background:#EDE7D6 url(${c.banner}) center/cover no-repeat` : stripes("#e4dcc6", "#f1ecdb");
  return `<a href="/campaigns/${c.slug}/" style="border:2px solid #24211B;background:#FBF8EF;display:flex;flex-direction:column;color:inherit">
    <div style="height:118px;background:${banner};border-bottom:1px solid #24211B"></div>
    <div style="padding:13px 14px 12px;flex:1">
      <div style="font:400 20px/1.18 'EB Garamond',serif;margin-bottom:7px">${esc(c.name)}</div>
      <div>${sysTag(c.sys, c.ed, { nameStyle: "font:400 16.1px/1.5 'EB Garamond',serif;color:#5B5648" })}</div>
      <div style="font:400 16.1px/1.5 'EB Garamond',serif;color:#5B5648">${c.n} session${c.n===1?"":"s"} · ${Math.round(c.h)}h</div>
    </div>
    <div style="border-top:1px solid #C8BFA6;padding:8px 14px;font:400 16.1px/1 'EB Garamond',serif;color:#A5231F;display:flex;justify-content:space-between">
      <span>▸ Enter</span><span style="color:#5B5648">${mon(c.first)} – ${c.status === "running" ? "present" : mon(c.last)}</span>
    </div>
  </a>`;
}

// ---------- CAMPAIGNS INDEX ----------
function renderCampaignsIndex() {
  const cards = campaigns.slice().sort((a, b) => (b.last || "").localeCompare(a.last || "")).map(c => {
    const st = statusStyle(c.status);
    const banner = c.banner ? `background:#EDE7D6 url(${c.banner}) center/cover no-repeat` : stripes("#e4dcc6", "#f3eedd");
    return `<div class="camp-card" data-status="${esc(c.status)}" data-sys="${esc(c.sys)}" style="border:2px solid #24211B;background:#FBF8EF;display:flex;flex-wrap:wrap;align-items:stretch">
      <div style="flex:0 0 132px;min-height:96px;background:${banner};border-right:1px solid #24211B"></div>
      <div style="flex:999 1 260px;padding:13px 16px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">
          <a href="/campaigns/${c.slug}/" style="font:400 22px/1.15 'EB Garamond',serif;color:inherit">${esc(c.name)}</a>
          <span style="padding:3px 7px;border:1px solid ${st.pillBd};background:${st.pillBg};color:${st.pillFg};font:400 14.6px/1 'EB Garamond',serif">${st.label}</span>
        </div>
        <div>${sysTag(c.sys, c.ed, { nameStyle: "font:400 17.1px/1.5 'EB Garamond',serif;color:#5B5648" })}</div>
        <div style="font:400 18.8px/1.5 'EB Garamond',serif;color:#3A362C;max-width:60ch">${esc(blurb(c))}</div>
      </div>
      <div style="flex:0 0 128px;padding:13px 16px;border-left:1px solid #C8BFA6;display:flex;flex-direction:column;justify-content:space-between;gap:8px">
        <div><div style="font:400 24px/1 'EB Garamond',serif">${c.n}</div><div style="font:400 14.6px/1 'EB Garamond',serif;color:#8A836F;margin-top:4px">Sessions</div></div>
        <div><div style="font:400 17.1px/1.5 'EB Garamond',serif;color:#5B5648">${c.rt}</div><div style="font:400 15.4px/1.5 'EB Garamond',serif;color:#8A836F">${mon(c.first)} – ${c.status === "running" ? "present" : mon(c.last)}</div></div>
      </div>
    </div>`;
  }).join("");

  const sysNames = Array.from(new Set(campaigns.map(c => c.sys))).sort();

  const body = `
    <div style="margin:34px 0 26px">
      <div style="font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;margin-bottom:12px">◆ Section II</div>
      <h1 style="font:400 clamp(30px,4vw,42px)/1.05 'EB Garamond',serif;margin:0 0 10px">The Campaign Library</h1>
      <p style="font:400 16px/1.6 'EB Garamond',serif;color:#3A362C;max-width:56ch;margin:0">Every campaign I have run since 2024, with its system, its length, and the diary that came out of it. One-shots are catalogued separately in the ledger.</p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:30px;padding-bottom:56px">
      <aside style="flex:1 1 190px;max-width:230px">
        <div style="border:2px solid #24211B;background:#FBF8EF;padding:15px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">Status</div>
          <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:20px" id="status-filters">
            <div class="chip active" data-status="all" style="padding:6px 9px;border:1px solid #2F4633;background:#2F4633;color:#F6F1E4;font:400 16.1px/1 'EB Garamond',serif">All</div>
            <div class="chip" data-status="running" style="padding:6px 9px;border:1px solid #c8bfa6;font:400 16.1px/1 'EB Garamond',serif">Running</div>
            <div class="chip" data-status="concluded" style="padding:6px 9px;border:1px solid #c8bfa6;font:400 16.1px/1 'EB Garamond',serif">Concluded</div>
          </div>
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">System</div>
          <select id="sys-filter" style="padding:7px 9px;border:1px solid #C8BFA6;background:#F6F1E4;font:400 16.1px/1.2 'EB Garamond',serif;color:#24211B;width:100%">
            <option value="all">All systems</option>
            ${sysNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
          </select>
        </div>
      </aside>
      <div style="flex:999 1 460px">
        <div id="camp-count" style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648;margin-bottom:12px">${campaigns.length} campaigns · ${stats.oneShots} one-shots logged separately</div>
        <div id="camp-list" style="display:flex;flex-direction:column;gap:12px">${cards}</div>
      </div>
    </div>
    <script>
      (function(){
        var status = 'all', sys = 'all';
        var chips = document.querySelectorAll('#status-filters .chip');
        var sysSel = document.getElementById('sys-filter');
        var cards = document.querySelectorAll('.camp-card');
        var count = document.getElementById('camp-count');
        function apply(){
          var shown = 0;
          cards.forEach(function(c){
            var ok = (status === 'all' || c.dataset.status === status) && (sys === 'all' || c.dataset.sys === sys);
            c.style.display = ok ? '' : 'none';
            if (ok) shown++;
          });
          count.textContent = shown + ' campaigns';
        }
        chips.forEach(function(ch){
          ch.addEventListener('click', function(){
            chips.forEach(function(c){ c.classList.remove('active'); c.style.background='transparent'; c.style.color='#5B5648'; c.style.borderColor='#c8bfa6'; });
            ch.classList.add('active'); ch.style.background='#2F4633'; ch.style.color='#F6F1E4'; ch.style.borderColor='#2F4633';
            status = ch.dataset.status; apply();
          });
        });
        sysSel.addEventListener('change', function(){ sys = sysSel.value; apply(); });
      })();
    </script>`;
  write("campaigns/index.html", layout({ title: "Campaign Library — Prince Faline's RPG Diaries", active: "Campaigns", body }));
}

// ---------- CAMPAIGN DETAIL ----------
function renderCampaignDetail(c) {
  const st = statusStyle(c.status);
  const banner = c.banner ? `background:#EDE7D6 url(${c.banner}) center/cover no-repeat` : stripes("#e4dcc6", "#f3eedd");
  const hasDetail = !!c.episodes;
  const tags = c.tags || [c.sys, st.label];

  let detailSection = "";
  if (hasDetail) {
    const materials = (c.materials || []).map(t => {
      const r = reviews.find(x => x.t === t);
      return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">${r ? `<a href="/reviews/${r.slug}/" style="font:400 16px/1.3 'EB Garamond',serif">${esc(t)}</a><span style="font:500 16.4px/1 'EB Garamond',serif;color:#A5231F">${stars(r.stars).full}</span>` : `<span style="font:400 16px/1.3 'EB Garamond',serif">${esc(t)}</span>`}</div>`;
    }).join("");
    detailSection = `
      <section style="padding:40px 0 8px;text-align:center;max-width:66ch;margin:0 auto">
        <div style="font:500 clamp(15px,2.2vw,19px)/1.4 'EB Garamond',serif;color:#A5231F;margin-bottom:24px">${esc(c.tagline)}</div>
        ${(c.premise || []).map(p => `<p style="font:400 16.5px/1.62 'EB Garamond',serif;color:#3A362C;margin:0 0 15px;text-wrap:pretty">${esc(p)}</p>`).join("")}
      </section>
      <section style="display:flex;flex-wrap:wrap;gap:26px;padding:26px 0 12px;border-top:1px solid #C8BFA6;margin-top:28px">
        <div style="flex:999 1 320px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:9px">Influences</div>
          <p style="font:italic 400 15px/1.6 'EB Garamond',serif;color:#3A362C;margin:0">${esc(c.influences)}</p>
        </div>
        <div style="flex:1 1 220px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:9px">Materials</div>
          <div style="display:flex;flex-direction:column;gap:5px">${materials}</div>
        </div>
      </section>
      <section style="padding:34px 0 0">
        <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 18px"><div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ Casting</div><div style="flex:1;height:1px;background:#C8BFA6"></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">
          ${(c.cast || []).map(pc => `<div style="border:1px solid #24211B;background:#FBF8EF;padding:14px;display:flex;gap:14px">
            <div style="flex:0 0 66px;height:84px;background:${stripes("#e4dcc6","#f3eedd")};border:1px solid #C8BFA6;display:grid;place-items:center;font:400 14.5px/1.3 'EB Garamond',serif;color:#8A836F;text-align:center">Portrait</div>
            <div>
              <div style="font:400 18px/1.25 'EB Garamond',serif">${esc(pc.name)}</div>
              <div style="font:400 16.1px/1.5 'EB Garamond',serif;color:#A5231F;margin:4px 0 2px">${esc(pc.kind)}</div>
              <div style="font:400 16.1px/1.5 'EB Garamond',serif;color:#8A836F;margin-bottom:8px">PORTRAYED BY #${esc(pc.player)}</div>
              <p style="font:400 18.1px/1.55 'EB Garamond',serif;color:#3A362C;margin:0;text-wrap:pretty">${esc(pc.bio)}</p>
            </div>
          </div>`).join("")}
        </div>
      </section>
      <section style="padding:34px 0 0">
        <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 16px"><div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ Episodes</div><div style="flex:1;height:1px;background:#C8BFA6"></div></div>
        <div style="border:2px solid #24211B;background:#FBF8EF;margin-bottom:26px">
          ${c.episodes.map(e => `<a href="#ep-${e.n}" style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:10px 15px;border-bottom:1px solid #E6DFCB;align-items:baseline;color:inherit">
            <span style="flex:0 0 86px;font:400 18.8px/1.4 'EB Garamond',serif;color:#A5231F">${esc(e.date)}</span>
            <span style="flex:0 0 28px;font:400 18.8px/1.4 'EB Garamond',serif">${e.n}</span>
            <span style="flex:999 1 240px;font:400 17px/1.35 'EB Garamond',serif">${esc(e.title)}</span>
            <span style="flex:0 0 52px;text-align:right;font:400 17.1px/1.4 'EB Garamond',serif;color:#5B5648">${e.rt}</span>
          </a>`).join("")}
        </div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${c.episodes.map((e, i) => `<div id="ep-${e.n}" style="display:flex;flex-wrap:wrap;gap:18px;padding:22px 0;border-top:1px solid #C8BFA6;scroll-margin-top:80px">
            <div style="flex:0 0 168px"><div style="width:168px;aspect-ratio:1;box-sizing:border-box;background:${(c.covers && c.covers[i]) ? `url(${c.covers[i]}) center/cover no-repeat` : stripes("#e4dcc6","#f1ecdb")};border:1px solid #24211B"></div></div>
            <div style="flex:999 1 300px">
              <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:9px"><span style="font:500 20.5px/1 'EB Garamond',serif;color:#A5231F">${e.n}.</span><span style="font:400 26px/1.1 'EB Garamond',serif">${esc(e.title)}</span></div>
              <p style="font:400 16px/1.62 'EB Garamond',serif;color:#3A362C;margin:0 0 4px;max-width:68ch;text-wrap:pretty">${esc(e.hook)}</p>
              <div style="font:400 16.1px/1.5 'EB Garamond',serif;color:#8A836F">${esc(e.date)} · ${e.rt}</div>
            </div>
          </div>`).join("")}
        </div>
      </section>`;
  } else {
    const sessRows = sessions.filter(s => s.campaignSlug === c.slug).map((s, i) => `<div style="display:flex;flex-wrap:wrap;gap:4px 16px;padding:10px 15px;border-bottom:1px solid #E6DFCB;align-items:baseline">
      <span style="flex:0 0 86px;font:400 18.8px/1.4 'EB Garamond',serif;color:#A5231F">${s.d}</span>
      <span style="flex:0 0 28px;font:400 18.8px/1.4 'EB Garamond',serif">${String(i+1).padStart(2,"0")}</span>
      <span style="flex:999 1 240px;font:400 17px/1.35 'EB Garamond',serif">${esc(s.t)}</span>
      <span style="flex:0 0 52px;text-align:right;font:400 17.1px/1.4 'EB Garamond',serif;color:#5B5648">${s.rt}</span>
    </div>`).join("");
    detailSection = `
      <section style="padding:30px 0 0">
        <div style="border:1px dashed #C8BFA6;background:#FBF8EF;padding:16px;font:500 16.4px/1.6 'EB Garamond',serif;color:#5B5648;margin-bottom:26px">◆ Diary not yet transcribed — the session log below is drawn from the master ledger. Premise, casting and recaps get written up here.</div>
        <div style="display:flex;align-items:baseline;gap:14px;margin:0 0 16px"><div style="font:400 18.8px/1 'EB Garamond',serif;color:#A5231F">◆ Session Log</div><div style="flex:1;height:1px;background:#C8BFA6"></div></div>
        <div style="border:2px solid #24211B;background:#FBF8EF">${sessRows}</div>
      </section>`;
  }

  const body = `
    <a href="/campaigns/" style="display:block;padding:16px 0 14px;font:400 17.1px/1 'EB Garamond',serif;color:#A5231F">◂ The Campaign Library</a>
    <div style="border:2px solid #24211B;background:#FBF8EF">
      <div style="height:clamp(150px,24vw,250px);background:${banner};border-bottom:2px solid #24211B"></div>
      <div style="padding:20px 22px;display:flex;flex-wrap:wrap;gap:18px 26px;align-items:flex-end">
        <div style="flex:999 1 300px">
          <h1 style="font:400 clamp(32px,5vw,50px)/1 'EB Garamond',serif;margin:0 0 12px">${esc(c.name)}</h1>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${tags.map(t => `<span style="padding:4px 8px;border:1px solid #C8BFA6;font:400 15.4px/1 'EB Garamond',serif;color:#5B5648">${esc(t)}</span>`).join("")}</div>
        </div>
        <div style="flex:1 1 200px;display:flex;gap:22px;flex-wrap:wrap">
          <div><div style="font:400 26px/1 'EB Garamond',serif">${c.n}</div><div style="font:400 14.6px/1 'EB Garamond',serif;color:#8A836F;margin-top:5px">Sessions</div></div>
          <div><div style="font:400 26px/1 'EB Garamond',serif">${c.rt}</div><div style="font:400 14.6px/1 'EB Garamond',serif;color:#8A836F;margin-top:5px">At the Table</div></div>
          <div><div style="font:400 26px/1 'EB Garamond',serif">${st.label}</div><div style="font:400 14.6px/1 'EB Garamond',serif;color:#8A836F;margin-top:5px">${mon(c.first)} – ${c.status === "running" ? "present" : mon(c.last)}</div></div>
        </div>
      </div>
    </div>
    ${detailSection}
    <div style="padding-bottom:56px"></div>`;
  write(`campaigns/${c.slug}/index.html`, layout({ title: c.name + " — Prince Faline's RPG Diaries", active: "Campaigns", body, description: blurb(c) }));
}

// ---------- REVIEWS INDEX ----------
function renderReviewsIndex() {
  const cards = reviews.slice().sort((a, b) => b.stars - a.stars || a.t.localeCompare(b.t)).map(r => {
    const cover = bookCover(r);
    const st = stars(r.stars);
    return `<div class="rev-card" data-type="${esc(r.type)}" data-stars="${r.stars}" data-sys="${esc(r.sys)}" style="position:relative">
      <a href="/reviews/${r.slug}/" style="display:block;aspect-ratio:3/4;place-items:center;color:inherit;position:relative;overflow:hidden">
        ${cover ? `<div style="width:100%;height:100%;background:url(${cover}) center/contain no-repeat"></div>` : `<div style="width:100%;height:100%;display:grid;place-items:center"><span style="font:400 19px/1.25 'EB Garamond',serif;color:#5B5648;text-align:center;padding:10px">${esc(r.t)}</span></div>`}
        <div class="hover-overlay" style="position:absolute;inset:0;background:rgba(36,33,27,.92);color:#F6F1E4;padding:15px;display:flex;flex-direction:column;gap:7px;opacity:0;transition:opacity .15s">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span style="font:400 14.6px/1 'EB Garamond',serif;color:#E8C87A">${esc(r.type)}</span><span style="font:400 14.6px/1 'EB Garamond',serif;color:#9F9887">${mon(r.date + "-01")}</span></div>
          <div style="font:400 19px/1.15 'EB Garamond',serif">${esc(r.t)}</div>
          <div>${sysTag(r.sys, r.ed, { nameStyle: "font:400 16.1px/1.4 'EB Garamond',serif;color:#C3BCA6", pillStyle: "font:400 12px/1 'EB Garamond',serif;color:#C3BCA6;border:1px solid #6A6455;padding:2px 5px" })}</div>
          <div style="font:500 17.7px/1 'EB Garamond',serif;color:#E8C87A">${st.full}<span style="color:#6A6455">${st.empty}</span></div>
          <p style="font:italic 400 15px/1.5 'EB Garamond',serif;color:#EDE7D6;margin:0;flex:1">${esc(r.verdict)}</p>
        </div>
      </a>
    </div>`;
  }).join("");
  const sysNames = Array.from(new Set(reviews.map(r => r.sys))).sort();
  const types = ["System", "Module", "Supplement", "Resource"];

  const body = `
    <div style="margin:34px 0 26px">
      <div style="font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;margin-bottom:12px">◆ Section III</div>
      <h1 style="font:400 clamp(30px,4vw,42px)/1.05 'EB Garamond',serif;margin:0 0 10px">The Review Library</h1>
      <p style="font:400 16px/1.6 'EB Garamond',serif;color:#3A362C;max-width:56ch;margin:0">Short notes on every system, module, zine and supplement I have actually put on a table — one verdict, five stars at most, no essays.</p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:30px;padding-bottom:56px">
      <aside style="flex:1 1 190px;max-width:230px">
        <div style="border:2px solid #24211B;background:#FBF8EF;padding:15px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">Material</div>
          <div id="type-filters" style="display:flex;flex-direction:column;gap:5px;margin-bottom:20px">
            <div class="chip active" data-type="all" style="padding:6px 9px;border:1px solid #2F4633;background:#2F4633;color:#F6F1E4;font:400 16.1px/1 'EB Garamond',serif">Everything</div>
            ${types.map(t => `<div class="chip" data-type="${t}" style="padding:6px 9px;border:1px solid #c8bfa6;font:400 16.1px/1 'EB Garamond',serif">${t === "Resource" ? "Resources" : t + "s"}</div>`).join("")}
          </div>
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">System</div>
          <select id="sys-filter" style="padding:7px 9px;border:1px solid #C8BFA6;background:#F6F1E4;font:400 16.1px/1.2 'EB Garamond',serif;color:#24211B;width:100%">
            <option value="all">All systems</option>
            ${sysNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
          </select>
        </div>
      </aside>
      <div style="flex:999 1 460px">
        <div id="rev-count" style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648;margin-bottom:12px">${reviews.length} of ${reviews.length} Entries</div>
        <div id="rev-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px">${cards}</div>
      </div>
    </div>
    <style>.rev-card:hover .hover-overlay{opacity:1}</style>
    <script>
      (function(){
        var type = 'all', sys = 'all';
        var chips = document.querySelectorAll('#type-filters .chip');
        var sysSel = document.getElementById('sys-filter');
        var cards = document.querySelectorAll('.rev-card');
        var count = document.getElementById('rev-count');
        var coreTypes = ['System','Module','Supplement'];
        function inGroup(c, g){ return g === 'Resource' ? coreTypes.indexOf(c.dataset.type) < 0 : c.dataset.type === g; }
        function apply(){
          var shown = 0;
          cards.forEach(function(c){
            var ok = (type === 'all' || inGroup(c, type)) && (sys === 'all' || c.dataset.sys === sys);
            c.style.display = ok ? '' : 'none';
            if (ok) shown++;
          });
          count.textContent = shown + ' of ${reviews.length} Entries';
        }
        chips.forEach(function(ch){
          ch.addEventListener('click', function(){
            chips.forEach(function(c){ c.classList.remove('active'); c.style.background='transparent'; c.style.color='#5B5648'; c.style.borderColor='#c8bfa6'; });
            ch.classList.add('active'); ch.style.background='#2F4633'; ch.style.color='#F6F1E4'; ch.style.borderColor='#2F4633';
            type = ch.dataset.type; apply();
          });
        });
        sysSel.addEventListener('change', function(){ sys = sysSel.value; apply(); });
      })();
    </script>`;
  write("reviews/index.html", layout({ title: "Review Library — Prince Faline's RPG Diaries", active: "Reviews", body }));
}

// ---------- REVIEW DETAIL ----------
function renderReviewDetail(r) {
  const cover = bookCover(r);
  const st = stars(r.stars);
  const used = (r.used || []).map(u => {
    const href = u === "One-Shots" ? "/" : `/campaigns/${slugFor(u)}/`;
    return `<a href="${href}" style="padding:7px 11px;border:1px solid #24211B;font:400 18.8px/1 'EB Garamond',serif">${esc(u)}</a>`;
  }).join("");
  const body = `
    <a href="/reviews/" style="display:block;padding:16px 0 14px;font:400 17.1px/1 'EB Garamond',serif;color:#A5231F">◂ The Review Library</a>
    <div style="display:flex;flex-wrap:wrap;gap:30px;padding-bottom:56px">
      <div style="flex:1 1 240px;max-width:290px">
        <div style="aspect-ratio:3/4;display:grid;place-items:center">
          ${cover ? `<div style="width:100%;height:100%;background:url(${cover}) center/contain no-repeat"></div>` : `<span style="font:400 19px/1.3 'EB Garamond',serif;color:#5B5648;text-align:center">${esc(r.t)}</span>`}
        </div>
        <div style="border:1px solid #C8BFA6;background:#FBF8EF;margin-top:12px">
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #E6DFCB;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">System</span>${sysTag(r.sys, r.ed)}</div>
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #E6DFCB;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">Type</span><span>${esc(r.type)}</span></div>
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #E6DFCB;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">Reviewed</span><span>${mon(r.date + "-01")}</span></div>
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">Rating</span><span style="color:#A5231F">${st.full}<span style="color:#C8BFA6">${st.empty}</span></span></div>
        </div>
      </div>
      <div style="flex:999 1 380px;max-width:68ch">
        <h1 style="font:400 clamp(32px,4.6vw,46px)/1.04 'EB Garamond',serif;margin:0 0 8px">${esc(r.t)}</h1>
        <div style="font:400 18.8px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:22px">${r.ed ? "Edition " + esc(r.ed) : "Standalone"}</div>
        <p style="font:italic 500 21px/1.5 'EB Garamond',serif;color:#A5231F;margin:0 0 22px;padding-left:16px;border-left:3px solid #A5231F;text-wrap:pretty">${esc(r.verdict)}</p>
        <p style="font:400 18px/1.72 'EB Garamond',serif;color:#2E2A22;margin:0 0 26px;text-wrap:pretty">${esc(r.body)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:26px">${(r.tags || []).map(t => `<span style="padding:4px 8px;border:1px solid #C8BFA6;font:400 15.4px/1 'EB Garamond',serif;color:#5B5648">${esc(t)}</span>`).join("")}</div>
        <div style="border-top:1px solid #C8BFA6;padding-top:16px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">Put to the Table in</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${used}</div>
        </div>
      </div>
    </div>`;
  write(`reviews/${r.slug}/index.html`, layout({ title: r.t + " — Prince Faline's RPG Diaries", active: "Reviews", body, description: r.verdict }));
}

// ---------- GAMES ----------
function renderGames() {
  const tiles = dashboards.map(d => `<a href="${d.url}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:10px;color:inherit">
    <div style="position:relative;width:112px;height:112px">
      <div style="position:absolute;inset:0;border:2px solid #24211B;border-radius:24px;background:#FBF8EF;box-shadow:4px 4px 0 #24211B;display:grid;place-items:center"><span style="font:400 44px/1 'EB Garamond',serif;color:#A5231F">${esc(d.t.charAt(0))}</span></div>
      <div class="hover-overlay" style="position:absolute;inset:0;border-radius:24px;background:rgba(36,33,27,.94);color:#F6F1E4;padding:12px;display:flex;flex-direction:column;justify-content:center;gap:5px;text-align:center;opacity:0;transition:opacity .15s">
        <div style="font:400 15.5px/1.25 'EB Garamond',serif;color:#E8C87A">${esc(d.c)}</div>
        <div style="font:400 14.5px/1.3 'EB Garamond',serif;color:#C3BCA6">${esc(d.sys)}</div>
      </div>
    </div>
    <div style="font:400 17px/1.25 'EB Garamond',serif;text-align:center;max-width:140px">${esc(d.t)}</div>
  </a>`).join("");
  const body = `
    <div style="margin:34px 0 26px">
      <div style="font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;margin-bottom:12px">◆ Section IV</div>
      <h1 style="font:400 clamp(30px,4vw,42px)/1.05 'EB Garamond',serif;margin:0 0 10px">Games</h1>
      <p style="font:400 16px/1.6 'EB Garamond',serif;color:#3A362C;max-width:56ch;margin:0">The interactive sheets and trackers I build for my own tables. Each one opens in its own tab, live and playable.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:30px 18px;padding-bottom:56px">${tiles}</div>
    <style>a:hover .hover-overlay{opacity:1}</style>`;
  write("games/index.html", layout({ title: "Games — Prince Faline's RPG Diaries", active: "Games", body }));
}

// ---------- ONE-SHOTS ----------
function renderOneShotsIndex() {
  const cards = oneShots.slice().sort((a, b) => b.d.localeCompare(a.d)).map(s => {
    const cover = s.cover || "";
    return `<div class="os-card" data-sys="${esc(s.s)}" style="position:relative">
      <a href="/one-shots/${s.slug}/" style="display:block;aspect-ratio:1/1;color:inherit;position:relative;overflow:hidden">
        ${cover ? `<div style="width:100%;height:100%;background:url(${cover}) center/cover no-repeat"></div>` : `<div style="width:100%;height:100%;background:${stripes("#e4dcc6", "#f3eedd")};display:grid;place-items:center"><span style="font:400 17px/1.25 'EB Garamond',serif;color:#5B5648;text-align:center;padding:10px">${esc(s.t)}</span></div>`}
        <div class="hover-overlay" style="position:absolute;inset:0;background:rgba(36,33,27,.92);color:#F6F1E4;padding:15px;display:flex;flex-direction:column;gap:7px;opacity:0;transition:opacity .15s">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">${sysTag(s.s, s.ed, { nameStyle: "font:400 14.6px/1 'EB Garamond',serif;color:#E8C87A", pillStyle: "font:400 11.5px/1 'EB Garamond',serif;color:#E8C87A;border:1px solid #6A6455;padding:1px 4px" })}<span style="font:400 14.6px/1 'EB Garamond',serif;color:#9F9887">${mon(s.d)}</span></div>
          <div style="font:400 19px/1.15 'EB Garamond',serif;flex:1">${esc(s.t)}</div>
          <div style="font:400 15px/1 'EB Garamond',serif;color:#C3BCA6">${s.rt} at the table</div>
        </div>
      </a>
    </div>`;
  }).join("");
  const sysNames = Array.from(new Set(oneShots.map(s => s.s))).sort();

  const body = `
    <div style="margin:34px 0 26px">
      <div style="font:400 17.1px/1 'EB Garamond',serif;color:#A5231F;margin-bottom:12px">◆ One-Shots</div>
      <h1 style="font:400 clamp(30px,4vw,42px)/1.05 'EB Garamond',serif;margin:0 0 10px">One-Shots</h1>
      <p style="font:400 16px/1.6 'EB Garamond',serif;color:#3A362C;max-width:56ch;margin:0">${oneShots.length} single-evening games, each with its own page.</p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:30px;padding-bottom:56px">
      <aside style="flex:1 1 190px;max-width:230px">
        <div style="border:2px solid #24211B;background:#FBF8EF;padding:15px">
          <div style="font:400 15.4px/1 'EB Garamond',serif;color:#8A836F;margin-bottom:10px">System</div>
          <select id="sys-filter" style="padding:7px 9px;border:1px solid #C8BFA6;background:#F6F1E4;font:400 16.1px/1.2 'EB Garamond',serif;color:#24211B;width:100%">
            <option value="all">All systems</option>
            ${sysNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
          </select>
        </div>
      </aside>
      <div style="flex:999 1 460px">
        <div id="os-count" style="font:400 17.1px/1 'EB Garamond',serif;color:#5B5648;margin-bottom:12px">${oneShots.length} of ${oneShots.length} Entries</div>
        <div id="os-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px">${cards}</div>
      </div>
    </div>
    <style>.os-card:hover .hover-overlay{opacity:1}</style>
    <script>
      (function(){
        var sysSel = document.getElementById('sys-filter');
        var cards = document.querySelectorAll('.os-card');
        var count = document.getElementById('os-count');
        sysSel.addEventListener('change', function(){
          var sys = sysSel.value, shown = 0;
          cards.forEach(function(c){
            var ok = sys === 'all' || c.dataset.sys === sys;
            c.style.display = ok ? '' : 'none';
            if (ok) shown++;
          });
          count.textContent = shown + ' of ${oneShots.length} Entries';
        });
      })();
    </script>`;
  write("one-shots/index.html", layout({ title: "One-Shots — Prince Faline's RPG Diaries", active: "One-Shots", body }));
}

function renderOneShotDetail(s) {
  const cover = s.cover || "";
  const body = `
    <a href="/one-shots/" style="display:block;padding:16px 0 14px;font:400 17.1px/1 'EB Garamond',serif;color:#A5231F">◂ One-Shots</a>
    <div style="display:flex;flex-wrap:wrap;gap:30px;padding-bottom:56px">
      <div style="flex:1 1 240px;max-width:290px">
        <div style="aspect-ratio:1/1;display:grid;place-items:center;overflow:hidden">
          ${cover ? `<div style="width:100%;height:100%;background:url(${cover}) center/cover no-repeat"></div>` : `<div style="width:100%;height:100%;background:${stripes("#e4dcc6", "#f3eedd")};display:grid;place-items:center"><span style="font:400 19px/1.3 'EB Garamond',serif;color:#5B5648;text-align:center">${esc(s.t)}</span></div>`}
        </div>
        <div style="border:1px solid #C8BFA6;background:#FBF8EF;margin-top:12px">
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #E6DFCB;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">System</span>${sysTag(s.s, s.ed)}</div>
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid #E6DFCB;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">Date</span><span>${mon(s.d)}</span></div>
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;font:400 17.1px/1.4 'EB Garamond',serif"><span style="color:#8A836F">At the Table</span><span>${s.rt}</span></div>
        </div>
      </div>
      <div style="flex:999 1 380px;max-width:68ch">
        <h1 style="font:400 clamp(32px,4.6vw,46px)/1.04 'EB Garamond',serif;margin:0 0 22px">${esc(s.t)}</h1>
        ${(s.writeup || []).map(p => `<p style="font:400 18px/1.72 'EB Garamond',serif;color:#2E2A22;margin:0 0 20px;text-wrap:pretty">${esc(p)}</p>`).join("") || `<p style="font:400 18px/1.72 'EB Garamond',serif;color:#8A836F">No write-up yet.</p>`}
      </div>
    </div>`;
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
if (fs.existsSync(path.join(ROOT, "admin"))) copyDir(path.join(ROOT, "admin"), path.join(DIST, "admin"));

console.log("Built", campaigns.length + 1, "campaign pages,", reviews.length + 1, "review pages, home, games.");
