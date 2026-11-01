// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBull {
    function mint(uint256 quantity, uint256 answer) external payable;
}

/// @dev Test-only: a contract trying to mint. Must revert with "EOA only".
contract ContractMinter {
    function tryMint(IBull bull, uint256 qty, uint256 answer) external payable { bull.mint{value: msg.value}(qty, answer); }
}
