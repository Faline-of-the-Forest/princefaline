// Split "System [Edition]" strings into separate base-system + edition fields,
// for both sessions (field "s") and campaigns (field "sys"). Reviews already
// store these separately (sys / ed) and need no migration.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function split(str) {
  const m = /^(.*?)\s*\[([^\]]+)\]$/.exec(str);
  return m ? { base: m[1].trim(), ed: m[2].trim() } : { base: str, ed: "" };
}

// sessions.json
const sessionsPath = path.join(ROOT, "content", "sessions.json");
const sdata = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
let sCount = 0;
sdata.sessions.forEach(s => {
  const { base, ed } = split(s.s);
  if (ed) { s.s = base; s.ed = ed; sCount++; }
});
fs.writeFileSync(sessionsPath, JSON.stringify(sdata, null, 2));
console.log(`sessions.json: split edition out of ${sCount} entries`);

// campaigns/*.json
const campaignsDir = path.join(ROOT, "content", "campaigns");
let cCount = 0;
fs.readdirSync(campaignsDir).filter(f => f.endsWith(".json")).forEach(f => {
  const p = path.join(campaignsDir, f);
  const c = JSON.parse(fs.readFileSync(p, "utf8"));
  const { base, ed } = split(c.sys);
  if (ed) { c.sys = base; c.ed = ed; cCount++; }
  fs.writeFileSync(p, JSON.stringify(c, null, 2));
});
console.log(`campaigns: split edition out of ${cCount} files`);
