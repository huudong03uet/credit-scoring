// Global variables
let provider, signer, userAddress;
let isConnected = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkWalletConnection();
});

// Event listeners
function initializeEventListeners() {
    // Wallet connection
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Profile actions
    document.getElementById('registerBtn').addEventListener('click', registerUser);
    
    // Collateral actions
    document.getElementById('depositBtn').addEventListener('click', depositCollateral);
    
    // Credit score actions
    document.getElementById('calculateScoreBtn').addEventListener('click', calculateCreditScore);
    
    // Admin actions
    document.getElementById('verifyUserBtn').addEventListener('click', verifyUser);
    document.getElementById('updateMetricsBtn').addEventListener('click', updateMetrics);
    document.getElementById('addTokenBtn').addEventListener('click', addSupportedToken);
}

// Wallet connection
async function connectWallet() {
    try {
        if (!window.ethereum) {
            showToast('Please install MetaMask', 'error');
            return;
        }

        showLoading(true);
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Initialize contracts
        initializeContracts(signer);
        
        // Update UI
        await updateWalletInfo();
        await updateAllUserData();
        
        isConnected = true;
        showToast('Wallet connected successfully!', 'success');
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast('Failed to connect wallet', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateWalletInfo() {
    try {
        const balance = await provider.getBalance(userAddress);
        const network = await provider.getNetwork();
        
        document.getElementById('walletInfo').classList.remove('hidden');
        document.querySelector('.wallet-address').textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        document.querySelector('.wallet-balance').textContent = `${ethers.utils.formatEther(balance)} ETH`;
        document.querySelector('.network-info').textContent = `${network.name} (${network.chainId})`;
        
        document.getElementById('connectWallet').textContent = 'Connected';
        document.getElementById('connectWallet').disabled = true;
        
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

async function checkWalletConnection() {
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
    }
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    // Load tab-specific data
    if (isConnected) {
        switch(tabName) {
            case 'profile':
                loadProfileData();
                break;
            case 'collateral':
                loadCollateralData();
                break;
            case 'credit':
                loadCreditData();
                break;
            case 'loans':
                loadLoanData();
                break;
        }
    }
}

// Profile functions
async function loadProfileData() {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask not found');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        // Check if we're connected to the right network
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);

        // Check latest block to ensure blockchain is accessible
        const latestBlock = await provider.getBlockNumber();
        console.log('Latest block:', latestBlock);

        if (latestBlock === 0) {
            throw new Error('Blockchain appears to be reset. Please restart your local node and redeploy contracts.');
        }

        // Initialize contracts with error checking
        initializeContracts(signer);

        // Test contract connectivity before making calls
        const code = await provider.getCode(CONTRACT_ADDRESSES.UserRegistry);
        if (code === '0x') {
            throw new Error('Contracts not deployed. Please deploy contracts first.');
        }

        // Your existing profile loading code here...
        const userProfile = await contracts.userRegistry.getUserProfile(userAddress);
        // ... rest of your code

    } catch (error) {
        console.error('Error loading profile data:', error);
        
        // User-friendly error messages
        if (error.message.includes('invalid block tag')) {
            alert('Blockchain connection lost. Please restart your local blockchain and refresh the page.');
        } else if (error.message.includes('Contracts not deployed')) {
            alert('Smart contracts not found. Please deploy the contracts first.');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
}

async function registerUser() {
    try {
        const did = document.getElementById('didInput').value.trim();
        const profileHash = document.getElementById('profileHashInput').value.trim() || ethers.utils.formatBytes32String('default');
        
        if (!did) {
            showToast('Please enter a DID', 'error');
            return;
        }
        
        showLoading(true);
        
        const tx = await contracts.userRegistry.registerUser(did, profileHash);
        await tx.wait();
        
        showToast('User registered successfully!', 'success');
        await loadProfileData();
        
        // Clear form
        document.getElementById('didInput').value = '';
        document.getElementById('profileHashInput').value = '';
        
    } catch (error) {
        console.error('Error registering user:', error);
        showToast('Failed to register user', 'error');
    } finally {
        showLoading(false);
    }
}

// Collateral functions
async function loadCollateralData() {
    try {
        // Check if user is registered first
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddress);
        if (!isRegistered) {
            document.getElementById('totalCollateralValue').textContent = '$0';
            document.getElementById('collateralScore').textContent = '0';
            document.getElementById('collateralList').innerHTML = '<p class="empty-state">Please register first to manage collateral</p>';
            return;
        }

        // Try to get collaterals with error handling
        let collaterals = [];
        let totalValue = ethers.BigNumber.from(0);
        let collateralScore = 0;

        try {
            collaterals = await contracts.collateralManager.getUserCollaterals(userAddress);
        } catch (error) {
            console.warn('No collaterals found for user:', error.message);
            collaterals = [];
        }

        try {
            totalValue = await contracts.collateralManager.getTotalCollateralValue(userAddress);
        } catch (error) {
            console.warn('Could not get total collateral value:', error.message);
        }

        try {
            collateralScore = await contracts.collateralManager.calculateCollateralScore(userAddress);
        } catch (error) {
            console.warn('Could not calculate collateral score:', error.message);
        }
        
        document.getElementById('totalCollateralValue').textContent = `$${ethers.utils.formatEther(totalValue)}`;
        document.getElementById('collateralScore').textContent = collateralScore.toString();
        
        displayCollaterals(collaterals);
        
    } catch (error) {
        console.error('Error loading collateral data:', error);
        document.getElementById('totalCollateralValue').textContent = '$0';
        document.getElementById('collateralScore').textContent = '0';
        document.getElementById('collateralList').innerHTML = '<p class="empty-state text-danger">Failed to load collateral data</p>';
    }
}

function displayCollaterals(collaterals) {
    const container = document.getElementById('collateralList');
    
    if (!collaterals || collaterals.length === 0) {
        container.innerHTML = '<p class="empty-state">No collateral deposited</p>';
        return;
    }
    
    container.innerHTML = collaterals.map((collateral, index) => `
        <div class="collateral-item">
            <div class="token-info">
                <span class="token-symbol">${getTokenSymbol(collateral.tokenAddress)}</span>
                <span class="token-amount">${formatTokenAmount(collateral.amount, collateral.tokenAddress)}</span>
            </div>
            <div class="token-value">$${ethers.utils.formatEther(collateral.value)}</div>
            <button class="btn btn-warning" onclick="withdrawCollateral(${index})" 
                    ${!collateral.isActive ? 'disabled' : ''}>
                ${collateral.isActive ? 'Withdraw' : 'Withdrawn'}
            </button>
        </div>
    `).join('');
}

async function depositCollateral() {
    try {
        // Check if user is registered
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddress);
        if (!isRegistered) {
            showToast('Please register first before depositing collateral', 'error');
            return;
        }

        const tokenSelect = document.getElementById('tokenSelect').value;
        const amount = document.getElementById('depositAmount').value;
        
        if (!tokenSelect || !amount || parseFloat(amount) <= 0) {
            showToast('Please select token and enter valid amount', 'error');
            return;
        }
        
        const tokenAddress = MOCK_TOKENS[tokenSelect];
        let amountWei;

        // Handle different token decimals
        if (tokenSelect === 'ETH') {
            amountWei = ethers.utils.parseEther(amount);
        } else if (tokenSelect === 'USDC') {
            amountWei = ethers.utils.parseUnits(amount, 6);
        } else if (tokenSelect === 'WBTC') {
            amountWei = ethers.utils.parseUnits(amount, 8);
        } else {
            amountWei = ethers.utils.parseEther(amount);
        }
        
        showLoading(true);
        
        if (tokenSelect === 'ETH') {
            // For ETH, we need to send value with transaction
            const tx = await contracts.collateralManager.depositCollateral(tokenAddress, amountWei, {
                value: amountWei,
                gasLimit: APP_CONFIG.defaultGasLimit
            });
            await tx.wait();
        } else {
            // For ERC20 tokens, need approval first
            const tokenContract = getTokenContract(tokenAddress, signer);
            
            // Check balance first
            const balance = await tokenContract.balanceOf(userAddress);
            if (balance.lt(amountWei)) {
                showToast(`Insufficient ${tokenSelect} balance`, 'error');
                return;
            }
            
            // Approve token
            const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.CollateralManager, amountWei, {
                gasLimit: APP_CONFIG.defaultGasLimit
            });
            await approveTx.wait();
            
            // Deposit collateral
            const tx = await contracts.collateralManager.depositCollateral(tokenAddress, amountWei, {
                gasLimit: APP_CONFIG.defaultGasLimit
            });
            await tx.wait();
        }
        
        showToast('Collateral deposited successfully!', 'success');
        await loadCollateralData();
        
        // Clear form
        document.getElementById('tokenSelect').value = '';
        document.getElementById('depositAmount').value = '';
        
    } catch (error) {
        console.error('Error depositing collateral:', error);
        if (error.message.includes('User not registered')) {
            showToast('Please register first', 'error');
        } else if (error.message.includes('Token not supported')) {
            showToast('Token not supported', 'error');
        } else {
            showToast('Failed to deposit collateral', 'error');
        }
    } finally {
        showLoading(false);
    }
}

async function withdrawCollateral(index) {
    try {
        showLoading(true);
        
        const tx = await contracts.collateralManager.withdrawCollateral(index, {
            gasLimit: APP_CONFIG.defaultGasLimit
        });
        await tx.wait();
        
        showToast('Collateral withdrawn successfully!', 'success');
        await loadCollateralData();
        
    } catch (error) {
        console.error('Error withdrawing collateral:', error);
        showToast('Failed to withdraw collateral', 'error');
    } finally {
        showLoading(false);
    }
}

// Credit score functions
async function loadCreditData() {
    try {
        // Check if user is registered first
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddress);
        if (!isRegistered) {
            displayDefaultCreditScore();
            return;
        }

        // Try to get credit score with error handling
        let creditScore = null;
        let isValid = false;

        try {
            creditScore = await contracts.creditScoringEngine.getCreditScore(userAddress);
            isValid = await contracts.creditScoringEngine.isScoreValid(userAddress);
        } catch (error) {
            console.warn('No credit score found for user:', error.message);
            displayDefaultCreditScore();
            return;
        }
        
        displayCreditScore(creditScore, isValid);
        
    } catch (error) {
        console.error('Error loading credit data:', error);
        displayDefaultCreditScore();
    }
}

