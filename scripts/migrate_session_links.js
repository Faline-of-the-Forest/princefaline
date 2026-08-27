// One-time migration: replace session.c (free-text campaign name / "One-Shot")
// with session.campaignSlug (stable reference, "" for one-shots).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const campaignsDir = path.join(ROOT, "content", "campaigns");
const campaigns = fs.readdirSync(campaignsDir).filter(f => f.endsWith(".json")).map(f => {
  const c = JSON.parse(fs.readFileSync(path.join(campaignsDir, f), "utf8"));
  return { slug: c.slug, name: c.name };
});

const sessionsPath = path.join(ROOT, "content", "sessions.json");
const data = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));

let unmatched = 0;
data.sessions.forEach(s => {
  if (s.c === "One-Shot") {
    s.campaignSlug = "";
  } else {
    const match = campaigns.find(c => c.name === s.c);
    if (!match) {
      console.warn("UNMATCHED campaign name:", s.c, "on session #" + s.n);
      unmatched++;
      s.campaignSlug = "";
    } else {
      s.campaignSlug = match.slug;
    }
  }
  delete s.c;
});

fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
console.log(`Migrated ${data.sessions.length} sessions. Unmatched: ${unmatched}.`);
