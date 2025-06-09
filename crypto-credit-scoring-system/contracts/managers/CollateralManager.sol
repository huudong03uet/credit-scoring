// filepath: crypto-credit-scoring-system/contracts/managers/CollateralManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../core/CreditDataTypes.sol";
import "../interfaces/IOracle.sol";
import "../core/UserRegistry.sol";

contract CollateralManager is AccessControl, ReentrancyGuard, CreditDataTypes {
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    
    UserRegistry public userRegistry;
    IOracle public priceOracle;
    
    mapping(address => CollateralInfo[]) public userCollaterals;
    mapping(address => uint256) public totalCollateralValue;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public liquidationThresholds; // in basis points
    
    event CollateralDeposited(address indexed user, address token, uint256 amount, uint256 value);
    event CollateralWithdrawn(address indexed user, address token, uint256 amount);
    event CollateralLiquidated(address indexed user, address token, uint256 amount);
    
    constructor(address _userRegistry, address _priceOracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);
        userRegistry = UserRegistry(_userRegistry);
        priceOracle = IOracle(_priceOracle);
    }
    
    function addSupportedToken(address token, uint256 liquidationThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = true;
        liquidationThresholds[token] = liquidationThreshold;
    }
    
    function depositCollateral(address token, uint256 amount) external nonReentrant {
        require(userRegistry.registeredUsers(msg.sender), "User not registered");
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be positive");
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        uint256 tokenPrice = priceOracle.getPrice(token);
        uint256 value = (amount * tokenPrice) / 1e18;
        
        userCollaterals[msg.sender].push(CollateralInfo({
            tokenAddress: token,
            amount: amount,
            value: value,
            liquidationThreshold: liquidationThresholds[token],
            isActive: true,
            depositTime: block.timestamp
        }));
        
        totalCollateralValue[msg.sender] += value;
        
        emit CollateralDeposited(msg.sender, token, amount, value);
    }
    
    function withdrawCollateral(uint256 collateralIndex) external nonReentrant {
        require(collateralIndex < userCollaterals[msg.sender].length, "Invalid index");
        
        CollateralInfo storage collateral = userCollaterals[msg.sender][collateralIndex];
        require(collateral.isActive, "Collateral not active");
        
        require(canWithdrawCollateral(msg.sender, collateral.value), "Cannot withdraw: affects loan safety");
        
        collateral.isActive = false;
        totalCollateralValue[msg.sender] -= collateral.value;
        
        IERC20(collateral.tokenAddress).transfer(msg.sender, collateral.amount);
        
        emit CollateralWithdrawn(msg.sender, collateral.tokenAddress, collateral.amount);
    }
    
    function calculateCollateralScore(address user) external view returns (uint256) {
        uint256 totalValue = totalCollateralValue[user];
        
        if (totalValue >= 100000 * 1e18) return 100; // $100k+
        if (totalValue >= 50000 * 1e18) return 90;   // $50k+
        if (totalValue >= 25000 * 1e18) return 80;   // $25k+
        if (totalValue >= 10000 * 1e18) return 70;   // $10k+
        if (totalValue >= 5000 * 1e18) return 60;    // $5k+
        if (totalValue >= 1000 * 1e18) return 50;    // $1k+
        if (totalValue >= 500 * 1e18) return 40;     // $500+
        if (totalValue >= 100 * 1e18) return 30;     // $100+
        if (totalValue > 0) return 20;
        return 0;
    }
    
    function canWithdrawCollateral(address user, uint256 valueToWithdraw) internal view returns (bool) {
        // Logic to check if collateral can be withdrawn
        // Implement loan safety check logic here
        return true; 
    }
    
    function getUserCollaterals(address user) external view returns (CollateralInfo[] memory) {
        return userCollaterals[user];
    }
    
    function getTotalCollateralValue(address user) external view returns (uint256) {
        return totalCollateralValue[user];
    }
}