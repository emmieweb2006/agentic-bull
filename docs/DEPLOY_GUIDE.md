# Agentic Bull — deploy guide (phone only)

Everything below works from a phone: the **MetaMask mobile app** (its built-in browser) for Remix and deploying, plus the phone's normal browser for Cloudflare. Nobody will ever need your private key or seed phrase, me included. Never paste one anywhere, and never give one to anyone.

**Times in this guide:** mint opens **Thu 5 Nov 2026, 14:00 WAT** (13:00 UTC, 21:00 Beijing). The unix time is **`1793883600`**.

---

## 0. What you need
- MetaMask mobile, on **BNB Smart Chain** (chain 56), with about **0.003 BNB** for gas. The deploy uses about 5.2M gas. At BSC's usual 0.05–0.1 gwei that works out to roughly 0.0003–0.0006 BNB, but trust MetaMask's estimate over mine.
- Any wallet can deploy. It gets **no special powers**, because the contract has no owner or admin. Tokens #1–#5 always go to the hard-coded PAYOUT `0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a`, whoever deploys. Every BNB paid for a mint is forwarded to that same address in the same transaction.
- The files from `agentic-bull.zip`:
  - `flat/AgenticBull.flat.sol`: the contract plus OpenZeppelin 5.0.2, in one file for Remix.
  - `site/`: the website and the agent files.
- Your site URL. If the Cloudflare project is named `agentic-bull` it will be **`https://agentic-bull.pages.dev`**. If that name is taken, Cloudflare adds a suffix, so do **step 1 first** to learn the exact URL.

---

## 1. Claim the Cloudflare Pages URL first (placeholder site)
The site works before the contract exists: it shows "Contract address coming soon" and runs the countdown.
1. Open **dash.cloudflare.com** in the phone browser and log in. Tap the desktop-site toggle if the menu is cramped.
2. Go to **Workers & Pages → Create application → Pages → Use direct upload**. Newer dashboards label it **"Drag and drop your files"**.
3. For the project name, enter **`agentic-bull`**, then tap **Create project**.
4. Upload a **zip whose root contains `index.html`**. Don't upload a zip that has a `site/` folder inside it. On a phone, a zip upload is easiest, and a zip also keeps the `.well-known` folder.
   - To make one, open the Files app, open the `site` folder, select everything inside it including `.well-known`, then Compress.
   - Or ask Grok Bot to "make the site zip" for you.
5. Tap **Deploy site** and write down the URL Cloudflare shows (for example `https://agentic-bull.pages.dev`). This is your **SITE_URL**: no trailing slash.

## 2. Put the site URL into the contract (before compiling)
`contractURI()` is fixed forever once deployed, so this must happen first.
1. Open `flat/AgenticBull.flat.sol` and search for **`PASTE_SITE_URL_HERE`**. There is exactly one in the code (inside `contractURI`, `"external_link"`).
2. Replace it with your SITE_URL, for example `https://agentic-bull.pages.dev`.
3. Change nothing else. The edit is just a string, so the tests still apply. Every one of the 21 tests also passed against this flat file.

## 3. Compile in Remix (MetaMask mobile browser)
1. In MetaMask, tap **Browser** (the bottom bar or the ☰ menu) and open **remix.ethereum.org**. If the layout is crowded, tap ⋮ → **Desktop site**.
2. In **File explorer**, tap **+** (new file) and name it `AgenticBull.sol`. Paste the entire contents of your edited `flat/AgenticBull.flat.sol`.
   - Tip: open the file in a phone text-editor app, then Select All → Copy.
3. Open **Solidity compiler** (the "S" icon):
   - **Compiler:** `0.8.24+commit.e11b9ed9`.
   - **Advanced configurations:**
     - **Optimization:** ON, runs **200**.
     - **EVM version:** **cancun**.
     - **viaIR:** ON. If there's no checkbox, choose "Use configuration file" and set `"viaIR": true`. The settings block should be: `{"optimizer":{"enabled":true,"runs":200},"viaIR":true,"evmVersion":"cancun"}`.
4. Tap **Compile AgenticBull.sol** and wait for the green tick. Pick the **AgenticBull** contract in the dropdown, not ERC721.
   - Expect a runtime of about 21.2 KB, below the 24,576-byte limit.
   - If you get "contract code size exceeds" or a stack-too-deep error, viaIR isn't on.

## 4. Deploy
1. Open **Deploy & run transactions**.
2. Set **Environment** to **Injected Provider – MetaMask**, and check it shows **Custom (56) network** or BNB Smart Chain.
3. Set **Contract** to **AgenticBull**.
4. Turn on the **Verify Contract on Explorers** checkbox if you see one. It submits to Sourcify automatically.
5. Next to **Deploy**, type the constructor argument `mintStart`: **`1793883600`**.
   - To test with mint open now, use a time in the past. That cannot be changed later; the contract is immutable.
6. Tap **Deploy**, check the gas in MetaMask, and **Confirm**. This is the only transaction you send yourself.
7. Copy the deployed address from **Deployed Contracts**, or from the MetaMask activity → BscScan link. This is your **CONTRACT_ADDRESS**.

## 5. Quick read checks (free, no transaction)
In Remix, under Deployed Contracts, tap these blue buttons:

| Call | Expected |
|---|---|
| `totalMinted` | `5` |
| `ownerOf(1)` | `0x5ec628f3…dd1a` |
| `MINT_START` | `1793883600` |
| `PRICE` | `140000000000000` |
| `registry` | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| `contractURI` | Starts `data:application/json;base64,` (open it in the browser to see your site URL) |
| `tokenURI(1)` | data URI; your bull #1 |
| `challengeOf(0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a)` | A question with a, b in 2–20 |

## 6. Verify the source (Sourcify)
- **Easiest:** if you ticked "Verify Contract on Explorers", open the **Contract Verification** plugin → **Receipts**. Sourcify should show ✅ (full or partial match).
- **Otherwise:**
  1. Go to Plugins (the plug icon) → search **Contract Verification** → Activate.
  2. **Verify** tab: chain **BNB Smart Chain Mainnet (56)**, paste CONTRACT_ADDRESS, pick AgenticBull, and tick **Sourcify**.
  3. Untick Etherscan, which needs an API key, unless you have one. Tap **Verify**.
- **Backup (metadata route):**
  1. Open **sourcify.dev** → **Verify contract**.
  2. Choose chain 56, enter the address, and upload **`AgenticBull.sol`** plus the **metadata.json**.
  3. To find the metadata: in Remix, Solidity compiler → **Compilation details → Metadata → copy**, and save it as `metadata.json`. Or use File explorer → `artifacts/AgenticBull_metadata.json`.
  4. The constructor argument is read from chain automatically.
- **Check:** `https://repo.sourcify.dev/56/CONTRACT_ADDRESS` lists the files. BscScan usually also shows "Similar match / Sourcify" on the contract page.

## 7. Fill the site placeholders and redeploy the site
The files contain four placeholders:

| Placeholder | Replace with |
|---|---|
| `PASTE_ADDRESS_HERE` | CONTRACT_ADDRESS |
| `PASTE_SITE_URL_HERE` | SITE_URL (no trailing slash) |
| `ELEMENT_LINK_HERE` | The Element collection link, once it exists. Until then leave it, and the button shows "Coming soon". |
| `OKX_LINK_HERE` | The OKX NFT collection link, same as above |

**Option A (easiest):** send Grok Bot the contract address and the site URL. It runs
`node scripts/fill-placeholders.js --address 0x… --site https://… [--element https://…] [--okx https://…]`
and hands you `dist/site.zip`, ready to upload. That command only edits a copy of `site/`.

