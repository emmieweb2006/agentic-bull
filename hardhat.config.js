require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");

/** Agentic Bull build settings. Match these in Remix: 0.8.24, optimizer 200 runs, viaIR on (EVM cancun = Remix default for 0.8.24). */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun" },
  },
  networks: {
    hardhat: { hardfork: "cancun", allowUnlimitedContractSize: false, blockGasLimit: 140_000_000 },
  },
  mocha: { timeout: 3_600_000 },
};
