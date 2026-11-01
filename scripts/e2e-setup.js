// Local-only e2e setup on a Hardhat node: mock registry + Multicall3 stand-in + AgenticBull. Never run against BSC.
const hre = require("hardhat");
async function main() {
  const { ethers, network } = hre;
  if (network.name !== "localhost") throw new Error("localhost only");
  const REG = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", MC = "0xcA11bde05977b3631167028862bE2a173976CA11";
  const [, agent, other] = await ethers.getSigners();
  for (const [name, addr] of [["MockRegistry", REG], ["Multicall3Lite", MC]]) {
    const art = await hre.artifacts.readArtifact(name);
    await network.provider.send("hardhat_setCode", [addr, art.deployedBytecode]);
  }
  const reg = await ethers.getContractAt("MockRegistry", REG);
  await (await reg.setHandle(agent.address, "webs")).wait();
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const c = await (await ethers.getContractFactory("AgenticBull")).deploy(now - 5);
  await c.waitForDeployment();
  console.log(JSON.stringify({ address: await c.getAddress(), agent: agent.address, other: other.address }));
}
main().catch(e => { console.error(e); process.exit(1); });
