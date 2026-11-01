const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const ART = require("../build/bull-art.js");

const REG = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const PAYOUT = "0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a";
const PRICE = 140000000000000n;
const TIER_TOTALS = [1800, 600, 375, 150, 75];

const decode = (uri) => JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());

async function answerFor(bull, wallet, handle) {
  const [, a, b] = await bull.challengeOf(wallet);
  return a * b + BigInt(Buffer.byteLength(handle, "utf8"));
}

let walletSeq = 0;
async function newWallets(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const w = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes("agentic-bull-test-" + walletSeq++)), ethers.provider);
    await network.provider.send("hardhat_setBalance", [w.address, "0x56BC75E2D63100000"]); // 100 BNB
    out.push(w);
  }
  return out;
}

async function setHandles(reg, wallets, handles) {
  for (let i = 0; i < wallets.length; i += 250) {
    await reg.setHandles(wallets.slice(i, i + 250).map((w) => w.address ?? w), handles.slice(i, i + 250));
  }
}

async function deployFixture() {
  const mockArt = await artifacts.readArtifact("MockRegistry");
  await network.provider.send("hardhat_setCode", [REG, mockArt.deployedBytecode]);
  const reg = await ethers.getContractAt("MockRegistry", REG);
  const start = (await time.latest()) + 3600;
  const bull = await (await ethers.getContractFactory("AgenticBull")).deploy(start);
  const [deployer, alice, bob, carol, dave] = await ethers.getSigners();
  await reg.setHandle(alice.address, "testagent");
  await reg.setHandle(bob.address, "bobagent");
  await reg.setHandle(carol.address, "testagent"); // same Agent ID as alice, different wallet
  const caller = await (await ethers.getContractFactory("ContractMinter")).deploy();
  await reg.setHandle(await caller.getAddress(), "contractagent");
  return { bull, reg, start, deployer, alice, bob, carol, dave, caller };
}

async function liveFixture() {
  const f = await deployFixture();
  await time.increaseTo(f.start);
  return f;
}

/** Fills the free phase: 995 public free mints (5 are the creator reserve). */
async function freeDoneFixture() {
  const f = await liveFixture();
  const left = 1000 - Number(await f.bull.totalMinted());
  const ws = await newWallets(left);
  const hs = ws.map((_, i) => "free" + i);
  await setHandles(f.reg, ws, hs);
  for (let i = 0; i < ws.length; i++) {
    await f.bull.connect(ws[i]).mintFree(await answerFor(f.bull, ws[i].address, hs[i]));
  }
  return f;
}

