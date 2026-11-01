// Builds site/index.html from src/index.template.html (inlines art generator, translations and sample seeds).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
require("child_process").execSync("node scripts/build-art-js.js", { cwd: root, stdio: "inherit" });
const ART = require(path.join(root, "build/bull-art.js"));
const samples = JSON.parse(fs.readFileSync(path.join(root, "preview/samples.json"), "utf8"));
const leg = samples[samples.length - 1];
const fav = encodeURIComponent(ART.svg(BigInt(leg.s), leg.t).replace(/<animate[^>]*\/>/g, ""));
let html = fs.readFileSync(path.join(root, "src/index.template.html"), "utf8")
  .replace("/*__BULL_ART__*/", () => fs.readFileSync(path.join(root, "build/bull-art.js"), "utf8"))
  .replace("/*__I18N__*/", () => fs.readFileSync(path.join(root, "src/i18n.js"), "utf8"))
  .replace("/*__SAMPLES__*/", () => JSON.stringify(samples))
  .replace("__FAVICON__", () => fav);
fs.writeFileSync(path.join(root, "site/index.html"), html);
console.log("site/index.html", html.length, "bytes");
