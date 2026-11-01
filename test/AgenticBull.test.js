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

/** Gives away every free bull: 995 public first-bull-free mints of 1 (5 are the creator reserve). */
async function freeDoneFixture() {
  const f = await liveFixture();
  const left = 1000 - Number(await f.bull.freeMinted());
  const ws = await newWallets(left);
  const hs = ws.map((_, i) => "free" + i);
  await setHandles(f.reg, ws, hs);
  for (let i = 0; i < ws.length; i++) {
    await f.bull.connect(ws[i]).mint(1, await answerFor(f.bull, ws[i].address, hs[i]), { value: 0 });
  }
  return f;
}

/** Mint `qty` with exactly costOf(wallet, qty). */
async function mintAt(bull, signer, handle, qty) {
  const value = await bull.costOf(signer.address, qty);
  return bull.connect(signer).mint(qty, await answerFor(bull, signer.address, handle), { value });
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
      expect(writes).to.deep.equal(["approve", "mint", "safeTransferFrom", "safeTransferFrom", "setApprovalForAll", "transferFrom"].sort());
      for (const gone of ["mintFree", "isFreePhase", "MAX_PAID_PER_WALLET", "MAX_PAID_PER_AGENT"]) expect(names).to.not.include(gone);
      expect(await bull.MAX_PER_WALLET()).to.equal(10n);
      expect(await bull.MAX_PER_AGENT()).to.equal(10n);
    });
    it("contractURI is on-chain JSON with the marketplace fields", async function () {
      const { bull } = await loadFixture(deployFixture);
      const j = decode(await bull.contractURI());
      expect(j.name).to.equal("Agentic Bull");
      expect(j.seller_fee_basis_points).to.equal(500);
      expect(j.fee_recipient.toLowerCase()).to.equal(PAYOUT.toLowerCase());
      expect(j.external_link).to.equal("https://agentic-bull.pages.dev");
      expect(j.image.startsWith("data:image/svg+xml;base64,")).to.equal(true);
      expect(Buffer.from(j.image.split(",")[1], "base64").toString()).to.equal(ART.svg(0x01020003n, 4));
    });
    it("contractURI has the exact collection description", async function () {
      const { bull } = await loadFixture(deployFixture);
      const j = decode(await bull.contractURI());
      expect(j.description).to.equal("3,000 Agentic Bulls on BNB Chain, minted only by .ai Agent IDs. Each Agent ID's first bull is free while the 1,000 free last. Extra bulls are 0.00014 BNB, up to 10 per Agent ID. Revealed instantly.");
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
      await expect(bull.connect(alice).mint(1, await answerFor(bull, alice.address, "testagent"))).to.be.revertedWith("Mint not started");
    });
    it("a wallet without an Agent ID reverts", async function () {
      const { bull, dave } = await loadFixture(liveFixture);
      expect(await bull.agentIdOf(dave.address)).to.equal("");
      await expect(bull.connect(dave).mint(1, 0)).to.be.revertedWith("Agent ID required");
      await expect(bull.connect(dave).mint(1, 0, { value: PRICE })).to.be.revertedWith("Agent ID required");
      expect(await bull.freeAvailableTo(dave.address)).to.equal(false);
      expect(await bull.mintableBy(dave.address)).to.equal(0n);
    });
    it("a wrong answer reverts, the right one mints", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(1, ans + 1n)).to.be.revertedWith("Wrong answer");
      await expect(bull.connect(alice).mint(1, ans - 9n)).to.be.revertedWith("Wrong answer"); // a*b alone (forgot the handle length)
      await expect(bull.connect(alice).mint(1, 0)).to.be.revertedWith("Wrong answer");
      await expect(bull.connect(alice).mint(1, ans)).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 6n, 1n, true);
      expect(await bull.ownerOf(6)).to.equal(alice.address);
    });
    it("contract callers revert with EOA only (free and paid)", async function () {
      const { bull, caller } = await loadFixture(liveFixture);
      const addr = await bull.getAddress();
      const ans = await answerFor(bull, await caller.getAddress(), "contractagent");
      await expect(caller.tryMint(addr, 1, ans)).to.be.revertedWith("EOA only");
      await expect(caller.tryMint(addr, 3, ans, { value: PRICE * 2n })).to.be.revertedWith("EOA only");
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

  describe("first bull free", function () {
    it("a first mint of 1 is free with value 0; sending BNB for it reverts", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      expect(await bull.freeAvailableTo(alice.address)).to.equal(true);
      expect(await bull.costOf(alice.address, 1)).to.equal(0n);
      expect(await bull.mintableBy(alice.address)).to.equal(10n);
      await expect(bull.connect(alice).mint(1, ans, { value: PRICE })).to.be.revertedWith("Wrong payment");
      const before = await ethers.provider.getBalance(PAYOUT);
      await expect(bull.connect(alice).mint(1, ans, { value: 0 })).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 6n, 1n, true);
      expect(await ethers.provider.getBalance(PAYOUT)).to.equal(before);
      expect(await bull.freeMinted()).to.equal(6n);
      expect(await bull.paidMinted()).to.equal(0n);
      expect(await bull.freeMintedBy(alice.address)).to.equal(1n);
      expect(await bull.freeAvailableTo(alice.address)).to.equal(false);
      expect(await bull.mintableBy(alice.address)).to.equal(9n);
    });
    it("a first mint of 3 costs exactly 2 x PRICE (1 free + 2 paid)", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      expect(await bull.costOf(alice.address, 3)).to.equal(PRICE * 2n);
      await expect(bull.connect(alice).mint(3, ans, { value: PRICE * 3n })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(3, ans, { value: PRICE })).to.be.revertedWith("Wrong payment");
      const before = await ethers.provider.getBalance(PAYOUT);
      await expect(bull.connect(alice).mint(3, ans, { value: PRICE * 2n })).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 6n, 3n, true);
      expect((await ethers.provider.getBalance(PAYOUT)) - before).to.equal(PRICE * 2n);
      expect(await bull.freeMinted()).to.equal(6n);
      expect(await bull.paidMinted()).to.equal(2n);
      expect(await bull.mintedBy(alice.address)).to.equal(3n);
      expect(await bull.balanceOf(alice.address)).to.equal(3n);
    });
    it("a second mint is fully paid", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      await bull.connect(alice).mint(1, ans);
      expect(await bull.costOf(alice.address, 1)).to.equal(PRICE);
      expect(await bull.costOf(alice.address, 4)).to.equal(PRICE * 4n);
      await expect(bull.connect(alice).mint(1, ans, { value: 0 })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(4, ans, { value: PRICE * 3n })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(4, ans, { value: PRICE * 4n })).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 7n, 4n, false);
      expect(await bull.freeMinted()).to.equal(6n);
      expect(await bull.paidMinted()).to.equal(4n);
    });
    it("free is limited per wallet AND per Agent ID across wallets", async function () {
      const { bull, reg, alice, carol, dave } = await loadFixture(liveFixture);
      expect(await bull.freeAvailableTo(carol.address)).to.equal(true);
      await mintAt(bull, alice, "testagent", 1);
      expect(await bull.freeAvailableTo(carol.address)).to.equal(false); // carol shares alice's Agent ID
      expect(await bull.costOf(carol.address, 2)).to.equal(PRICE * 2n);
      const c = await answerFor(bull, carol.address, "testagent");
      await expect(bull.connect(carol).mint(1, c, { value: 0 })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(carol).mint(2, c, { value: PRICE * 2n })).to.emit(bull, "Minted").withArgs(carol.address, "testagent", 7n, 2n, false);
      expect(await bull.freeMintedBy(carol.address)).to.equal(0n);
      // alice's wallet already had its free bull: a new Agent ID on it does not give another
      await reg.setHandle(alice.address, "newhandle");
      expect(await bull.freeAvailableTo(alice.address)).to.equal(false);
      await expect(bull.connect(alice).mint(1, await answerFor(bull, alice.address, "newhandle"), { value: 0 })).to.be.revertedWith("Wrong payment");
      // a fresh wallet + fresh Agent ID still gets one
      await reg.setHandle(dave.address, "dave");
      expect(await bull.freeAvailableTo(dave.address)).to.equal(true);
      await mintAt(bull, dave, "dave", 1);
      expect(await bull.freeMinted()).to.equal(7n);
    });
    it("handle length counts UTF-8 bytes (bytes(handle).length)", async function () {
      const { bull, reg, dave } = await loadFixture(liveFixture);
      await reg.setHandle(dave.address, "agent007");
      await bull.connect(dave).mint(1, await answerFor(bull, dave.address, "agent007"));
    });
  });

  describe("after the 1,000 free bulls", function () {
    it("free ends at exactly 1,000 (reserve included) and first mints are fully paid", async function () {
      const { bull, alice, bob } = await loadFixture(freeDoneFixture);
      expect(await bull.totalMinted()).to.equal(1000n);
      expect(await bull.freeMinted()).to.equal(1000n);
      expect(await bull.freeAvailableTo(alice.address)).to.equal(false);
      expect(await bull.costOf(alice.address, 1)).to.equal(PRICE);
      expect(await bull.costOf(alice.address, 3)).to.equal(PRICE * 3n);
      expect(await bull.mintableBy(alice.address)).to.equal(10n);
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(1, ans, { value: 0 })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(3, ans, { value: PRICE * 2n })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(3, ans, { value: PRICE * 3n })).to.emit(bull, "Minted").withArgs(alice.address, "testagent", 1001n, 3n, false);
      expect(await bull.freeMinted()).to.equal(1000n);
      expect(await bull.paidMinted()).to.equal(3n);
      expect(await bull.freeMintedBy(alice.address)).to.equal(0n);
      await mintAt(bull, bob, "bobagent", 1);
      expect(await bull.freeMinted()).to.equal(1000n);
    });
    it("the last free bull goes to one first mint, then free is over", async function () {
      const { bull, reg, alice, bob } = await loadFixture(liveFixture);
      const ws = await newWallets(994);
      const hs = ws.map((_, i) => "f" + i);
      await setHandles(reg, ws, hs);
      for (let i = 0; i < ws.length; i++) await bull.connect(ws[i]).mint(1, await answerFor(bull, ws[i].address, hs[i]));
      expect(await bull.freeMinted()).to.equal(999n);
      expect(await bull.costOf(alice.address, 2)).to.equal(PRICE);
      await mintAt(bull, alice, "testagent", 2); // takes free #1000
      expect(await bull.freeMinted()).to.equal(1000n);
      expect(await bull.freeAvailableTo(bob.address)).to.equal(false);
      expect(await bull.costOf(bob.address, 2)).to.equal(PRICE * 2n);
    });
  });

  describe("payment and limits", function () {
    it("wrong value reverts", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      const ans = await answerFor(bull, alice.address, "testagent");
      for (const v of [1n, PRICE - 1n, PRICE + 1n, PRICE * 3n, PRICE * 2n - 1n, PRICE * 2n + 1n]) {
        await expect(bull.connect(alice).mint(3, ans, { value: v })).to.be.revertedWith("Wrong payment");
      }
      await expect(bull.connect(alice).mint(1, ans, { value: 1n })).to.be.revertedWith("Wrong payment");
      await bull.connect(alice).mint(2, ans, { value: PRICE });
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE })).to.be.revertedWith("Wrong payment");
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE * 2n + 1n })).to.be.revertedWith("Wrong payment");
    });
    it("payout receives every wei in the same tx; the contract holds none", async function () {
      const { bull, alice, bob } = await loadFixture(liveFixture);
      const before = await ethers.provider.getBalance(PAYOUT);
      let expected = 0n;
      for (const [s, h, q] of [[alice, "testagent", 10], [bob, "bobagent", 1], [bob, "bobagent", 9]]) {
        const v = await bull.costOf(s.address, q); expected += v;
        await bull.connect(s).mint(q, await answerFor(bull, s.address, h), { value: v });
        expect(await ethers.provider.getBalance(await bull.getAddress())).to.equal(0n);
      }
      expect(expected).to.equal(PRICE * 18n);
      expect((await ethers.provider.getBalance(PAYOUT)) - before).to.equal(expected);
      expect(await bull.paidMinted()).to.equal(18n);
    });
    it("quantity 1-10, 10 per wallet and 10 per Agent ID in total (free + paid)", async function () {
      const { bull, alice, bob, carol } = await loadFixture(liveFixture);
      const a = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(0, a, { value: 0 })).to.be.revertedWith("Bad quantity");
      await expect(bull.connect(alice).mint(11, a, { value: PRICE * 10n })).to.be.revertedWith("Bad quantity");
      await mintAt(bull, alice, "testagent", 6); // 1 free + 5 paid
      expect(await bull.mintedBy(alice.address)).to.equal(6n);
      await expect(bull.connect(alice).mint(5, a, { value: PRICE * 5n })).to.be.revertedWith("Wallet limit");
      expect(await bull.mintableBy(alice.address)).to.equal(4n);
      expect(await bull.mintableBy(carol.address)).to.equal(4n); // shares alice's Agent ID
      const c = await answerFor(bull, carol.address, "testagent");
      await expect(bull.connect(carol).mint(5, c, { value: PRICE * 5n })).to.be.revertedWith("Agent ID limit");
      await mintAt(bull, carol, "testagent", 4);
      await expect(bull.connect(alice).mint(1, a, { value: PRICE })).to.be.revertedWith("Agent ID limit");
      expect(await bull.mintedByAgent("testagent")).to.equal(10n);
      expect(await bull.mintableBy(alice.address)).to.equal(0n);
      expect(await bull.mintableBy(carol.address)).to.equal(0n);
      expect(await bull.freeAvailableTo(carol.address)).to.equal(false);
      await mintAt(bull, bob, "bobagent", 10); // one mint of the full 10 incl. the free one
      expect(await bull.mintedBy(bob.address)).to.equal(10n);
      expect(await bull.freeMintedBy(bob.address)).to.equal(1n);
      await expect(bull.connect(bob).mint(1, await answerFor(bull, bob.address, "bobagent"), { value: PRICE })).to.be.revertedWith("Wallet limit");
    });
    it("reverts the whole mint if the payout transfer fails, but a value-0 free mint skips the call", async function () {
      const { bull, alice } = await loadFixture(liveFixture);
      await network.provider.send("hardhat_setCode", [PAYOUT, "0x60006000fd"]); // PUSH 0 PUSH 0 REVERT
      const ans = await answerFor(bull, alice.address, "testagent");
      await expect(bull.connect(alice).mint(2, ans, { value: PRICE })).to.be.revertedWith("Payout failed");
      await bull.connect(alice).mint(1, ans, { value: 0 }); // free, no call to PAYOUT
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
      const payoutBefore = await ethers.provider.getBalance(PAYOUT);
      for (let i = 0; i < ws.length; i++) {
        await mintAt(bull, ws[i], hs[i], 10);
      }
      expect((await ethers.provider.getBalance(PAYOUT)) - payoutBefore).to.equal(PRICE * 2000n); // every wei forwarded
      expect(await bull.totalMinted()).to.equal(3000n);
      expect(await bull.paidMinted()).to.equal(2000n);
      expect((await bull.tierRemaining()).map(Number)).to.deep.equal([0, 0, 0, 0, 0]);
      expect(await ethers.provider.getBalance(await bull.getAddress())).to.equal(0n);
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
