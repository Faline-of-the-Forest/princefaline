// Assign a stable slug to every existing one-shot session so every one-shot
// automatically gets its own page, not just ones added after this point.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const sessionsPath = path.join(ROOT, "content", "sessions.json");
const data = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));

function slugify(s) {
  return s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const used = new Set();
let assigned = 0;
data.sessions.forEach(s => {
  if (s.campaignSlug) return; // has a campaign, not a one-shot
  if (s.slug) { used.add(s.slug); return; }
  let base = slugify(s.t) || "session-" + s.n;
  let slug = base, i = 2;
  while (used.has(slug)) { slug = base + "-" + i; i++; }
  used.add(slug);
  s.slug = slug;
  assigned++;
});

fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
console.log(`Assigned slugs to ${assigned} one-shot sessions.`);
