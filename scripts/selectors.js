// Prints every external/public function of AgenticBull with its 4-byte selector (computed from the compiled ABI) and writes site/abi.json.
const fs = require("fs"); const { ethers } = require("ethers");
const a = require("../artifacts/contracts/AgenticBull.sol/AgenticBull.json");
const iface = new ethers.Interface(a.abi);
fs.writeFileSync(__dirname + "/../site/abi.json", JSON.stringify(a.abi, null, 1));
const rows = [];
iface.forEachFunction((f) => rows.push([f.selector, f.format("sighash"), f.stateMutability, f.outputs.map((o) => o.type + (o.name ? " " + o.name : "")).join(", ")]));
rows.sort((x, y) => x[1].localeCompare(y[1]));
const events = []; iface.forEachEvent((e) => events.push([e.topicHash, e.format("sighash")]));
const md = ["| Selector | Function | Mutability | Returns |", "|---|---|---|---|", ...rows.map((r) => `| \`${r[0]}\` | \`${r[1]}\` | ${r[2]} | ${r[3] || "-"} |`),
  "", "| Topic0 | Event |", "|---|---|", ...events.map((e) => `| \`${e[0]}\` | \`${e[1]}\` |`)].join("\n");
fs.writeFileSync(__dirname + "/../docs/SELECTORS.md", "# AgenticBull function selectors\n\nComputed with ethers from the compiled ABI (keccak256 of the signature, first 4 bytes).\n\n" + md + "\n");
console.log(md);
console.log(JSON.stringify(Object.fromEntries(rows.map((r) => [r[1], r[0]]))));
