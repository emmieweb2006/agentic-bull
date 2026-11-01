// Produces build/bull-art.js with the art data inlined (used by the site and the tests).
const fs = require("fs"); const path = require("path");
const { L, COLORS, encode } = require("./art");
const A = { BG: COLORS.BG, FUR: COLORS.FUR, MUZ: COLORS.MUZ, FIX: COLORS.FIX };
for (const k of Object.keys(L)) A[k] = encode(L[k]);
const src = fs.readFileSync(path.join(__dirname, "../src/bull-art.js"), "utf8")
  .replace(/\/\*ART_JSON\*\/null\/\*END_ART_JSON\*\//, JSON.stringify(A));
fs.mkdirSync(path.join(__dirname, "../build"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../build/bull-art.js"), src);
console.log("build/bull-art.js", src.length, "bytes");
