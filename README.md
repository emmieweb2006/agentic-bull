# Agentic Bull

There are 3,000 fully on-chain 24×24 pixel bulls on BNB Chain (chain 56), and only wallets that hold a SPACE ID **.ai Agent ID** can mint them.
- **One mint, no phases:** everything opens at `MINT_START`. `mint(quantity, answer)`, quantity 1–10, max 10 per wallet and 10 per Agent ID in total.
- **First bull free:** if neither the wallet nor its Agent ID has had a free bull and fewer than 1,000 free have gone out, the first bull of that mint is free. Every other bull costs 0.00014 BNB. Tokens #1–#5 are the creator reserve and count toward the 1,000 free.
- **Agent flow:** `challengeOf(wallet)` → answer = a·b + characters in the Agent ID without .ai; `costOf(wallet, quantity)` → value; `mint(quantity, answer)` with exactly that value.
- **No admin:** the contract has no owner and no admin.

| Path | What |
|---|---|
| `contracts/AgenticBull.sol` | The contract (Solidity 0.8.24, OpenZeppelin 5.0.2, viaIR, optimizer 200) |
| `flat/AgenticBull.flat.sol` | One-file version for Remix (all 23 tests pass on it too) |
| `contracts/test/*` | Test-only mocks (registry, contract minter, Multicall3) |
| `test/AgenticBull.test.js` | Hardhat tests |
| `site/` | Upload this folder to Cloudflare Pages. It has `index.html` (7 languages), `llms.txt`, `mint.json`, `.well-known/agent.json`, `abi.json`, `robots.txt`, `sitemap.xml`, `_headers` and `og.png` |
| `src/` | The site template and translations. `npm run build` regenerates `site/` |
| `scripts/` | Build, art generator, selectors, gas report, registry check, and `fill-placeholders.js` |
| `docs/DEPLOY_GUIDE.md` | A phone-only guide covering Remix deploy, Sourcify, Cloudflare, the launch checklist and the selectors |
| `renders/` | Mobile screenshots and the 12-sample grid |

```
npm install      # hardhat 2, ethers 6, OZ 5.0.2
npx hardhat test # 23 passing
npm run build    # rebuild site/ from src/
node scripts/fill-placeholders.js --address 0x...   # site URL is already filled
```

The site URL is already set to https://agentic-bull.pages.dev (in the contract, the site and the agent files). `site/` still contains three placeholders: `PASTE_ADDRESS_HERE`, `ELEMENT_LINK_HERE` and `OKX_LINK_HERE`.

This is an independent community project and isn't affiliated with Binance or SPACE ID.
