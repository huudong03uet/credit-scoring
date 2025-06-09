// filepath: crypto-credit-scoring-system/contracts/analyzers/OnChainAnalyzer.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../core/CreditDataTypes.sol";
import "../interfaces/IOracle.sol";
import "../core/UserRegistry.sol";

contract OnChainAnalyzer is AccessControl, CreditDataTypes {
    bytes32 public constant ANALYZER_ROLE = keccak256("ANALYZER_ROLE");
    
    UserRegistry public userRegistry;
    mapping(address => OnChainMetrics) public onChainData;
    mapping(address => uint256) public lastAnalysisTime;
    
    // Trọng số cho từng metric
    uint256 public constant TRANSACTION_WEIGHT = 15;
    uint256 public constant VOLUME_WEIGHT = 20;
    uint256 public constant LIQUIDITY_WEIGHT = 15;
    uint256 public constant STAKING_WEIGHT = 10;
    uint256 public constant GOVERNANCE_WEIGHT = 10;
    uint256 public constant CONTRACT_WEIGHT = 15;
    uint256 public constant AGE_WEIGHT = 10;
    uint256 public constant ACTIVITY_WEIGHT = 5;
    
    event OnChainDataUpdated(address indexed user, uint256 score);
    
    constructor(address _userRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANALYZER_ROLE, msg.sender);
        userRegistry = UserRegistry(_userRegistry);
    }
    
    function updateOnChainMetrics(
        address user,
        OnChainMetrics calldata metrics
    ) external onlyRole(ANALYZER_ROLE) {
        require(userRegistry.registeredUsers(user), "User not registered");
        
        onChainData[user] = metrics;
        lastAnalysisTime[user] = block.timestamp;
        
        uint256 score = calculateOnChainScore(user);
        emit OnChainDataUpdated(user, score);
    }
    
    function calculateOnChainScore(address user) public view returns (uint256) {
        OnChainMetrics memory metrics = onChainData[user];
        
        // Normalize metrics to 0-100 scale
        uint256 txScore = normalizeTransactionScore(metrics.totalTransactions);
        uint256 volumeScore = normalizeVolumeScore(metrics.totalVolume);
        uint256 liquidityScore = normalizeLiquidityScore(metrics.liquidityProvided);
        uint256 stakingScore = normalizeStakingScore(metrics.stakingAmount);
        uint256 governanceScore = normalizeGovernanceScore(metrics.governanceParticipation);
        uint256 contractScore = normalizeContractScore(metrics.contractInteractions, metrics.uniqueContractsUsed);
        uint256 ageScore = normalizeAgeScore(metrics.accountAge);
        uint256 activityScore = normalizeActivityScore(metrics.lastTransactionTime);
        
        // Weighted average
        uint256 part1 = txScore *
            TRANSACTION_WEIGHT +
            volumeScore *
            VOLUME_WEIGHT +
            liquidityScore *
            LIQUIDITY_WEIGHT +
            stakingScore *
            STAKING_WEIGHT;

        uint256 part2 = governanceScore *
            GOVERNANCE_WEIGHT +
            contractScore *
            CONTRACT_WEIGHT +
            ageScore *
            AGE_WEIGHT +
            activityScore *
            ACTIVITY_WEIGHT;

        uint256 totalScore = (part1 + part2) / 100;
        
        return totalScore;
    }
    
    function normalizeTransactionScore(uint256 totalTx) internal pure returns (uint256) {
        if (totalTx >= 10000) return 100;
        if (totalTx >= 1000) return 80;
        if (totalTx >= 100) return 60;
        if (totalTx >= 10) return 40;
        if (totalTx >= 1) return 20;
        return 0;
    }
    
    function normalizeVolumeScore(uint256 volume) internal pure returns (uint256) {
        // Volume in wei, convert to meaningful ranges
        if (volume >= 1000 ether) return 100;
        if (volume >= 100 ether) return 80;
        if (volume >= 10 ether) return 60;
        if (volume >= 1 ether) return 40;
        if (volume >= 0.1 ether) return 20;
        return 0;
    }
    
    function normalizeLiquidityScore(uint256 liquidity) internal pure returns (uint256) {
        if (liquidity >= 100 ether) return 100;
        if (liquidity >= 10 ether) return 80;
        if (liquidity >= 1 ether) return 60;
        if (liquidity >= 0.1 ether) return 40;
        if (liquidity > 0) return 20;
        return 0;
    }
    
    function normalizeStakingScore(uint256 staking) internal pure returns (uint256) {
        if (staking >= 32 ether) return 100; // ETH validator
        if (staking >= 10 ether) return 80;
        if (staking >= 1 ether) return 60;
        if (staking >= 0.1 ether) return 40;
        if (staking > 0) return 20;
        return 0;
    }
    
    function normalizeGovernanceScore(uint256 participation) internal pure returns (uint256) {
        if (participation >= 50) return 100;
        if (participation >= 20) return 80;
        if (participation >= 10) return 60;
        if (participation >= 5) return 40;
        if (participation >= 1) return 20;
        return 0;
    }
    
    function normalizeContractScore(uint256 interactions, uint256 uniqueContracts) internal pure returns (uint256) {
        uint256 interactionScore = interactions >= 1000 ? 50 : (interactions * 50) / 1000;
        uint256 diversityScore = uniqueContracts >= 50 ? 50 : uniqueContracts;
        return interactionScore + diversityScore;
    }
    
    function normalizeAgeScore(uint256 ageDays) internal pure returns (uint256) {
        if (ageDays >= 1825) return 100; // 5 years
        if (ageDays >= 1095) return 80;  // 3 years
        if (ageDays >= 365) return 60;   // 1 year
        if (ageDays >= 180) return 40;   // 6 months
        if (ageDays >= 30) return 20;    // 1 month
        return 0;
    }
    
    function normalizeActivityScore(uint256 lastTxTime) internal view returns (uint256) {
        uint256 daysSinceLastTx = (block.timestamp - lastTxTime) / 86400;
        if (daysSinceLastTx <= 1) return 100;
        if (daysSinceLastTx <= 7) return 80;
        if (daysSinceLastTx <= 30) return 60;
        if (daysSinceLastTx <= 90) return 40;
        if (daysSinceLastTx <= 365) return 20;
        return 0;
    }
    
    function getOnChainMetrics(address user) external view returns (OnChainMetrics memory) {
        return onChainData[user];
    }
}