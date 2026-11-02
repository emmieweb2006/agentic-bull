// Writes the machine-readable files for AI agents into site/.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), site = path.join(root, "site");
const I18N = require(path.join(root, "src/i18n.js"));
const DESC = I18N.en.heroSub;
const ADDR = "PASTE_ADDRESS_HERE", SITE = "https://agentic-bull.pages.dev";
const REG = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", PAYOUT = "0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a";
const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(site, f)), { recursive: true }); fs.writeFileSync(path.join(site, f), s); console.log(f, Buffer.byteLength(s)); };
const prompts = {}; for (const l of Object.keys(I18N)) prompts[l] = I18N[l].prompt.split("{addr}").join(ADDR).split("{site}").join(SITE);

w("llms.txt", `# Agentic Bull

> ${DESC}

BNB Chain mainnet (chain ID 56). Free bull rule: the first 900 Agent IDs get their first bull free (one per wallet and per Agent ID). Price by position: 1st free or 0.00028 BNB, 2nd 0.00028 BNB, 3rd 0.00035 BNB. Max 3 per wallet and 3 per Agent ID in total. No owner, no admin, immutable. Independent community project, not affiliated with Binance.

## Contract
- Chain: BNB Smart Chain mainnet, chain ID 56
- Agentic Bull (ERC-721): ${ADDR}
- Agent ID registry (SPACE ID, soulbound .ai names): ${REG}
- Payments go in the same transaction to: ${PAYOUT}
- RPC: https://bsc-dataseed.binance.org (fallback https://bsc-rpc.publicnode.com)
- ABI: ${SITE}/abi.json
- Machine-readable steps: ${SITE}/mint.json
- Source: verified on Sourcify (https://repo.sourcify.dev/56/${ADDR})

## Rules (enforced on-chain)
- The mint must be sent by a normal wallet (EOA): msg.sender == tx.origin. Contracts and smart-contract wallets revert with "EOA only".
- The sender must have an Agent ID: registry.handleOf(sender) must be non-empty.
- Mint opens at MINT_START() (unix seconds). Before that: "Mint not started".
- Supply 3,000. Everything opens at MINT_START; there are no phases. One function: mint(quantity, answer), quantity 1-3.
- Max 3 per wallet and 3 per Agent ID in total (free + paid): MAX_PER_WALLET() = MAX_PER_AGENT() = 3.
- Position: pos = max(mintedBy(wallet), mintedByAgent(its Agent ID)). The bulls of a mint take positions pos+1, pos+2, pos+3.
- Price by position: position 1 = free if eligible, otherwise 0.00028 BNB; position 2 = 0.00028 BNB (PRICE() = 280000000000000 wei); position 3 = 0.00035 BNB (PRICE_THIRD() = 350000000000000 wei).
- Free (eligible): position 1, neither the wallet nor its Agent ID has ever had a free bull, and freeMinted() < 905 (FREE_CAP()). Tokens #1-#5 are a creator reserve and count toward the 905, which leaves 900 free bulls for the public. Public free left = 905 - freeMinted().
- So 3 bulls cost 0.00063 BNB (630000000000000 wei) for a free minter and 0.00091 BNB (910000000000000 wei) otherwise, in one mint or spread over several.
- msg.value must be exactly costOf(wallet, quantity), or the mint reverts with "Wrong payment". The payment is forwarded to the payout wallet in the same transaction.

## The challenge
1. Call challengeOf(yourWallet). It returns (question, a, b). a and b are each 2-20 and fixed per wallet.
2. Read your Agent ID with agentIdOf(yourWallet) (same as registry.handleOf). The registry returns the name WITHOUT ".ai", for example "webs".
3. answer = a * b + the number of characters in that Agent ID without ".ai" (lowercase a-z0-9, so characters = bytes). Example: a=7, b=13, Agent ID "webs" -> 91 + 4 = 95.

## Steps for an agent (3 steps)
1. challengeOf(myWallet) -> answer = a * b + characters in the Agent ID without .ai.
2. costOf(myWallet, quantity) -> value (in wei). quantity is 1-3 (at most mintableBy(myWallet)).
3. mint(quantity, answer) with exactly that value.
Max 3 per wallet and per Agent ID. The first 900 Agent IDs get their first bull free; other bulls are 0.00028 BNB and the third is 0.00035 BNB.

Notes: use BNB Chain (eth_chainId 0x38). mintableBy(wallet) is how many you can still mint (0 = no Agent ID, limit reached, or sold out); freeAvailableTo(wallet) tells you if your first bull is free. Simulate with eth_call first and tell the user the cost (value + gas) before sending. After the receipt, read the Minted event (minter, agentId, firstId, qty, free); token IDs are firstId .. firstId+qty-1.

## Function selectors
- mint(uint256,uint256) 0x1b2ef1ca  (payable)
- costOf(address,uint256) 0x66be6071 -> uint256 wei to send
- freeAvailableTo(address) 0x453322ed -> bool
- challengeOf(address) 0x6cc23c5d -> (string question, uint256 a, uint256 b)
- agentIdOf(address) 0xe9c9ec73 -> string
- mintableBy(address) 0x1d2e6765 -> uint256
- MAX_PER_WALLET() 0x0f2cdd6c, MAX_PER_AGENT() 0x17674c1f, FREE_CAP() 0x4dbd691f
- totalMinted() 0xa2309ff8, freeMinted() 0xd10a1a2b, paidMinted() 0x2806b8fb
- mintedBy(address) 0x3cef28d2, freeMintedBy(address) 0xdd4d2233, mintedByAgent(string) 0xbc860502
- tierOf(uint256) 0x53f96df2 -> (uint8 tier, string name), tierRemaining() 0xa8890f40 -> uint256[5]
- tokenURI(uint256) 0xc87b56dd, svgOf(uint256) 0xe2ae5f13, contractURI() 0xe8a3d485
- MINT_START() 0xc6374d0c, PRICE() 0x8d859f3e, PRICE_THIRD() 0x7a1aa16c, PAYOUT() 0x32da3d10, registry() 0x7b103999
- Event Minted(address indexed minter, string agentId, uint256 firstId, uint256 qty, bool free) topic0 0x1ab2aa08e6e1dd21ff6d93a042e2ecc7077e108575bbdf2e818891c28ff60426

## Revert reasons
"Mint not started", "EOA only", "Agent ID required", "Wrong answer", "Bad quantity", "Sold out", "Wallet limit", "Agent ID limit", "Wrong payment", "Payout failed"

## Rarity (drawn at mint from the remaining pool, exact totals)
Common 1800 (plain), Uncommon 600 (green-candle background), Rare 375 (neon outline), Epic 150 (animated pink pulse), Legendary 75 (gold horns, crown, animated gold glow).
Traits: Background, Fur, Horns, Eyes, Nose Ring, Accessory. Art is a 24x24 SVG stored and drawn on-chain. Royalty 5% (ERC-2981).

## Copy-paste prompt (English)
${prompts.en}

Other languages: ${SITE}/mint.json
`);

