// Writes the machine-readable files for AI agents into site/.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), site = path.join(root, "site");
const I18N = require(path.join(root, "src/i18n.js"));
const ADDR = "PASTE_ADDRESS_HERE", SITE = "PASTE_SITE_URL_HERE";
const REG = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", PAYOUT = "0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a";
const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(site, f)), { recursive: true }); fs.writeFileSync(path.join(site, f), s); console.log(f, Buffer.byteLength(s)); };
const prompts = {}; for (const l of Object.keys(I18N)) prompts[l] = I18N[l].prompt.split("{addr}").join(ADDR).split("{site}").join(SITE);

w("llms.txt", `# Agentic Bull

> 3,000 fully on-chain pixel bulls on BNB Chain (chain ID 56), mintable only by wallets that hold a .ai Agent ID. First 1,000 free (1 per wallet and 1 per Agent ID), then exactly 0.00014 BNB each (max 10 per wallet and 10 per Agent ID). No owner, no admin, immutable. Independent community project, not affiliated with Binance.

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
- Supply 3,000. Tokens #1-#5 are a creator reserve. Free phase while totalMinted() < 1000.
- Free phase: mintFree(answer), no BNB value, 1 per wallet and 1 per Agent ID.
- Paid phase (after 1,000): mint(quantity, answer) with value = 140000000000000 wei x quantity, exactly. quantity 1-10. Max 10 paid per wallet and 10 paid per Agent ID.

## The challenge
1. Call challengeOf(yourWallet). It returns (question, a, b). a and b are each 2-20 and fixed per wallet.
2. Read your Agent ID with agentIdOf(yourWallet) (same as registry.handleOf). The registry returns the name WITHOUT ".ai", for example "webs".
3. answer = a * b + the number of bytes of that string (lowercase a-z0-9, so bytes = characters). Example: a=7, b=13, handle "webs" -> 91 + 4 = 95.

## Steps for an agent
1. eth_chainId must be 0x38 (56).
2. Check mintableBy(wallet) > 0. If 0: no Agent ID, already minted the limit, or sold out.
3. Compute the answer as above.
4. If isFreePhase() is true: send mintFree(answer) with value 0.
   Otherwise: send mint(quantity, answer) with value 140000000000000 * quantity wei.
5. Simulate with eth_call first. Tell the user the cost (gas, plus the price in the paid phase) before sending.
6. After the receipt, read the Minted event (minter, agentId, firstId, qty, free). Token IDs are firstId .. firstId+qty-1.

## Function selectors
- mintFree(uint256) 0xa4146733
- mint(uint256,uint256) 0x1b2ef1ca  (payable)
- challengeOf(address) 0x6cc23c5d -> (string question, uint256 a, uint256 b)
- agentIdOf(address) 0xe9c9ec73 -> string
- mintableBy(address) 0x1d2e6765 -> uint256
- isFreePhase() 0xf2c03c87 -> bool
- totalMinted() 0xa2309ff8, freeMinted() 0xd10a1a2b, paidMinted() 0x2806b8fb
- mintedBy(address) 0x3cef28d2, freeMintedBy(address) 0xdd4d2233, mintedByAgent(string) 0xbc860502
- tierOf(uint256) 0x53f96df2 -> (uint8 tier, string name), tierRemaining() 0xa8890f40 -> uint256[5]
- tokenURI(uint256) 0xc87b56dd, svgOf(uint256) 0xe2ae5f13, contractURI() 0xe8a3d485
- MINT_START() 0xc6374d0c, PRICE() 0x8d859f3e, PAYOUT() 0x32da3d10, registry() 0x7b103999
- Event Minted(address indexed minter, string agentId, uint256 firstId, uint256 qty, bool free) topic0 0x1ab2aa08e6e1dd21ff6d93a042e2ecc7077e108575bbdf2e818891c28ff60426

## Revert reasons
"Mint not started", "EOA only", "Agent ID required", "Wrong answer", "Free mint over", "Free limit: wallet", "Free limit: Agent ID", "Free phase active", "Bad quantity", "Sold out", "Wallet limit", "Agent ID limit", "Wrong payment", "Payout failed"

## Rarity (drawn at mint from the remaining pool, exact totals)
Common 1800 (plain), Uncommon 600 (green-candle background), Rare 375 (neon outline), Epic 150 (animated pink pulse), Legendary 75 (gold horns, crown, animated gold glow).
Traits: Background, Fur, Horns, Eyes, Nose Ring, Accessory. Art is a 24x24 SVG stored and drawn on-chain. Royalty 5% (ERC-2981).

## Copy-paste prompt (English)
${prompts.en}

Other languages: ${SITE}/mint.json
`);

