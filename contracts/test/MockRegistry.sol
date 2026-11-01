// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test-only stand-in for the Agent ID registry. Its runtime code is placed at
///      0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F with hardhat_setCode.
contract MockRegistry {
    mapping(address => string) private _h;
    function setHandle(address wallet, string calldata handle) external { _h[wallet] = handle; }
    function setHandles(address[] calldata wallets, string[] calldata handles) external {
        for (uint256 i; i < wallets.length; ++i) _h[wallets[i]] = handles[i];
    }
    function handleOf(address wallet) external view returns (string memory) { return _h[wallet]; }
}
