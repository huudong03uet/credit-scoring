// filepath: crypto-credit-scoring-system/contracts/core/CreditScoringEngine.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./UserRegistry.sol";
import "./CreditDataTypes.sol";
import "../managers/OffChainDataManager.sol";
import "../managers/LoanHistoryTracker.sol";
import "../managers/CollateralManager.sol";
import "../analyzers/OnChainAnalyzer.sol";
import "../libraries/CreditMath.sol";

contract CreditScoringEngine is AccessControl, Pausable, ReentrancyGuard, CreditDataTypes {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    UserRegistry public userRegistry;
    CollateralManager public collateralManager;
    OffChainDataManager public offChainDataManager;
    LoanHistoryTracker public loanHistoryTracker;
    OnChainAnalyzer public onChainAnalyzer;

    event CreditScoreCalculated(address indexed user, uint256 score);

    constructor(
        address _userRegistry,
        address _collateralManager,
        address _offChainDataManager,
        address _loanHistoryTracker,
        address _onChainAnalyzer
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        userRegistry = UserRegistry(_userRegistry);
        collateralManager = CollateralManager(_collateralManager);
        offChainDataManager = OffChainDataManager(_offChainDataManager);
        loanHistoryTracker = LoanHistoryTracker(_loanHistoryTracker);
        onChainAnalyzer = OnChainAnalyzer(_onChainAnalyzer);
    }

    function calculateCreditScore(address user) external whenNotPaused {
        require(userRegistry.registeredUsers(user), "User not registered");
        
        uint256 onChainScore = onChainAnalyzer.calculateOnChainScore(user);
        uint256 offChainScore = offChainDataManager.calculateOffChainScore(user);
        uint256 collateralScore = collateralManager.calculateCollateralScore(user);
        uint256 historicalScore = loanHistoryTracker.calculateHistoricalScore(user);
        
        uint256 finalScore = CreditMath.calculateScore(onChainScore, offChainScore, collateralScore, historicalScore);
        
        emit CreditScoreCalculated(user, finalScore);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}