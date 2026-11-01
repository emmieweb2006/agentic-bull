// Local preview: deploys with a mock registry on the Hardhat network, mints, and dumps SVGs to preview/.
const hre = require("hardhat"); const fs = require("fs");
const ART = require("../build/bull-art.js");
const REG = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
(async () => {
  const { ethers } = hre;
  const Mock = await ethers.getContractFactory("MockRegistry");
  const art = await hre.artifacts.readArtifact("MockRegistry");
  await hre.network.provider.send("hardhat_setCode", [REG, art.deployedBytecode]);
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const bull = await (await ethers.getContractFactory("AgenticBull")).deploy(now);
  fs.mkdirSync("preview", { recursive: true });
  for (let id = 1; id <= 5; id++) {
    const uri = await bull.tokenURI(id);
    const j = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
    fs.writeFileSync(`preview/token${id}.svg`, Buffer.from(j.image.split(",")[1], "base64"));
    console.log(id, j.attributes.map((a) => a.value).join(" | "));
  }
  const c = JSON.parse(Buffer.from((await bull.contractURI()).split(",")[1], "base64").toString());
  fs.writeFileSync("preview/contract-legendary.svg", Buffer.from(c.image.split(",")[1], "base64"));
  console.log(c.name, c.external_link, c.seller_fee_basis_points);
  // 12 samples covering every tier and trait, JS generator
  // 12 samples (JS generator): every tier, and every horn / eye / accessory type at least once
  const samples = []; const want = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4];
  let x = 7n;
  for (let i = 0; i < 12; i++) {
    for (;;) {
      x = (x * 6364136223846793005n + 1442695040888963407n) & ((1n << 248n) - 1n);
      const tr = ART.traits(x, want[i]);
      const ok = (want[i] === 4 || tr.horns === i % 6) && tr.eyes === (i + 1) % 6 && (want[i] === 4 || tr.acc === (i + 3) % 6) && tr.bg === i % 8;
      if (ok) { samples.push({ s: "0x" + x.toString(16), t: want[i] }); break; }
    }
  }
  fs.writeFileSync("preview/samples.json", JSON.stringify(samples));
  let html = '<html><body style="margin:0;background:#07090f;display:grid;grid-template-columns:repeat(4,240px);gap:12px;padding:12px">';
  for (const x of samples) html += `<div style="color:#ffd700;font:14px monospace;text-align:center">${ART.svg(x.s, x.t).replace('width="480" height="480"', 'width="240" height="240"')}<br>${ART.NAMES.TIER[x.t]}</div>`;
  fs.writeFileSync("preview/samples.html", html + "</body></html>");
})();
