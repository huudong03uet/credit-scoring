// Auto-generated configuration file
// Generated on: 2025-06-09T15:34:57.594Z
// Network: localhost
// Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

// Contract addresses
const CONTRACT_ADDRESSES = {
    UserRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    OnChainAnalyzer: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    CollateralManager: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    OffChainDataManager: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    LoanHistoryTracker: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    CreditScoringEngine: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    MockOracle: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
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
    USDC: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", // Mock USDC
    WBTC: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"  // Mock WBTC
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
}