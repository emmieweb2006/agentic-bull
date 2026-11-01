// Fills the site placeholders after deploy. Writes a ready-to-upload copy to dist/site and dist/site.zip; site/ stays untouched.
// Usage: node scripts/fill-placeholders.js --address 0x... --site https://agentic-bull.pages.dev [--element https://...] [--okx https://...]
// Leave --element / --okx out and the Trade buttons keep showing "Coming soon".
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : undefined; };
const address = arg("address"), site = (arg("site") || "").replace(/\/+$/, ""), element = arg("element"), okx = arg("okx");
if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) throw new Error("--address must be a 0x... contract address");
if (!/^https:\/\/[^\s"'<>]+$/.test(site)) throw new Error("--site must start with https://");
for (const [k, v] of [["element", element], ["okx", okx]]) if (v && !/^https:\/\/[^\s"'<>]+$/.test(v)) throw new Error(`--${k} must start with https://`);
const src = path.join(__dirname, "..", "site"), out = path.join(__dirname, "..", "dist", "site");
fs.rmSync(path.dirname(out), { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(out)) {
  if (!/\.(html|txt|json|xml)$/.test(f) && !f.endsWith("_headers")) continue;
  let s = fs.readFileSync(f, "utf8"), before = s;
  s = s.split("PASTE_ADDRESS_HERE").join(address).split("PASTE_SITE_URL_HERE").join(site);
  if (element) s = s.split("ELEMENT_LINK_HERE").join(element);
  if (okx) s = s.split("OKX_LINK_HERE").join(okx);
  if (s !== before) { fs.writeFileSync(f, s); console.log("filled", path.relative(out, f)); }
}
try { execSync(`python3 -c "import shutil; shutil.make_archive('../site', 'zip', '.')"`, { cwd: out }); } catch { console.log("(zip skipped: python3 not found; upload the dist/site folder instead)"); }
console.log("ready:", out, "and dist/site.zip");
