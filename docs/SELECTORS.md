# AgenticBull function selectors

Computed with ethers from the compiled ABI (keccak256 of the signature, first 4 bytes).

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
