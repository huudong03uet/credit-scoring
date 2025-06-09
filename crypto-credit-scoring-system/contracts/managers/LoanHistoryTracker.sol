// filepath: crypto-credit-scoring-system/contracts/managers/LoanHistoryTracker.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../core/CreditDataTypes.sol";

/**
 * @title LoanHistoryTracker
 * @dev Tracks user loan history, including recording loans, repayments, and defaults.
 */
contract LoanHistoryTracker is AccessControl, CreditDataTypes {
    using Counters for Counters.Counter;
    
    bytes32 public constant LOAN_MANAGER_ROLE = keccak256("LOAN_MANAGER_ROLE");
    
    Counters.Counter private _loanIdCounter;
    
    mapping(address => LoanHistory[]) public userLoanHistory;
    mapping(uint256 => LoanHistory) public loans;
    mapping(address => uint256) public totalLoansCount;
    mapping(address => uint256) public defaultedLoansCount;
    mapping(address => uint256) public totalRepaidAmount;
    
    event LoanRecorded(address indexed user, uint256 loanId, uint256 amount);
    event LoanRepaid(address indexed user, uint256 loanId, uint256 amount);
    event LoanDefaulted(address indexed user, uint256 loanId);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LOAN_MANAGER_ROLE, msg.sender);
    }
    
    function recordLoan(
        address user,
        uint256 amount,
        uint256 interestRate,
        uint256 duration
    ) external onlyRole(LOAN_MANAGER_ROLE) returns (uint256) {
        _loanIdCounter.increment();
        uint256 loanId = _loanIdCounter.current();
        
        LoanHistory memory newLoan = LoanHistory({
            loanId: loanId,
            amount: amount,
            interestRate: interestRate,
            duration: duration,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isRepaid: false,
            isDefaulted: false,
            repaidAmount: 0,
            penaltyAmount: 0
        });
        
        userLoanHistory[user].push(newLoan);
        loans[loanId] = newLoan;
        totalLoansCount[user]++;
        
        emit LoanRecorded(user, loanId, amount);
        return loanId;
    }
    
    function recordRepayment(
        address user,
        uint256 loanId,
        uint256 repaidAmount
    ) external onlyRole(LOAN_MANAGER_ROLE) {
        require(loans[loanId].loanId == loanId, "Loan not found");
        require(!loans[loanId].isRepaid, "Loan already repaid");
        require(!loans[loanId].isDefaulted, "Loan defaulted");
        
        loans[loanId].isRepaid = true;
        loans[loanId].repaidAmount = repaidAmount;
        totalRepaidAmount[user] += repaidAmount;
        
        // Update in user's history array
        for (uint i = 0; i < userLoanHistory[user].length; i++) {
            if (userLoanHistory[user][i].loanId == loanId) {
                userLoanHistory[user][i].isRepaid = true;
                userLoanHistory[user][i].repaidAmount = repaidAmount;
                break;
            }
        }
        
        emit LoanRepaid(user, loanId, repaidAmount);
    }
    
    function recordDefault(address user, uint256 loanId) external onlyRole(LOAN_MANAGER_ROLE) {
        require(loans[loanId].loanId == loanId, "Loan not found");
        require(!loans[loanId].isRepaid, "Loan already repaid");
        require(block.timestamp > loans[loanId].endTime, "Loan not yet due");
        
        loans[loanId].isDefaulted = true;
        defaultedLoansCount[user]++;
        
        // Update in user's history array
        for (uint i = 0; i < userLoanHistory[user].length; i++) {
            if (userLoanHistory[user][i].loanId == loanId) {
                userLoanHistory[user][i].isDefaulted = true;
                break;
            }
        }
        
        emit LoanDefaulted(user, loanId);
    }
    
    function calculateHistoricalScore(address user) external view returns (uint256) {
        uint256 totalLoans = totalLoansCount[user];
        // Implement logic to calculate historical score based on loan history
        return 0; // Placeholder return value
    }
    
    function calculateRecentDefaultPenalty(address user) internal view returns (uint256) {
        // Implement logic to calculate penalty based on recent defaults
        return 0; // Placeholder return value
    }
}