function displayDefaultCreditScore() {
    document.getElementById('finalScore').textContent = '0';
    document.getElementById('onChainScore').textContent = '0';
    document.getElementById('offChainScore').textContent = '0';
    document.getElementById('collateralScoreValue').textContent = '0';
    document.getElementById('historicalScore').textContent = '0';
    
    // Update score bars
    updateScoreBar('onChainBar', 0);
    updateScoreBar('offChainBar', 0);
    updateScoreBar('collateralScoreBar', 0);
    updateScoreBar('historicalBar', 0);
    
    // Update risk level
    document.getElementById('riskLevel').textContent = 'Not Calculated';
    
    // Update risk badge class
    const riskBadge = document.querySelector('.risk-badge');
    riskBadge.className = 'risk-badge risk-unknown';
    
    // Update loan info
    document.getElementById('maxLoanAmount').textContent = '$0';
    document.getElementById('interestRate').textContent = '0%';
    document.getElementById('scoreValid').textContent = 'No';
}

function displayCreditScore(creditScore, isValid) {
    document.getElementById('finalScore').textContent = creditScore.finalScore.toString();
    document.getElementById('onChainScore').textContent = creditScore.onChainScore.toString();
    document.getElementById('offChainScore').textContent = creditScore.offChainScore.toString();
    document.getElementById('collateralScoreValue').textContent = creditScore.collateralScore.toString();
    document.getElementById('historicalScore').textContent = creditScore.historicalScore.toString();
    
    // Update score bars
    updateScoreBar('onChainBar', creditScore.onChainScore);
    updateScoreBar('offChainBar', creditScore.offChainScore);
    updateScoreBar('collateralScoreBar', creditScore.collateralScore);
    updateScoreBar('historicalBar', creditScore.historicalScore);
    
    // Update risk level
    const riskLevels = ['Unknown', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
    const riskLevel = riskLevels[creditScore.riskLevel] || 'Unknown';
    document.getElementById('riskLevel').textContent = riskLevel;
    
    // Update risk badge class
    const riskBadge = document.querySelector('.risk-badge');
    riskBadge.className = `risk-badge risk-${riskLevel.toLowerCase().replace(' ', '-')}`;
    
    // Update loan info
    document.getElementById('maxLoanAmount').textContent = `$${ethers.utils.formatEther(creditScore.maxLoanAmount)}`;
    document.getElementById('interestRate').textContent = `${(creditScore.interestRate / 100).toFixed(2)}%`;
    document.getElementById('scoreValid').textContent = isValid ? 'Yes' : 'No';
}

function updateScoreBar(barId, score) {
    const bar = document.getElementById(barId);
    const percentage = Math.min(score, 100);
    bar.style.width = `${percentage}%`;
}

async function calculateCreditScore() {
    try {
        // Check if user is registered and verified
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddress);
        if (!isRegistered) {
            showToast('Please register first', 'error');
            return;
        }

        const isVerified = await contracts.userRegistry.isUserVerified(userAddress);
        if (!isVerified) {
            showToast('User must be verified to calculate credit score', 'error');
            return;
        }
        
        showLoading(true);
        
        const tx = await contracts.creditScoringEngine.calculateCreditScore(userAddress, {
            gasLimit: APP_CONFIG.defaultGasLimit
        });
        await tx.wait();
        
        showToast('Credit score calculated successfully!', 'success');
        await loadCreditData();
        
    } catch (error) {
        console.error('Error calculating credit score:', error);
        if (error.message.includes('User not registered')) {
            showToast('Please register first', 'error');
        } else if (error.message.includes('User not verified')) {
            showToast('User must be verified first', 'error');
        } else {
            showToast('Failed to calculate credit score', 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Loan history functions
async function loadLoanData() {
    try {
        // Check if user is registered first
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddress);
        if (!isRegistered) {
            displayDefaultLoanData();
            return;
        }

        // Try to get loan data with error handling
        let loanHistory = [];
        let loanStats = { total: 0, defaulted: 0, repaymentRate: 0, totalRepaid: ethers.BigNumber.from(0) };

        try {
            loanHistory = await contracts.loanHistoryTracker.getUserLoanHistory(userAddress);
        } catch (error) {
            console.warn('No loan history found for user:', error.message);
        }

        try {
            loanStats = await contracts.loanHistoryTracker.getUserLoanStats(userAddress);
        } catch (error) {
            console.warn('Could not get loan stats:', error.message);
        }
        
        displayLoanStats(loanStats);
        displayLoanHistory(loanHistory);
        
    } catch (error) {
        console.error('Error loading loan data:', error);
        displayDefaultLoanData();
    }
}

function displayDefaultLoanData() {
    document.getElementById('totalLoans').textContent = '0';
    document.getElementById('defaultedLoans').textContent = '0';
    document.getElementById('repaymentRate').textContent = '0%';
    document.getElementById('totalRepaid').textContent = '$0';
    document.getElementById('loanHistoryList').innerHTML = '<p class="empty-state">No loan history available</p>';
}

function displayLoanStats(stats) {
    document.getElementById('totalLoans').textContent = stats.total.toString();
    document.getElementById('defaultedLoans').textContent = stats.defaulted.toString();
    document.getElementById('repaymentRate').textContent = `${stats.repaymentRate.toString()}%`;
    document.getElementById('totalRepaid').textContent = `$${ethers.utils.formatEther(stats.totalRepaid)}`;
}

function displayLoanHistory(loans) {
    const container = document.getElementById('loanHistoryList');
    
    if (!loans || loans.length === 0) {
        container.innerHTML = '<p class="empty-state">No loan history available</p>';
        return;
    }
    
    container.innerHTML = loans.map(loan => {
        const status = loan.isRepaid ? 'repaid' : (loan.isDefaulted ? 'defaulted' : 'active');
        const statusText = loan.isRepaid ? 'Repaid' : (loan.isDefaulted ? 'Defaulted' : 'Active');
        
        return `
            <div class="loan-item ${status}">
                <div class="loan-info">
                    <div class="loan-amount">$${ethers.utils.formatEther(loan.amount)}</div>
                    <div class="loan-details">
                        Interest: ${(loan.interestRate / 100).toFixed(2)}% | 
                        Duration: ${Math.floor(loan.duration / 86400)} days |
                        Start: ${new Date(loan.startTime * 1000).toLocaleDateString()}
                    </div>
                </div>
                <div class="loan-status status-${status}">${statusText}</div>
            </div>
        `;
    }).join('');
}

// Admin functions
async function verifyUser() {
    try {
        const userAddressToVerify = document.getElementById('verifyUserAddress').value.trim();
        
        if (!ethers.utils.isAddress(userAddressToVerify)) {
            showToast('Please enter a valid address', 'error');
            return;
        }
        
        // Check if user is registered
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddressToVerify);
        if (!isRegistered) {
            showToast('User is not registered', 'error');
            return;
        }
        
        showLoading(true);
        
        const tx = await contracts.userRegistry.verifyUser(userAddressToVerify, {
            gasLimit: APP_CONFIG.defaultGasLimit
        });
        await tx.wait();
        
        showToast('User verified successfully!', 'success');
        document.getElementById('verifyUserAddress').value = '';
        
    } catch (error) {
        console.error('Error verifying user:', error);
        showToast('Failed to verify user', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateMetrics() {
    try {
        const userAddr = document.getElementById('metricsUserAddress').value.trim();
        const totalTx = document.getElementById('totalTransactions').value || '0';
        const totalVol = document.getElementById('totalVolume').value || '0';
        const accAge = document.getElementById('accountAge').value || '0';
        
        if (!ethers.utils.isAddress(userAddr)) {
            showToast('Please enter a valid address', 'error');
            return;
        }
        
        // Check if user is registered
        const isRegistered = await contracts.userRegistry.registeredUsers(userAddr);
        if (!isRegistered) {
            showToast('User is not registered', 'error');
            return;
        }
        
        const metrics = {
            totalTransactions: totalTx,
            totalVolume: ethers.utils.parseEther(totalVol),
            averageTransactionSize: '0',
            liquidityProvided: '0',
            stakingAmount: '0',
            governanceParticipation: '0',
            contractInteractions: '0',
            uniqueContractsUsed: '0',
            accountAge: accAge,
            lastTransactionTime: Math.floor(Date.now() / 1000)
        };
        
        showLoading(true);
        
        const tx = await contracts.onChainAnalyzer.updateOnChainMetrics(userAddr, metrics, {
            gasLimit: APP_CONFIG.defaultGasLimit
        });
        await tx.wait();
        
        showToast('Metrics updated successfully!', 'success');
        
        // Clear form
        document.getElementById('metricsUserAddress').value = '';
        document.getElementById('totalTransactions').value = '';
        document.getElementById('totalVolume').value = '';
        document.getElementById('accountAge').value = '';
        
    } catch (error) {
        console.error('Error updating metrics:', error);
        showToast('Failed to update metrics', 'error');
    } finally {
        showLoading(false);
    }
}

async function addSupportedToken() {
    try {
        const tokenAddr = document.getElementById('tokenAddress').value.trim();
        const threshold = document.getElementById('liquidationThreshold').value || '8000';
        
        if (!ethers.utils.isAddress(tokenAddr)) {
            showToast('Please enter a valid token address', 'error');
            return;
        }
        
        showLoading(true);
        
        const tx = await contracts.collateralManager.addSupportedToken(tokenAddr, threshold, {
            gasLimit: APP_CONFIG.defaultGasLimit
        });
        await tx.wait();
        
        showToast('Token added successfully!', 'success');
        
        // Clear form
        document.getElementById('tokenAddress').value = '';
        document.getElementById('liquidationThreshold').value = '';
        
    } catch (error) {
        console.error('Error adding token:', error);
        showToast('Failed to add token', 'error');
    } finally {
        showLoading(false);
    }
}

// Utility functions
async function updateAllUserData() {
    if (!isConnected) return;
    
    try {
        await Promise.allSettled([
            loadProfileData(),
            loadCollateralData(),
            loadCreditData(),
            loadLoanData()
        ]);
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

function getTokenSymbol(tokenAddress) {
    const symbols = {
        '0x0000000000000000000000000000000000000000': 'ETH',
        [MOCK_TOKENS.USDC]: 'USDC',
        [MOCK_TOKENS.WBTC]: 'WBTC'
    };
    return symbols[tokenAddress] || 'UNKNOWN';
}

function formatTokenAmount(amount, tokenAddress) {
    try {
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            return ethers.utils.formatEther(amount);
        } else if (tokenAddress === MOCK_TOKENS.USDC) {
            return ethers.utils.formatUnits(amount, 6);
        } else if (tokenAddress === MOCK_TOKENS.WBTC) {
            return ethers.utils.formatUnits(amount, 8);
        } else {
            return ethers.utils.formatEther(amount);
        }
    } catch (error) {
        return '0';
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Auto-refresh data every 30 seconds
setInterval(() => {
    if (isConnected) {
        updateAllUserData();
    }
}, APP_CONFIG.refreshInterval);