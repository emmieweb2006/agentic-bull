// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test-only stand-in for Multicall3.aggregate3 (placed at the canonical address in the local e2e run).
contract Multicall3Lite {
    struct Call3 { address target; bool allowFailure; bytes callData; }
    struct Result { bool success; bytes returnData; }
    function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory r) {
        r = new Result[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (r[i].success, r[i].returnData) = calls[i].target.call(calls[i].callData);
            require(calls[i].allowFailure || r[i].success, "call failed");
        }
    }
}