w("mint.json", JSON.stringify({
  name: "Agentic Bull", description: DESC, descriptionI18n: { en: I18N.en.heroSub, "zh-CN": I18N.zh.heroSub, vi: I18N.vi.heroSub, ja: I18N.ja.heroSub, ko: I18N.ko.heroSub, th: I18N.th.heroSub, id: I18N.id.heroSub }, chain: "BNB Smart Chain", chainId: 56, contract: ADDR, standard: "ERC-721",
  agentIdRegistry: REG, payout: PAYOUT, rpc: ["https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"],
  abi: `${SITE}/abi.json`, docs: `${SITE}/llms.txt`,
  supply: { max: 3000, free: 900, freeCap: 905, reserve: 5, note: "Reserve #1-#5 counts toward FREE_CAP 905, leaving 900 free for the public" },
  price: { wei: "280000000000000", bnb: "0.00028", third: { wei: "350000000000000", bnb: "0.00035" } },
  pricing: {
    position: "pos = max(mintedBy(wallet), mintedByAgent(agentId)); the bulls of a mint take positions pos+1 .. pos+quantity",
    byPosition: { "1": "free if eligible, otherwise 0.00028 BNB (280000000000000 wei)", "2": "0.00028 BNB (280000000000000 wei)", "3": "0.00035 BNB (350000000000000 wei)" },
    totals: { threeWithFree: "630000000000000", threeWithoutFree: "910000000000000" },
    value: "msg.value must equal costOf(wallet, quantity) exactly"
  },
  limits: { perWallet: 3, perAgentId: 3, maxQuantityPerTx: 3, note: "Totals, free + paid" },
  free: { rule: "Position 1 is free if neither the wallet nor its Agent ID ever had a free bull and freeMinted() < 905. Reserve #1-#5 counts toward the 905, so 900 are free for the public.", check: "freeAvailableTo(address) returns bool", left: "905 - freeMinted() (out of 900)" },
  requirements: ["Sender must be an EOA (msg.sender == tx.origin)", "Sender must hold a .ai Agent ID (registry.handleOf(sender) != \"\")", "block.timestamp >= MINT_START()"],
  challenge: {
    read: "challengeOf(address) returns (string question, uint256 a, uint256 b)",
    handle: "agentIdOf(address) returns the Agent ID without .ai, e.g. \"webs\"",
    answer: "a * b + byteLength(handle)", example: { a: 7, b: 13, handle: "webs", answer: 95 }
  },
  steps: [
    { step: 1, call: "challengeOf(address myWallet)", selector: "0x6cc23c5d", do: "answer = a * b + characters in the Agent ID without .ai (agentIdOf(myWallet))" },
    { step: 2, call: "costOf(address myWallet, uint256 quantity)", selector: "0x66be6071", do: "returns the exact value in wei; quantity 1-3, at most mintableBy(myWallet)" },
    { step: 3, call: "mint(uint256 quantity, uint256 answer)", selector: "0x1b2ef1ca", value: "exactly costOf(myWallet, quantity)", do: "simulate with eth_call first; token IDs are firstId .. firstId + qty - 1 from the Minted event", topic0: "0x1ab2aa08e6e1dd21ff6d93a042e2ecc7077e108575bbdf2e818891c28ff60426" }
  ],
  notes: ["Max 3 per wallet and 3 per Agent ID. The first 900 Agent IDs get their first bull free; other bulls are 0.00028 BNB and the third is 0.00035 BNB.", "Chain ID must be 56.", "mintableBy(wallet) = how many this wallet can still mint."],
  views: { costOf: "0x66be6071", freeAvailableTo: "0x453322ed", mintedBy: "0x3cef28d2", mintedByAgent: "0xbc860502", totalMinted: "0xa2309ff8", freeMinted: "0xd10a1a2b", mintableBy: "0x1d2e6765", challengeOf: "0x6cc23c5d", agentIdOf: "0xe9c9ec73", MINT_START: "0xc6374d0c", tierRemaining: "0xa8890f40", tokenURI: "0xc87b56dd" },
  reverts: ["Mint not started", "EOA only", "Agent ID required", "Wrong answer", "Bad quantity", "Sold out", "Wallet limit", "Agent ID limit", "Wrong payment", "Payout failed"],
  prompt: { en: prompts.en, "zh-CN": prompts.zh, vi: prompts.vi, ja: prompts.ja, ko: prompts.ko, th: prompts.th, id: prompts.id }
}, null, 2) + "\n");

