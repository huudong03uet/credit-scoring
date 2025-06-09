// filepath: crypto-credit-scoring-system/contracts/core/CreditDataTypes.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CreditDataTypes {
    struct UserProfile {
        address userAddress;
        string did; // Decentralized Identity
        bool isVerified;
        bool isActive;
        uint256 registrationTime;
        uint256 lastUpdateTime;
        bytes32 profileHash;
    }
    
    struct OnChainMetrics {
        uint256 totalTransactions;
        uint256 totalVolume;
        uint256 averageTransactionSize;
        uint256 liquidityProvided;
        uint256 stakingAmount;
        uint256 governanceParticipation;
        uint256 contractInteractions;
        uint256 uniqueContractsUsed;
        uint256 accountAge; // Account age in days
        uint256 lastTransactionTime;
    }
    
    struct OffChainMetrics {
        uint256 socialScore; // Score from social media
        uint256 kycScore; // Score from KYC
        uint256 educationScore; // Education score
        uint256 employmentScore; // Employment score
        uint256 incomeScore; // Income score
        uint256 debtToIncomeRatio; // Debt-to-income ratio
        string ipfsHash; // Hash of off-chain data
        uint256 dataTimestamp;
    }
    
    struct CollateralInfo {
        address tokenAddress;
        uint256 amount;
        uint256 value; // Value in USD
        uint256 liquidationThreshold;
        bool isActive;
        uint256 depositTime;
    }
    
    struct CreditScore {
        uint256 finalScore;
        uint256 onChainScore;
        uint256 offChainScore;
        uint256 collateralScore;
        uint256 historicalScore;
        uint8 riskLevel;
        uint256 maxLoanAmount;
        uint256 interestRate; // Proposed interest rate (basis points)
        uint256 lastCalculatedTime;
        bool isValid;
    }
    
    struct LoanHistory {
        uint256 loanId;
        uint256 amount;
        uint256 interestRate;
        uint256 duration;
        uint256 startTime;
        uint256 endTime;
        bool isRepaid;
        bool isDefaulted;
        uint256 repaidAmount;
        uint256 penaltyAmount;
    }
    
    struct CreditEvent {
        address user;
        string eventType; // "SCORE_UPDATE", "LOAN_TAKEN", "LOAN_REPAID", "DEFAULT"
        uint256 oldScore;
        uint256 newScore;
        string metadata;
        uint256 timestamp;
    }
}