// One-time migration: rpg-data.js + rpg-content.js -> content/*.json
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "rpg-data.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "rpg-content.js"), "utf8"), sandbox);

const RPG = sandbox.window.RPG;
const RPGC = sandbox.window.RPGC;

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CONTENT = path.join(ROOT, "content");
fs.mkdirSync(path.join(CONTENT, "campaigns"), { recursive: true });
fs.mkdirSync(path.join(CONTENT, "reviews"), { recursive: true });

// sessions.json - the ledger, single source of truth for stats
fs.writeFileSync(path.join(CONTENT, "sessions.json"), JSON.stringify({ sessions: RPG.sessions }, null, 2));

// campaigns/<slug>.json - merge ledger-derived summary with hand-authored detail
const detail = RPGC.campaign; // only "bloodletting" has hand-authored detail today
RPG.campaigns.forEach(c => {
  const slug = slugify(c.name);
  const hasDetail = detail && detail.title === c.name;
  const out = {
    slug,
    name: c.name,
    sys: c.sys,
    status: c.status,
    banner: (RPG.banners || {})[c.name] || "",
    covers: (RPG.covers || {})[c.name] || [],
  };
  if (hasDetail) {
    out.tags = detail.tags;
    out.tagline = detail.tagline;
    out.premise = detail.premise;
    out.influences = detail.influences;
    out.materials = detail.materials;
    out.cast = detail.cast;
    out.episodes = detail.episodes;
  }
  fs.writeFileSync(path.join(CONTENT, "campaigns", slug + ".json"), JSON.stringify(out, null, 2));
});

// reviews/<slug>.json
RPGC.reviews.forEach(r => {
  const slug = slugify(r.t + (r.ed ? "-" + r.ed : ""));
  fs.writeFileSync(path.join(CONTENT, "reviews", slug + ".json"), JSON.stringify({ slug, ...r }, null, 2));
});

// dashboards.json
fs.writeFileSync(path.join(CONTENT, "dashboards.json"), JSON.stringify({ dashboards: RPGC.dashboards }, null, 2));

console.log("Migrated:", RPG.sessions.length, "sessions,", RPG.campaigns.length, "campaigns,", RPGC.reviews.length, "reviews,", RPGC.dashboards.length, "dashboards.");