w("mint.json", JSON.stringify({
  name: "Agentic Bull", chain: "BNB Smart Chain", chainId: 56, contract: ADDR, standard: "ERC-721",
  agentIdRegistry: REG, payout: PAYOUT, rpc: ["https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"],
  abi: `${SITE}/abi.json`, docs: `${SITE}/llms.txt`,
  supply: { max: 3000, free: 1000, reserve: 5 },
  price: { wei: "140000000000000", bnb: "0.00014" },
  limits: { freePerWallet: 1, freePerAgentId: 1, paidPerWallet: 10, paidPerAgentId: 10, maxQuantityPerTx: 10 },
  requirements: ["Sender must be an EOA (msg.sender == tx.origin)", "Sender must hold a .ai Agent ID (registry.handleOf(sender) != \"\")", "block.timestamp >= MINT_START()"],
  challenge: {
    read: "challengeOf(address) returns (string question, uint256 a, uint256 b)",
    handle: "agentIdOf(address) returns the Agent ID without .ai, e.g. \"webs\"",
    answer: "a * b + byteLength(handle)", example: { a: 7, b: 13, handle: "webs", answer: 95 }
  },
  steps: [
    { step: 1, do: "Check chain ID is 56" },
    { step: 2, do: "Call mintableBy(wallet); must be > 0" },
    { step: 3, do: "Compute answer from challengeOf(wallet) and agentIdOf(wallet)" },
    { step: 4, do: "If isFreePhase() is true", call: "mintFree(uint256 answer)", selector: "0xa4146733", value: "0" },
    { step: 5, do: "Else", call: "mint(uint256 quantity, uint256 answer)", selector: "0x1b2ef1ca", value: "140000000000000 * quantity" },
    { step: 6, do: "Read the Minted event: token IDs are firstId .. firstId + qty - 1", topic0: "0x1ab2aa08e6e1dd21ff6d93a042e2ecc7077e108575bbdf2e818891c28ff60426" }
  ],
  views: { isFreePhase: "0xf2c03c87", totalMinted: "0xa2309ff8", freeMinted: "0xd10a1a2b", mintableBy: "0x1d2e6765", challengeOf: "0x6cc23c5d", agentIdOf: "0xe9c9ec73", MINT_START: "0xc6374d0c", tierRemaining: "0xa8890f40", tokenURI: "0xc87b56dd" },
  reverts: ["Mint not started", "EOA only", "Agent ID required", "Wrong answer", "Free mint over", "Free limit: wallet", "Free limit: Agent ID", "Free phase active", "Bad quantity", "Sold out", "Wallet limit", "Agent ID limit", "Wrong payment", "Payout failed"],
  prompt: { en: prompts.en, "zh-CN": prompts.zh, vi: prompts.vi, ja: prompts.ja, ko: prompts.ko, th: prompts.th, id: prompts.id }
}, null, 2) + "\n");

w(".well-known/agent.json", JSON.stringify({
  schema_version: "1.0", name: "Agentic Bull", description: "Mint page and instructions for Agentic Bull, 3,000 on-chain pixel bulls on BNB Chain for AI agents holding a .ai Agent ID.",
  url: `${SITE}/`, provider: { name: "Agentic Bull (independent community project)", url: `${SITE}/` },
  documentation: { llms: `${SITE}/llms.txt`, mint: `${SITE}/mint.json`, abi: `${SITE}/abi.json` },
  chain: { name: "BNB Smart Chain", chainId: 56, contract: ADDR, agentIdRegistry: REG },
  capabilities: { onchainMint: true, requiresAgentId: true, requiresEOA: true, humanApprovalRecommended: true },
  skills: [
    { id: "mint-agentic-bull", name: "Mint Agentic Bull", description: "Solve challengeOf(wallet) and call mintFree(answer) or mint(quantity, answer) with 0.00014 BNB each.", inputModes: ["text/plain"], outputModes: ["application/json"], examples: [prompts.en] },
    { id: "check-agent-id", name: "Check Agent ID", description: "Read agentIdOf(wallet), challengeOf(wallet) and mintableBy(wallet)." }
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
