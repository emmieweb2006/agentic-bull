// Writes the art constants from scripts/art.js into contracts/AgenticBull.sol between <ART> markers.
const fs = require("fs"); const path = require("path");
const { L, COLORS, encode } = require("./art");
const p = path.join(__dirname, "../contracts/AgenticBull.sol");
let s = fs.readFileSync(p, "utf8");
const lines = [
  `    bytes private constant BG = hex"${COLORS.BG.join("")}";`,
  `    bytes private constant FUR = hex"${COLORS.FUR.join("")}";`,
  `    bytes private constant MUZ = hex"${COLORS.MUZ.join("")}";`,
  `    bytes private constant FIX = hex"${COLORS.FIX.join("")}"; // slots 3-15`,
  ...Object.keys(L).map((k) => `    bytes private constant ${k} = hex"${encode(L[k])}";`),
];
s = s.replace(/(\/\/ <ART>[^\n]*\n)[\s\S]*?(    \/\/ <\/ART>)/, `$1${lines.join("\n")}\n$2`);
fs.writeFileSync(p, s);
console.log(lines.join("\n"));
