// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditScore is Ownable {
    mapping(address => uint256) public scores;
    event ScoreUpdated(address indexed user, uint256 score);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function updateScore(address user, uint256 score) external onlyOwner {
        scores[user] = score;
        emit ScoreUpdated(user, score);
    }

    function getScore(address user) external view returns (uint256) {
        return scores[user];
    }
}