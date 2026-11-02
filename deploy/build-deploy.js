// Builds the flat AgenticBull with solc 0.8.24 (standard JSON), the CREATE2 calldata, and the predicted address.
const fs = require("fs"), { execFileSync } = require("child_process");
const { ethers } = require("ethers");
const SOLC = process.env.SOLC;
const FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
const SALT = "0x" + "00".repeat(32);
const MINT_START = 1793707200n;
const SRC = "flat/AgenticBull.flat.sol";
const input = {
  language: "Solidity",
  sources: { [SRC]: { content: fs.readFileSync(SRC, "utf8") } },
  settings: {
    optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun",
    metadata: { bytecodeHash: "ipfs" },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.methodIdentifiers", "metadata"] } },
  },
};
fs.writeFileSync("deploy/AgenticBull.standard-input.json", JSON.stringify(input, null, 1));
const out = JSON.parse(execFileSync(SOLC, ["--standard-json"], { input: JSON.stringify(input), maxBuffer: 1 << 28 }).toString());
const errs = (out.errors || []).filter((e) => e.severity === "error");
if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
const c = out.contracts[SRC].AgenticBull;
fs.writeFileSync("deploy/AgenticBull.metadata.json", c.metadata);
fs.writeFileSync("deploy/AgenticBull.abi.json", JSON.stringify(c.abi, null, 1));
const creation = "0x" + c.evm.bytecode.object, runtime = "0x" + c.evm.deployedBytecode.object;
const args = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [MINT_START]);
const initcode = creation + args.slice(2);
const calldata = SALT + initcode.slice(2);
fs.writeFileSync("deploy/create2-calldata.hex", calldata);
fs.writeFileSync("deploy/constructor-args.hex", args);
const initHash = ethers.keccak256(initcode);
const predicted = ethers.getCreate2Address(FACTORY, SALT, initHash);
const info = {
  deployer: FACTORY, salt: SALT, mintStart: MINT_START.toString(), constructorArgs: args,
  sourceFile: SRC, contract: "AgenticBull", compiler: "v0.8.24+commit.e11b9ed9",
  settings: "optimizer on, runs 200, viaIR true, evmVersion cancun, bytecodeHash ipfs",
  creationBytes: (creation.length - 2) / 2, runtimeBytes: (runtime.length - 2) / 2,
  initcodeBytes: (initcode.length - 2) / 2, calldataBytes: (calldata.length - 2) / 2,
  initcodeHash: initHash, runtimeKeccak: ethers.keccak256(runtime), predictedAddress: predicted,
};
fs.writeFileSync("deploy/create2-info.json", JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
