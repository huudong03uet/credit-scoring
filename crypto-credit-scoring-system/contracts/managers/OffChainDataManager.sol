// filepath: crypto-credit-scoring-system/contracts/managers/OffChainDataManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../core/CreditDataTypes.sol";
import "../interfaces/IOracle.sol";
import "../core/UserRegistry.sol";

/**
 * @title OffChainDataManager
 * @dev Manages off-chain data related to users, including updating and verifying off-chain metrics.
 */
contract OffChainDataManager is AccessControl, CreditDataTypes {
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    
    UserRegistry public userRegistry;
    IOracle public dataOracle;
    
    mapping(address => OffChainMetrics) public offChainData;
    mapping(address => uint256) public lastDataUpdate;
    mapping(string => bool) public verifiedDataSources;
    
    event OffChainDataUpdated(address indexed user, uint256 score, string ipfsHash);
    event DataSourceVerified(string source);
    
    constructor(address _userRegistry, address _dataOracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DATA_PROVIDER_ROLE, msg.sender);
        userRegistry = UserRegistry(_userRegistry);
        dataOracle = IOracle(_dataOracle);
    }
    
    function updateOffChainData(
        address user,
        OffChainMetrics calldata data
    ) external onlyRole(DATA_PROVIDER_ROLE) {
        require(userRegistry.registeredUsers(user), "User not registered");
        require(userRegistry.isUserVerified(user), "User not verified");
        
        offChainData[user] = data;
        lastDataUpdate[user] = block.timestamp;
        
        uint256 score = calculateOffChainScore(user);
        emit OffChainDataUpdated(user, score, data.ipfsHash);
    }
    
    function calculateOffChainScore(address user) public view returns (uint256) {
        OffChainMetrics memory data = offChainData[user];
        
        // Weighted calculation of off-chain score
        uint256 totalScore = (
            data.socialScore * 15 +      // 15%
            data.kycScore * 25 +         // 25%
            data.educationScore * 10 +   // 10%
            data.employmentScore * 20 +  // 20%
            data.incomeScore * 20 +      // 20%
            (100 - data.debtToIncomeRatio) * 10  // 10% (inverse of debt ratio)
        ) / 100;
        
        // Apply data freshness penalty
        uint256 dataAge = (block.timestamp - data.dataTimestamp) / 86400; // days
        if (dataAge > 90) {
            totalScore = totalScore * 80 / 100; // 20% penalty for old data
        } else if (dataAge > 30) {
            totalScore = totalScore * 90 / 100; // 10% penalty
        }
        
        return totalScore > 100 ? 100 : totalScore;
    }
    
    function verifyDataSource(string calldata source) external onlyRole(DEFAULT_ADMIN_ROLE) {
        verifiedDataSources[source] = true;
        emit DataSourceVerified(source);
    }
    
    function getOffChainMetrics(address user) external view returns (OffChainMetrics memory) {
        return offChainData[user];
    }
    
    function isDataFresh(address user, uint256 maxAgeInDays) external view returns (bool) {
        uint256 dataAge = (block.timestamp - lastDataUpdate[user]) / 86400;
        return dataAge <= maxAgeInDays;
    }
}