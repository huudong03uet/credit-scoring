// Contract ABIs
const CONTRACT_ABIS = {
    UserRegistry: [
        "function registerUser(string did, bytes32 profileHash)",
        "function verifyUser(address user)",
        "function getUserProfile(address user) view returns (tuple(address userAddress, string did, bool isVerified, bool isActive, uint256 registrationTime, uint256 lastUpdateTime, bytes32 profileHash))",
        "function isUserVerified(address user) view returns (bool)",
        "function registeredUsers(address) view returns (bool)",
        "event UserRegistered(address indexed user, string did, uint256 userId)",
        "event UserVerified(address indexed user, address verifier)"
    ],
    
    OnChainAnalyzer: [
        "function updateOnChainMetrics(address user, tuple(uint256 totalTransactions, uint256 totalVolume, uint256 averageTransactionSize, uint256 liquidityProvided, uint256 stakingAmount, uint256 governanceParticipation, uint256 contractInteractions, uint256 uniqueContractsUsed, uint256 accountAge, uint256 lastTransactionTime) metrics)",
        "function calculateOnChainScore(address user) view returns (uint256)",
        "function getOnChainMetrics(address user) view returns (tuple(uint256 totalTransactions, uint256 totalVolume, uint256 averageTransactionSize, uint256 liquidityProvided, uint256 stakingAmount, uint256 governanceParticipation, uint256 contractInteractions, uint256 uniqueContractsUsed, uint256 accountAge, uint256 lastTransactionTime))",
        "event OnChainDataUpdated(address indexed user, uint256 score)"
    ],
    
    CollateralManager: [
        "function depositCollateral(address token, uint256 amount)",
        "function withdrawCollateral(uint256 collateralIndex)",
        "function addSupportedToken(address token, uint256 liquidationThreshold)",
        "function calculateCollateralScore(address user) view returns (uint256)",
        "function getUserCollaterals(address user) view returns (tuple(address tokenAddress, uint256 amount, uint256 value, uint256 liquidationThreshold, bool isActive, uint256 depositTime)[])",
        "function getTotalCollateralValue(address user) view returns (uint256)",
        "function supportedTokens(address) view returns (bool)",
        "event CollateralDeposited(address indexed user, address token, uint256 amount, uint256 value)",
        "event CollateralWithdrawn(address indexed user, address token, uint256 amount)"
    ],
    
    OffChainDataManager: [
        "function updateOffChainData(address user, tuple(uint256 socialScore, uint256 kycScore, uint256 educationScore, uint256 employmentScore, uint256 incomeScore, uint256 debtToIncomeRatio, string ipfsHash, uint256 dataTimestamp) data)",
        "function calculateOffChainScore(address user) view returns (uint256)",
        "function getOffChainMetrics(address user) view returns (tuple(uint256 socialScore, uint256 kycScore, uint256 educationScore, uint256 employmentScore, uint256 incomeScore, uint256 debtToIncomeRatio, string ipfsHash, uint256 dataTimestamp))",
        "function isDataFresh(address user, uint256 maxAgeInDays) view returns (bool)",
        "event OffChainDataUpdated(address indexed user, uint256 score, string ipfsHash)"
    ],
    
    LoanHistoryTracker: [
        "function recordLoan(address user, uint256 amount, uint256 interestRate, uint256 duration) returns (uint256)",
        "function recordRepayment(address user, uint256 loanId, uint256 repaidAmount)",
        "function recordDefault(address user, uint256 loanId)",
        "function calculateHistoricalScore(address user) view returns (uint256)",
        "function getUserLoanHistory(address user) view returns (tuple(uint256 loanId, uint256 amount, uint256 interestRate, uint256 duration, uint256 startTime, uint256 endTime, bool isRepaid, bool isDefaulted, uint256 repaidAmount, uint256 penaltyAmount)[])",
        "function getUserLoanStats(address user) view returns (uint256 total, uint256 defaulted, uint256 repaymentRate, uint256 totalRepaid)",
        "event LoanRecorded(address indexed user, uint256 loanId, uint256 amount)",
        "event LoanRepaid(address indexed user, uint256 loanId, uint256 amount)",
        "event LoanDefaulted(address indexed user, uint256 loanId)"
    ],
    
    CreditScoringEngine: [
        "function calculateCreditScore(address user)",
        "function getCreditScore(address user) view returns (tuple(uint256 finalScore, uint256 onChainScore, uint256 offChainScore, uint256 collateralScore, uint256 historicalScore, uint8 riskLevel, uint256 maxLoanAmount, uint256 interestRate, uint256 lastCalculatedTime, bool isValid))",
        "function getCreditSummary(address user) view returns (uint256 score, uint8 riskLevel, uint256 maxLoanAmount, uint256 interestRate, bool isValid)",
        "function isScoreValid(address user) view returns (bool)",
        "function batchCalculateScores(address[] users)",
        "event CreditScoreCalculated(address indexed user, uint256 score, uint8 riskLevel)"
    ],
    
    ERC20: [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ]
};

// Contract instances
let contracts = {};

// Add network validation function
async function validateNetworkConnection() {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        console.log(`Connected to ${network.name} (chainId: ${network.chainId})`);
        console.log(`Latest block: ${blockNumber}`);
        
        if (blockNumber === 0) {
            throw new Error('No blocks found - blockchain may need to be restarted');
        }
        
        return true;
    } catch (error) {
        console.error('Network validation failed:', error);
        return false;
    }
}

// Initialize contracts
async function initializeContracts(signer) {
    const isValid = await validateNetworkConnection();
    if (!isValid) {
        throw new Error('Network connection invalid');
    }
    
    contracts.userRegistry = new ethers.Contract(CONTRACT_ADDRESSES.UserRegistry, CONTRACT_ABIS.UserRegistry, signer);
    contracts.onChainAnalyzer = new ethers.Contract(CONTRACT_ADDRESSES.OnChainAnalyzer, CONTRACT_ABIS.OnChainAnalyzer, signer);
    contracts.collateralManager = new ethers.Contract(CONTRACT_ADDRESSES.CollateralManager, CONTRACT_ABIS.CollateralManager, signer);
    contracts.offChainDataManager = new ethers.Contract(CONTRACT_ADDRESSES.OffChainDataManager, CONTRACT_ABIS.OffChainDataManager, signer);
    contracts.loanHistoryTracker = new ethers.Contract(CONTRACT_ADDRESSES.LoanHistoryTracker, CONTRACT_ABIS.LoanHistoryTracker, signer);
    contracts.creditScoringEngine = new ethers.Contract(CONTRACT_ADDRESSES.CreditScoringEngine, CONTRACT_ABIS.CreditScoringEngine, signer);
}

// Helper function to get token contract
function getTokenContract(tokenAddress, signer) {
    return new ethers.Contract(tokenAddress, CONTRACT_ABIS.ERC20, signer);
}