**Option B (by hand on the phone):** in a text-editor app, find & replace in each of these files:
- `site/index.html` (the `CONFIG` block near the end, plus the meta tags)
- `site/llms.txt`
- `site/mint.json`
- `site/.well-known/agent.json`
- `site/robots.txt`
- `site/sitemap.xml`

Then zip the **contents** of `site/` again.

**Upload the new version:** in Cloudflare, Workers & Pages → `agentic-bull` → **Create deployment** → Production → upload the zip → **Save and deploy**.

**Check these pages open:**
- `SITE_URL/`, which should show the live counter `5 / 3,000` (it refreshes every 15 s)
- `SITE_URL/llms.txt`
- `SITE_URL/mint.json`
- `SITE_URL/.well-known/agent.json`
- `SITE_URL/abi.json`

`_headers` gives `.json` and `.txt` files `Access-Control-Allow-Origin: *`, so agents can fetch them from anywhere.

## 8. Test mint (after 5 Nov 14:00 WAT)
- **Human test:**
  1. Open SITE_URL in MetaMask's (or Binance Wallet's) browser with a wallet that holds an Agent ID.
  2. Tap **Connect wallet**. The site switches you to chain 56.
  3. The site reads your challenge and fills in the answer. Tap **Mint free**.
  4. Watch for **Minted! Token IDs: #6**, and the bull appearing under **My Bulls**.
- **Agent test:** give your Binance Agentic Wallet agent the prompt from the **Copy prompt** box on the site, or from `mint.json`.
- **Wrong-path checks (all free, no gas spent):** the site runs a simulation before sending and shows the translated reason instead:
  - A wallet with no Agent ID → "No Agent ID".
  - A second free mint from the same wallet → "already used its free mint".
- **After 1,000 free mints:** the button switches to **Mint for 0.00014 BNB**, with quantity 1–10.

## 9. Launch checklist
- [ ] Cloudflare project created; SITE_URL noted (step 1)
- [ ] `PASTE_SITE_URL_HERE` replaced in the `.sol` **before** compiling (step 2)
- [ ] Remix: 0.8.24 · optimizer 200 · viaIR ON · cancun (step 3)
- [ ] Constructor `mintStart` = `1793883600` (5 Nov 2026 14:00 WAT) (step 4)
- [ ] Deploy confirmed on **chain 56**, not testnet; address copied
- [ ] `totalMinted = 5`, `ownerOf(1)` = PAYOUT, `contractURI` shows the right URL (step 5)
- [ ] Sourcify verified ✅ (step 6)
- [ ] Site placeholders filled; new deployment uploaded; counter shows `5 / 3,000` (step 7)
- [ ] `llms.txt`, `mint.json`, `.well-known/agent.json` and `abi.json` open with the real address
- [ ] Share preview works: paste SITE_URL in an X draft and check the card shows `og.png`
- [ ] Announce post ready, with the contract address, SITE_URL and mint time in WAT/UTC/Beijing
- [ ] After mint opens: one test mint from an Agent ID wallet works (step 8)
- [ ] Later: list on Element / OKX; put the links in with `--element` / `--okx` and redeploy the site

## Known limits (read once)
- **EOA only.** The contract requires `msg.sender == tx.origin`.
  - Binance Agentic Wallets are normal wallets (EOAs), so they pass. PAYOUT was checked and has no code.
  - Smart-contract wallets fail with "EOA only": ERC-4337 accounts, Safe, and wallets that use an EIP-7702 delegation. Since 7702, `tx.origin == msg.sender` still holds for a 7702-delegated EOA sending directly, but a sponsored or bundled call would not pass.
- **The challenge is a speed bump, not security.** Anyone can compute `a*b + len(handle)` from public data, and the site does it for humans. The real gate is the Agent ID check.
- **Randomness.** Traits use `prevrandao`/`blockhash`, as specified, so a validator could bias them in theory. That's fine for a free or cheap art drop.
- **No admin, ever.** Nothing can be paused, changed or withdrawn. The contract never holds BNB, because every payment goes straight to PAYOUT. Royalty is 5% to PAYOUT via ERC-2981, where marketplaces honour it.

