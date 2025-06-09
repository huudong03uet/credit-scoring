// filepath: crypto-credit-scoring-system/contracts/interfaces/IOracle.sol
pragma solidity ^0.8.19;

interface IOracle {
    function getPrice(address token) external view returns (uint256);
    function getOffChainData(address user) external view returns (uint256);
}