w(".well-known/agent.json", JSON.stringify({
  schema_version: "1.0", name: "Agentic Bull", description: DESC,
  url: `${SITE}/`, provider: { name: "Agentic Bull (independent community project)", url: `${SITE}/` },
  documentation: { llms: `${SITE}/llms.txt`, mint: `${SITE}/mint.json`, abi: `${SITE}/abi.json` },
  chain: { name: "BNB Smart Chain", chainId: 56, contract: ADDR, agentIdRegistry: REG },
  capabilities: { onchainMint: true, requiresAgentId: true, requiresEOA: true, humanApprovalRecommended: true },
  skills: [
    { id: "mint-agentic-bull", name: "Mint Agentic Bull", description: "1) challengeOf(wallet) -> answer. 2) costOf(wallet, quantity) -> value. 3) mint(quantity, answer) with exactly that value. Max 3 per wallet and per Agent ID; the first 900 Agent IDs get their first bull free, other bulls are 0.00028 BNB and the third is 0.00035 BNB.", inputModes: ["text/plain"], outputModes: ["application/json"], examples: [prompts.en] },
    { id: "check-agent-id", name: "Check Agent ID", description: "Read agentIdOf(wallet), challengeOf(wallet), freeAvailableTo(wallet) and mintableBy(wallet)." }
  ],
  languages: ["en", "zh-CN", "vi", "ja", "ko", "th", "id"]
}, null, 2) + "\n");

w("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n# AI agents: see ${SITE}/llms.txt and ${SITE}/mint.json\n`);

const langs = ["en", "zh", "vi", "ja", "ko", "th", "id"], hl = { en: "en", zh: "zh-CN", vi: "vi", ja: "ja", ko: "ko", th: "th", id: "id" };
const alt = langs.map(l => `    <xhtml:link rel="alternate" hreflang="${hl[l]}" href="${SITE}/?lang=${l}"/>`).join("\n");
w("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE}/</loc>
${alt}
  </url>
  <url><loc>${SITE}/llms.txt</loc></url>
  <url><loc>${SITE}/mint.json</loc></url>
  <url><loc>${SITE}/.well-known/agent.json</loc></url>
</urlset>
`);

w("_headers", `/*.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8

/*.txt
  Access-Control-Allow-Origin: *
  Content-Type: text/plain; charset=utf-8

/.well-known/*
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`);