describe("AgenticBull", function () {
  describe("deployment", function () {
    it("mints creator reserve #1-#5 to PAYOUT, counted as free", async function () {
      const { bull } = await loadFixture(deployFixture);
      for (let id = 1; id <= 5; id++) expect(await bull.ownerOf(id)).to.equal(PAYOUT);
      expect(await bull.totalMinted()).to.equal(5n);
      expect(await bull.freeMinted()).to.equal(5n);
      expect(await bull.paidMinted()).to.equal(0n);
      expect(await bull.balanceOf(PAYOUT)).to.equal(5n);
      const rem = await bull.tierRemaining();
      expect(rem.reduce((a, b) => a + b, 0n)).to.equal(2995n);
    });
    it("constants, registry, royalty 5% to PAYOUT, interfaces", async function () {
      const { bull } = await loadFixture(deployFixture);
      expect(await bull.registry()).to.equal(REG);
      expect(await bull.PAYOUT()).to.equal(PAYOUT);
      expect(await bull.MAX_SUPPLY()).to.equal(3000n);
      expect(await bull.FREE_SUPPLY()).to.equal(1000n);
      expect(await bull.PRICE()).to.equal(PRICE);
      expect(await bull.name()).to.equal("Agentic Bull");
      const [recv, amt] = await bull.royaltyInfo(1, 10000);
      expect(recv).to.equal(PAYOUT);
      expect(amt).to.equal(500n);
      expect(await bull.supportsInterface("0x2a55205a")).to.equal(true); // ERC-2981
      expect(await bull.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
      expect(await bull.supportsInterface("0x5b5e139f")).to.equal(true); // metadata
      expect(await bull.supportsInterface("0x01ffc9a7")).to.equal(true); // ERC-165
    });
    it("has no owner / admin / withdraw / setter / pause functions", async function () {
      const { bull } = await loadFixture(deployFixture);
      const names = bull.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
      for (const bad of ["owner", "transferOwnership", "renounceOwnership", "withdraw", "pause", "unpause", "setPrice", "setRoyalty", "setBaseURI", "setDefaultRoyalty"]) {
        expect(names).to.not.include(bad);
      }
      const writes = bull.interface.fragments.filter((f) => f.type === "function" && !["view", "pure"].includes(f.stateMutability)).map((f) => f.name).sort();
      expect(writes).to.deep.equal(["approve", "mint", "mintFree", "safeTransferFrom", "safeTransferFrom", "setApprovalForAll", "transferFrom"].sort());
    });
    it("contractURI is on-chain JSON with the marketplace fields", async function () {
      const { bull } = await loadFixture(deployFixture);
      const j = decode(await bull.contractURI());
      expect(j.name).to.equal("Agentic Bull");
      expect(j.seller_fee_basis_points).to.equal(500);
      expect(j.fee_recipient.toLowerCase()).to.equal(PAYOUT.toLowerCase());
      expect(j.external_link).to.equal("PASTE_SITE_URL_HERE");
      expect(j.image.startsWith("data:image/svg+xml;base64,")).to.equal(true);
      expect(Buffer.from(j.image.split(",")[1], "base64").toString()).to.equal(ART.svg(0x01020003n, 4));
    });
    it("tokenURI: base64 JSON, 480x480 crispEdges 24x24 SVG, 7 attributes, exact description", async function () {
      const { bull } = await loadFixture(deployFixture);
      const j = decode(await bull.tokenURI(1));
      expect(j.name).to.equal("Agentic Bull #1");
      expect(j.description).to.equal("Agentic Bull: 3,000 fully onchain pixel bulls minted by AI agents holding an Agent ID on BNB Chain. Independent community project, not affiliated with Binance.");
      expect(j.attributes.map((a) => a.trait_type)).to.deep.equal(["Tier", "Background", "Fur", "Horns", "Eyes", "Nose Ring", "Accessory"]);
      const svg = Buffer.from(j.image.split(",")[1], "base64").toString();
      expect(svg).to.contain('viewBox="0 0 24 24" width="480" height="480" shape-rendering="crispEdges"');
      await expect(bull.tokenURI(6)).to.be.reverted;
    });
  });

  describe("gate", function () {
    it("reverts before MINT_START", async function () {
      const { bull, alice } = await loadFixture(deployFixture);
      await expect(bull.connect(alice).mintFree(await answerFor(bull, alice.address, "testagent"))).to.be.revertedWith("Mint not started");
    });
    it("a wallet without an Agent ID reverts", async function () {
      const { bull, dave } = await loadFixture(liveFixture);
      expect(await bull.agentIdOf(dave.address)).to.equal("");
      await expect(bull.connect(dave).mintFree(0)).to.be.revertedWith("Agent ID required");
      await expect(bull.connect(dave).mint(1, 0, { value: PRICE })).to.be.revertedWith("Agent ID required");
    });
    it("a wrong answer reverts, the right one mints", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mintFree(ans + 1n)).to.be.revertedWith("Wrong answer");
      await expect(bull.connect(alice).mintFree(ans - 9n)).to.be.revertedWith("Wrong answer"); // a*b alone (forgot the handle length)
      await expect(bull.connect(alice).mintFree(0)).to.be.revertedWith("Wrong answer");
      await expect(bull.connect(alice).mintFree(ans)).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 6n, 1n, true);
      expect(await bull.ownerOf(6)).to.equal(alice.address);
    });
    it("contract callers revert with EOA only (free and paid)", async function () {
      const { bull, caller } = await loadFixture(liveFixture);
      const addr = await bull.getAddress();
      await expect(caller.tryFree(addr, await answerFor(bull, await caller.getAddress(), "contractagent"))).to.be.revertedWith("EOA only");
      await expect(caller.tryPaid(addr, 1, 0, { value: PRICE })).to.be.revertedWith("EOA only");
    });
    it("challengeOf: a and b in 2..20, question wording, depends on wallet", async function () {
      const { bull, alice } = await loadFixture(deployFixture);
      const seen = new Set();
      for (let i = 0; i < 200; i++) {
        const w = ethers.getAddress(ethers.dataSlice(ethers.keccak256(ethers.toUtf8Bytes("w" + i)), 12));
        const [q, a, b] = await bull.challengeOf(w);
        expect(a >= 2n && a <= 20n && b >= 2n && b <= 20n).to.equal(true);
        expect(q).to.equal(`What is ${a} x ${b} plus the number of characters in your Agent ID (without .ai)?`);
        seen.add(a); seen.add(b);
      }
      expect(seen.size).to.equal(19); // every value 2..20 shows up
      const [q1] = await bull.challengeOf(alice.address);
      expect(q1).to.match(/^What is \d+ x \d+ plus/);
    });
  });

  describe("free phase", function () {
    it("1 free per wallet", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await bull.connect(alice).mintFree(ans);
      await expect(bull.connect(alice).mintFree(ans)).to.be.revertedWith("Free limit: wallet");
      expect(await bull.freeMintedBy(alice.address)).to.equal(1n);
      expect(await bull.mintedBy(alice.address)).to.equal(1n);
      expect(await bull.mintableBy(alice.address)).to.equal(0n);
    });
    it("1 free per Agent ID, even from another wallet", async function () {
      const { bull, reg, alice, carol, dave } = await loadFixture(liveFixture);
      expect(await bull.mintableBy(carol.address)).to.equal(1n);
      await bull.connect(alice).mintFree(await answerFor(bull, alice.address, "testagent"));
      expect(await bull.mintableBy(carol.address)).to.equal(0n);
      await expect(bull.connect(carol).mintFree(await answerFor(bull, carol.address, "testagent"))).to.be.revertedWith("Free limit: Agent ID");
      expect(await bull.mintedByAgent("testagent")).to.equal(1n);
      // the wallet that minted cannot mint again under a new Agent ID either
      await reg.setHandle(alice.address, "newhandle");
      await expect(bull.connect(alice).mintFree(await answerFor(bull, alice.address, "newhandle"))).to.be.revertedWith("Free limit: wallet");
      // a fresh wallet with a fresh Agent ID still can
      await reg.setHandle(dave.address, "dave");
      await bull.connect(dave).mintFree(await answerFor(bull, dave.address, "dave"));
    });
    it("mintFree is not payable, and paid mint is closed during the free phase", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(alice.sendTransaction({ to: await bull.getAddress(), data: bull.interface.encodeFunctionData("mintFree", [ans]), value: 1n })).to.be.reverted;
      await expect(bull.connect(alice).mint(1, ans, { value: PRICE })).to.be.revertedWith("Free phase active");
      expect(await bull.isFreePhase()).to.equal(true);
    });
    it("handle length counts UTF-8 bytes (bytes(handle).length)", async function () {
      const { bull, reg, dave } = await loadFixture(liveFixture);
      await reg.setHandle(dave.address, "agent007");
      await bull.connect(dave).mintFree(await answerFor(bull, dave.address, "agent007"));
    });
  });

  describe("paid phase", function () {
    it("the free phase ends at exactly 1,000 and mintFree closes", async function () {
      const { bull, alice } = await loadFixture(freeDoneFixture);
      expect(await bull.totalMinted()).to.equal(1000n);
      expect(await bull.freeMinted()).to.equal(1000n);
      expect(await bull.isFreePhase()).to.equal(false);
      await expect(bull.connect(alice).mintFree(await answerFor(bull, alice.address, "testagent"))).to.be.revertedWith("Free mint over");
      expect(await bull.mintableBy(alice.address)).to.equal(10n);
    });
    it("needs exact payment", async function () {
      const { bull, alice } = await loadFixture(freeDoneFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE * 2n + 1n })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(1, ans, { value: 0 })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE * 2n })).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 1001n, 2n, false);
      expect(await bull.paidMinted()).to.equal(2n);
    });
    it("payout receives the BNB in the same tx; the contract holds none", async function () {
      const { bull, alice } = await loadFixture(freeDoneFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      const before = await ethers.provider.getBalance(PAYOUT);
      await bull.connect(alice).mint(10, ans, { value: PRICE * 10n });
      expect((await ethers.provider.getBalance(PAYOUT)) - before).to.equal(PRICE * 10n);
      expect(await ethers.provider.getBalance(await bull.getAddress())).to.equal(0n);
    });
    it("quantity 1-10, 10 per wallet, 10 per Agent ID across wallets", async function () {
      const { bull, alice, bob, carol } = await loadFixture(freeDoneFixture);
      const a = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(0, a, { value: 0 })).to.be.revertedWith("Bad quantity");
      await expect(bull.connect(alice).mint(11, a, { value: PRICE * 11n })).to.be.revertedWith("Bad quantity");
      await bull.connect(alice).mint(6, a, { value: PRICE * 6n });
      await expect(bull.connect(alice).mint(5, a, { value: PRICE * 5n })).to.be.revertedWith("Wallet limit");
      expect(await bull.mintableBy(alice.address)).to.equal(4n);
      expect(await bull.mintableBy(carol.address)).to.equal(4n); // shares alice's Agent ID
      const c = await answerFor(bull, carol.address, "testagent");
      await expect(bull.connect(carol).mint(5, c, { value: PRICE * 5n })).to.be.revertedWith("Agent ID limit");
      await bull.connect(carol).mint(4, c, { value: PRICE * 4n });
      await expect(bull.connect(alice).mint(1, a, { value: PRICE })).to.be.revertedWith("Agent ID limit");
      expect(await bull.mintedByAgent("testagent")).to.equal(10n);
      expect(await bull.mintedBy(carol.address)).to.equal(4n);
      const b = await answerFor(bull, bob.address, "bobagent");
      await bull.connect(bob).mint(10, b, { value: PRICE * 10n });
    });
    it("reverts the whole mint if the payout transfer fails", async function () {
      const { bull, alice } = await loadFixture(freeDoneFixture);
      await network.provider.send("hardhat_setCode", [PAYOUT, "0x60006000fd"]); // PUSH 0 PUSH 0 REVERT
      await expect(bull.connect(alice).mint(1, await answerFor(bull, alice.address, "testagent"), { value: PRICE })).to.be.revertedWith("Payout failed");
      await network.provider.send("hardhat_setCode", [PAYOUT, "0x"]);
    });
  });

  describe("no function leaks the answer", function () {
    it("no view/pure output equals the answer, and the question never contains it", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const [q, a, b] = await bull.challengeOf(alice.address);
      const ans = a * b + 9n; // "testagent" = 9 characters
      expect(q).to.not.match(new RegExp(`\\b${ans}\\b`));
      const argFor = { address: alice.address, uint256: 1n, string: "testagent", bytes4: "0x2a55205a" };
      const skipStrings = new Set(["tokenURI", "contractURI", "svgOf"]); // art data, independent of any wallet
      let checked = 0;
      for (const f of bull.interface.fragments.filter((x) => x.type === "function" && ["view", "pure"].includes(x.stateMutability))) {
        const args = f.inputs.map((i) => argFor[i.type]);
        const out = await bull[f.format("sighash")](...args);
        const flat = [out].flat(3);
        for (const v of flat) {
          if (typeof v === "bigint") expect(v, f.name).to.not.equal(ans);
          if (typeof v === "string" && !skipStrings.has(f.name)) expect(v, f.name).to.not.match(new RegExp(`\\b${ans}\\b`));
        }
        checked++;
      }
      expect(checked).to.be.greaterThan(20);
      // and the ABI has no function that takes a wallet and returns a single answer-like number besides counters
      const names = bull.interface.fragments.filter((x) => x.type === "function").map((x) => x.name);
      for (const n of ["answerOf", "expectedAnswer", "answer", "solution"]) expect(names).to.not.include(n);
    });
  });

  describe("full mint of all 3,000", function () {
    it("exact tier totals, sold out, every image matches the JS generator", async function () {
      const { bull, reg } = await loadFixture(freeDoneFixture);
      const ws = await newWallets(200);
      const hs = ws.map((_, i) => "paid" + i);
      await setHandles(reg, ws, hs);
      for (let i = 0; i < ws.length; i++) {
        await bull.connect(ws[i]).mint(10, await answerFor(bull, ws[i].address, hs[i]), { value: PRICE * 10n });
      }
      expect(await bull.totalMinted()).to.equal(3000n);
      expect(await bull.paidMinted()).to.equal(2000n);
      expect((await bull.tierRemaining()).map(Number)).to.deep.equal([0, 0, 0, 0, 0]);
      const counts = [0, 0, 0, 0, 0];
      for (let id = 1; id <= 3000; id++) {
        const [t, name] = await bull.tierOf(id);
        counts[Number(t)]++;
        expect(name).to.equal(ART.NAMES.TIER[Number(t)]);
      }
      expect(counts).to.deep.equal(TIER_TOTALS);
      console.log("      tier totals:", counts.join(" / "));
      // sold out
      const [extra] = await newWallets(1);
      await reg.setHandle(extra.address, "late");
      await expect(bull.connect(extra).mint(1, await answerFor(bull, extra.address, "late"), { value: PRICE })).to.be.revertedWith("Sold out");
      expect(await bull.mintableBy(extra.address)).to.equal(0n);
      // JS preview generator == contract art, and tokenURI image == svgOf, for a spread of tokens incl. every tier
      const ids = [...Array(3000).keys()].map((i) => i + 1).filter((id) => id <= 10 || id % 23 === 0 || id > 2990);
      const seenTiers = new Set();
      for (const id of ids) {
        const j = decode(await bull.tokenURI(id));
        const svg = Buffer.from(j.image.split(",")[1], "base64").toString();
        expect(await bull.svgOf(id)).to.equal(svg);
        const tier = ART.NAMES.TIER.indexOf(j.attributes[0].value);
        seenTiers.add(tier);
        expect(j.name).to.equal(`Agentic Bull #${id}`);
        const v = j.attributes.map((x) => x.value);
        const tr = { tier, bg: ART.NAMES.BG.indexOf(v[1]), fur: ART.NAMES.FUR.indexOf(v[2]), horns: ART.NAMES.HORNS.indexOf(v[3]),
          eyes: ART.NAMES.EYES.indexOf(v[4]), ring: v[5] === "Yes", acc: ART.NAMES.ACC.indexOf(v[6]) };
        expect(ART.svgFromTraits(tr), "JS generator vs contract, token " + id).to.equal(svg);
        if (tier === 4) {
          expect(j.attributes[3].value).to.equal("Golden");
          expect(j.attributes[6].value).to.equal("Crown");
        }
      }
      expect(seenTiers.size).to.equal(5);
    });
  });
});
