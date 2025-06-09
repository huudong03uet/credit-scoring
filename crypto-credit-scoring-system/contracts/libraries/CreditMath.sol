// filepath: crypto-credit-scoring-system/contracts/libraries/CreditMath.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library CreditMath {
    function calculateScore(
        uint256 onChainScore,
        uint256 offChainScore,
        uint256 collateralRatio,
        uint256 historicalScore
    ) internal pure returns (uint256) {
        uint256 weightedScore = (onChainScore * 40 + 
                               offChainScore * 30 + 
                               collateralRatio * 20 + 
                               historicalScore * 10) / 100;
        
        return weightedScore > 1000 ? 1000 : weightedScore;
    }
    
    function calculateRiskLevel(uint256 score) internal pure returns (uint8) {
        if (score >= 800) return 1; // Very Low Risk
        if (score >= 600) return 2; // Low Risk  
        if (score >= 400) return 3; // Medium Risk
        if (score >= 200) return 4; // High Risk
        return 5; // Very High Risk
    }
}