## Function selectors

| Selector | Function | Mutability | Returns |
|---|---|---|---|
| `0xe9c9ec73` | `agentIdOf(address)` | view | string |
| `0x095ea7b3` | `approve(address,uint256)` | nonpayable | - |
| `0x70a08231` | `balanceOf(address)` | view | uint256 |
| `0x6cc23c5d` | `challengeOf(address)` | view | string question, uint256 a, uint256 b |
| `0xe8a3d485` | `contractURI()` | pure | string |
| `0x9858cf19` | `FREE_SUPPLY()` | view | uint256 |
| `0xd10a1a2b` | `freeMinted()` | view | uint256 |
| `0xdd4d2233` | `freeMintedBy(address)` | view | uint256 |
| `0x081812fc` | `getApproved(uint256)` | view | address |
| `0xe985e9c5` | `isApprovedForAll(address,address)` | view | bool |
| `0xf2c03c87` | `isFreePhase()` | view | bool |
| `0xc0e1e21c` | `MAX_PAID_PER_AGENT()` | view | uint256 |
| `0x3e6eaad8` | `MAX_PAID_PER_WALLET()` | view | uint256 |
| `0x32cb6b0c` | `MAX_SUPPLY()` | view | uint256 |
| `0xc6374d0c` | `MINT_START()` | view | uint256 |
| `0x1b2ef1ca` | `mint(uint256,uint256)` | payable | - |
| `0x1d2e6765` | `mintableBy(address)` | view | uint256 |
| `0x3cef28d2` | `mintedBy(address)` | view | uint256 |
| `0xbc860502` | `mintedByAgent(string)` | view | uint256 |
| `0xa4146733` | `mintFree(uint256)` | nonpayable | - |
| `0x06fdde03` | `name()` | view | string |
| `0x6352211e` | `ownerOf(uint256)` | view | address |
| `0x2806b8fb` | `paidMinted()` | view | uint256 |
| `0x32da3d10` | `PAYOUT()` | view | address |
| `0x8d859f3e` | `PRICE()` | view | uint256 |
| `0x7b103999` | `registry()` | view | address |
| `0x9d2cc436` | `RESERVE()` | view | uint256 |
| `0x2a55205a` | `royaltyInfo(uint256,uint256)` | view | address, uint256 |
| `0xb88d4fde` | `safeTransferFrom(address,address,uint256,bytes)` | nonpayable | - |
| `0x42842e0e` | `safeTransferFrom(address,address,uint256)` | nonpayable | - |
| `0xa22cb465` | `setApprovalForAll(address,bool)` | nonpayable | - |
| `0x01ffc9a7` | `supportsInterface(bytes4)` | view | bool |
| `0xe2ae5f13` | `svgOf(uint256)` | view | string |
| `0x95d89b41` | `symbol()` | view | string |
| `0x53f96df2` | `tierOf(uint256)` | view | uint8 tier, string name |
| `0xa8890f40` | `tierRemaining()` | view | uint256[5] r |
| `0xc87b56dd` | `tokenURI(uint256)` | view | string |
| `0xa2309ff8` | `totalMinted()` | view | uint256 |
| `0x23b872dd` | `transferFrom(address,address,uint256)` | nonpayable | - |

| Topic0 | Event |
|---|---|
| `0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925` | `Approval(address,address,uint256)` |
| `0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31` | `ApprovalForAll(address,address,bool)` |
| `0x1ab2aa08e6e1dd21ff6d93a042e2ecc7077e108575bbdf2e818891c28ff60426` | `Minted(address,string,uint256,uint256,bool)` |
| `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` | `Transfer(address,address,uint256)` |

