const hre = require("hardhat");

async function main() {
    console.log("Starting deployment...");
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy Mock Oracle first
    console.log("\n1. Deploying MockOracle...");
    const MockOracle = await hre.ethers.getContractFactory("MockOracle");
    const mockOracle = await MockOracle.deploy();
    await mockOracle.deployed();
    console.log("MockOracle deployed to:", mockOracle.address);

    // Deploy UserRegistry
    console.log("\n2. Deploying UserRegistry...");
    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.deployed();
    console.log("UserRegistry deployed to:", userRegistry.address);

    // Deploy OnChainAnalyzer
    console.log("\n3. Deploying OnChainAnalyzer...");
    const OnChainAnalyzer = await hre.ethers.getContractFactory("OnChainAnalyzer");
    const onChainAnalyzer = await OnChainAnalyzer.deploy(userRegistry.address);
    await onChainAnalyzer.deployed();
    console.log("OnChainAnalyzer deployed to:", onChainAnalyzer.address);

    // Deploy CollateralManager
    console.log("\n4. Deploying CollateralManager...");
    const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
    const collateralManager = await CollateralManager.deploy(userRegistry.address, mockOracle.address);
    await collateralManager.deployed();
    console.log("CollateralManager deployed to:", collateralManager.address);

    // Deploy OffChainDataManager
    console.log("\n5. Deploying OffChainDataManager...");
    const OffChainDataManager = await hre.ethers.getContractFactory("OffChainDataManager");
    const offChainDataManager = await OffChainDataManager.deploy(userRegistry.address, mockOracle.address);
    await offChainDataManager.deployed();
    console.log("OffChainDataManager deployed to:", offChainDataManager.address);

    // Deploy LoanHistoryTracker
    console.log("\n6. Deploying LoanHistoryTracker...");
    const LoanHistoryTracker = await hre.ethers.getContractFactory("LoanHistoryTracker");
    const loanHistoryTracker = await LoanHistoryTracker.deploy();
    await loanHistoryTracker.deployed();
    console.log("LoanHistoryTracker deployed to:", loanHistoryTracker.address);

    // Deploy CreditScoringEngine
    console.log("\n7. Deploying CreditScoringEngine...");
    const CreditScoringEngine = await hre.ethers.getContractFactory("CreditScoringEngine");
    const creditScoringEngine = await CreditScoringEngine.deploy(
        userRegistry.address,
        onChainAnalyzer.address,
        collateralManager.address,
        offChainDataManager.address,
        loanHistoryTracker.address
    );
    await creditScoringEngine.deployed();
    console.log("CreditScoringEngine deployed to:", creditScoringEngine.address);

    // Deploy Mock ERC20 tokens for testing
    console.log("\n8. Deploying Mock ERC20 Tokens...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    
    const mockUSDC = await MockERC20.deploy("Mock USD Coin", "USDC", 6);
    await mockUSDC.deployed();
    console.log("Mock USDC deployed to:", mockUSDC.address);

    const mockWBTC = await MockERC20.deploy("Mock Wrapped Bitcoin", "WBTC", 8);
    await mockWBTC.deployed();
    console.log("Mock WBTC deployed to:", mockWBTC.address);

    // Initial setup and configuration
    console.log("\n9. Setting up initial configurations...");

    // Set mock prices in Oracle
    console.log("Setting mock token prices...");
    await mockOracle.setPrice("0x0000000000000000000000000000000000000000", hre.ethers.utils.parseEther("2000")); // ETH = $2000
    await mockOracle.setPrice(mockUSDC.address, hre.ethers.utils.parseEther("1")); // USDC = $1
    await mockOracle.setPrice(mockWBTC.address, hre.ethers.utils.parseEther("30000")); // WBTC = $30000
    console.log("✓ Mock prices set");

    // Add supported tokens to CollateralManager
    console.log("Adding supported tokens to CollateralManager...");
    await collateralManager.addSupportedToken("0x0000000000000000000000000000000000000000", 8000); // ETH - 80% LTV
    await collateralManager.addSupportedToken(mockUSDC.address, 9000); // USDC - 90% LTV
    await collateralManager.addSupportedToken(mockWBTC.address, 7500); // WBTC - 75% LTV
    console.log("✓ Supported tokens added");

    // Grant necessary roles
    console.log("Granting roles to deployer...");
    
    // OnChainAnalyzer roles
    const ANALYZER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ANALYZER_ROLE"));
    await onChainAnalyzer.grantRole(ANALYZER_ROLE, deployer.address);
    
    // OffChainDataManager roles
    const DATA_PROVIDER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("DATA_PROVIDER_ROLE"));
    await offChainDataManager.grantRole(DATA_PROVIDER_ROLE, deployer.address);
    
    // LoanHistoryTracker roles
    const LOAN_MANAGER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("LOAN_MANAGER_ROLE"));
    await loanHistoryTracker.grantRole(LOAN_MANAGER_ROLE, deployer.address);
    
    // CreditScoringEngine roles
    const SCORER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SCORER_ROLE"));
    await creditScoringEngine.grantRole(SCORER_ROLE, deployer.address);
    
    // UserRegistry roles
    const VERIFIER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("VERIFIER_ROLE"));
    await userRegistry.grantRole(VERIFIER_ROLE, deployer.address);
    
    console.log("✓ All roles granted");

    // Mint some test tokens to deployer
    console.log("Minting test tokens to deployer...");
    await mockUSDC.mint(deployer.address, hre.ethers.utils.parseUnits("10000", 6)); // 10,000 USDC
    await mockWBTC.mint(deployer.address, hre.ethers.utils.parseUnits("1", 8)); // 1 WBTC
    console.log("✓ Test tokens minted");

    // Generate deployment summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    
    const deploymentSummary = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            MockOracle: mockOracle.address,
            UserRegistry: userRegistry.address,
            OnChainAnalyzer: onChainAnalyzer.address,
            CollateralManager: collateralManager.address,
            OffChainDataManager: offChainDataManager.address,
            LoanHistoryTracker: loanHistoryTracker.address,
            CreditScoringEngine: creditScoringEngine.address
        },
        mockTokens: {
            USDC: mockUSDC.address,
            WBTC: mockWBTC.address
        }
    };

    console.log("\nDeployment Summary:");
    console.log(JSON.stringify(deploymentSummary, null, 2));

    // Generate frontend config file
    console.log("\n10. Generating frontend configuration...");
    
    const configContent = `// Auto-generated configuration file
// Generated on: ${new Date().toISOString()}
// Network: ${hre.network.name}
// Deployer: ${deployer.address}

// Contract addresses
const CONTRACT_ADDRESSES = {
    UserRegistry: "${userRegistry.address}",
    OnChainAnalyzer: "${onChainAnalyzer.address}",
    CollateralManager: "${collateralManager.address}",
    OffChainDataManager: "${offChainDataManager.address}",
    LoanHistoryTracker: "${loanHistoryTracker.address}",
    CreditScoringEngine: "${creditScoringEngine.address}",
    MockOracle: "${mockOracle.address}"
};

// Network configuration
const NETWORK_CONFIG = {
    chainId: 31337, // Hardhat local network
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: ""
};

// Application configuration
const APP_CONFIG = {
    defaultGasLimit: "500000",
    transactionTimeout: 60000, // 60 seconds
    refreshInterval: 30000 // 30 seconds
};

// Mock token addresses for testing
const MOCK_TOKENS = {
    ETH: "0x0000000000000000000000000000000000000000", // ETH
    USDC: "${mockUSDC.address}", // Mock USDC
    WBTC: "${mockWBTC.address}"  // Mock WBTC
};

// Token configurations
const TOKEN_CONFIG = {
    ETH: { symbol: "ETH", decimals: 18, name: "Ethereum" },
    USDC: { symbol: "USDC", decimals: 6, name: "USD Coin" },
    WBTC: { symbol: "WBTC", decimals: 8, name: "Wrapped Bitcoin" }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONTRACT_ADDRESSES,
        NETWORK_CONFIG,
        APP_CONFIG,
        MOCK_TOKENS,
        TOKEN_CONFIG
    };
}`;

    // Write config file
    const fs = require('fs');
    const path = require('path');
    
    const frontendDir = path.join(__dirname, '..', 'frontend');
    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    const configPath = path.join(frontendDir, 'config.js');
    fs.writeFileSync(configPath, configContent);
    console.log(`✓ Frontend config generated: ${configPath}`);

    // Generate deployment info file
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        deployer: deployer.address,
        gasUsed: "Calculating...",
        ...deploymentSummary
    };

    const deploymentPath = path.join(__dirname, '..', 'deployments.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✓ Deployment info saved: ${deploymentPath}`);

    console.log("\n" + "=".repeat(50));
    console.log("🚀 READY TO USE!");
    console.log("=".repeat(50));
    console.log("1. Start Hardhat node: npx hardhat node");
    console.log("2. Open frontend/index.html in browser");
    console.log("3. Connect MetaMask to localhost:8545");
    console.log("4. Import test account if needed");
    console.log("5. Start testing the dApp!");
    console.log("=".repeat(50));
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });