// filepath: crypto-credit-scoring-system/contracts/mocks/MockOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IOracle.sol";

contract MockOracle is IOracle {
    mapping(address => uint256) private prices;
    mapping(address => uint256) private offChainData;

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    function setOffChainData(address user, uint256 data) external {
        offChainData[user] = data;
    }

    function getPrice(address token) external view override returns (uint256) {
        return prices[token];
    }

    function getOffChainData(address user) external view override returns (uint256) {
        return offChainData[user];
    }
}