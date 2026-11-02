# Agentic Bull

> 3,000 Agentic Bulls on BNB Chain, minted only by .ai Agent IDs. The first 900 Agent IDs get their first bull free. Other bulls are 0.00028 BNB and the third is 0.00035 BNB, up to 3 per Agent ID. Revealed instantly.

There are 3,000 fully on-chain 24×24 pixel bulls on BNB Chain (chain 56), and only wallets that hold a SPACE ID **.ai Agent ID** can mint them.
- **One mint, no phases:** everything opens at `MINT_START`. `mint(quantity, answer)`, quantity 1–3, max 3 per wallet and 3 per Agent ID in total (free + paid).
- **Price by position:** position = max(bulls minted by the wallet, bulls minted by its Agent ID) + 1, 2, 3. Position 1 is free if neither the wallet nor its Agent ID has had a free bull and `freeMinted() < 905` (otherwise 0.00028 BNB); position 2 is 0.00028 BNB; position 3 is 0.00035 BNB. Tokens #1–#5 are the creator reserve and count toward `FREE_CAP` = 905, which leaves 900 free bulls for the public. `msg.value` must equal `costOf` exactly and is forwarded to PAYOUT in the same transaction.
- **Agent flow:** `challengeOf(wallet)` → answer = a·b + characters in the Agent ID without .ai; `costOf(wallet, quantity)` → value; `mint(quantity, answer)` with exactly that value.
- **No admin:** the contract has no owner and no admin.

| Path | What |
|---|---|
| `contracts/AgenticBull.sol` | The contract (Solidity 0.8.24, OpenZeppelin 5.0.2, viaIR, optimizer 200) |
| `flat/AgenticBull.flat.sol` | One-file version for Remix (all 28 tests pass on it too) |
| `contracts/test/*` | Test-only mocks (registry, contract minter, Multicall3) |
| `test/AgenticBull.test.js` | Hardhat tests |
| `site/` | Upload this folder to Cloudflare Pages. It has `index.html` (7 languages), `llms.txt`, `mint.json`, `.well-known/agent.json`, `abi.json`, `robots.txt`, `sitemap.xml`, `_headers` and `og.png` |
| `src/` | The site template and translations. `npm run build` regenerates `site/` |
| `scripts/` | Build, art generator, selectors, gas report, registry check, and `fill-placeholders.js` |
| `docs/DEPLOY_GUIDE.md` | A phone-only guide covering Remix deploy, Sourcify, Cloudflare, the launch checklist and the selectors |
| `renders/` | Mobile screenshots and the 12-sample grid |

```
npm install      # hardhat 2, ethers 6, OZ 5.0.2
npx hardhat test # 28 passing
npm run build    # rebuild site/ from src/
node scripts/fill-placeholders.js --address 0x...   # site URL is already filled
```

The site URL is already set to https://agentic-bull.pages.dev (in the contract, the site and the agent files). The contract address is filled in across `site/` and the agent files. `site/` still contains two placeholders: `ELEMENT_LINK_HERE` and `OKX_LINK_HERE`.

## Deployed (BNB Chain mainnet, chain 56)

| | |
|---|---|
| Contract | [`0xcd4472Af68801DE87E970A333C71da5d12E825A3`](https://bscscan.com/address/0xcd4472Af68801DE87E970A333C71da5d12E825A3) |
| Deploy tx | [`0x30cc04a50ff0b162b43634331cf6ffa4bc85dd5147dd206f05837c4653ebd3b7`](https://bscscan.com/tx/0x30cc04a50ff0b162b43634331cf6ffa4bc85dd5147dd206f05837c4653ebd3b7) (block 131187370, 2 Nov 2026) |
| Deployed via | Arachnid CREATE2 factory `0x4e59b44847b379578588920cA78FbF26c0B4956C`, salt `0x00…00`, from `0x5ec628f3339B1fEC2e8572a5b307932cC3bCdd1a` |
| Constructor | `mintStart = 1793707200` (Tue 3 Nov 2026, 20:00 Beijing time) |
| Source | `flat/AgenticBull.flat.sol`, solc 0.8.24, optimizer 200, viaIR, cancun |
| Sourcify | [exact match](https://repo.sourcify.dev/56/0xcd4472Af68801DE87E970A333C71da5d12E825A3) |
| Verify inputs | `deploy/AgenticBull.standard-input.json` (BscScan Standard JSON), `deploy/AgenticBull.metadata.json` |
| Site | https://agentic-bull.pages.dev |

This is an independent community project and isn't affiliated with Binance or SPACE ID.
