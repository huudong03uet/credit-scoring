import { analyzeWallet, uploadWalletFiles, fetchCreditScoreExplanation, fetchWalletAnalysis } from '../services/apiService.js';
import { WalletAnalysisDisplay } from './WalletAnalysisDisplay.js';

export class WalletImport {
  constructor() {
    this.currentTab = 'address';
    this.uploadedFiles = [];
    this.isProcessing = false;
    this.walletAnalysisDisplay = new WalletAnalysisDisplay();
    this.init();
  }

  init() {
    this.setupTabNavigation();
    this.setupAddressInput();
    this.setupFileUpload();
    this.setupWalletConnect();
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.import-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active states
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        this.currentTab = targetTab;
      });
    });  }
  
  setupAddressInput() {
    const input = document.getElementById('wallet-address-input');
    const button = document.getElementById('address-submit-btn');
    const demoButton = document.getElementById('demo-wallet-btn');

    if (!input || !button) {
      console.warn('Address input elements not found');
      return;
    }

    button.addEventListener('click', () => this.handleAddressImport());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddressImport();
    });

    // Demo button functionality
    if (demoButton) {
      demoButton.addEventListener('click', () => {
        // Use the wallet address from your API example
        const demoAddress = '0x57ef012861c4937a76b5d6061be800199a2b9100';
        input.value = demoAddress;
        this.handleAddressImport();
      });
    }

    // Real-time validation
    input.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      const inputGroup = input.parentElement;
      
      if (value) {
        const isValid = this.validateWalletAddress(value);
        if (inputGroup) {
          inputGroup.style.borderColor = isValid ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        button.disabled = !isValid;
      } else {
        if (inputGroup) {
          inputGroup.style.borderColor = 'var(--border-color)';
        }
        button.disabled = false;
      }
    });
  }
  setupFileUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('wallet-file-input');
    const submitBtn = document.getElementById('file-submit-btn');

    if (!uploadZone || !fileInput) {
      console.warn('File upload elements not found');
      return;
    }

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Submit files
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleFileImport());
    }
  }

  setupWalletConnect() {
    const connectButtons = {
      'metamask-connect': () => this.connectMetaMask(),
      'walletconnect-connect': () => this.connectWalletConnect(),
      'coinbase-connect': () => this.connectCoinbase()
    };

    Object.entries(connectButtons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });
  }
  validateWalletAddress(address) {
    // Ethereum address validation
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true;
    
    // ENS name validation (basic)
    if (/^[a-zA-Z0-9-]+\.eth$/.test(address)) return true;
    
    return false;
  }

  async handleAddressImport() {
    const input = document.getElementById('wallet-address-input');
    const address = input.value.trim();

    if (!address) {
      this.showError('Please enter a wallet address or ENS name');
      return;
    }

    if (!this.validateWalletAddress(address)) {
      this.showError('Please enter a valid wallet address or ENS name');
      return;
    }

    try {
      await this.processWallet({ type: 'address', value: address });
    } catch (error) {
      this.showError('Failed to process wallet: ' + error.message);
    }
  }

  // Add a demo function to test with the provided wallet
  async testWithDemoWallet() {
    const demoAddress = '0xd0f10060e182c8eb8fa0a4fa4d77adf0e0475261';
    const input = document.getElementById('wallet-address-input');
    input.value = demoAddress;
    await this.handleAddressImport();
  }
  handleFiles(files) {
    const fileList = document.getElementById('file-list');
    const submitBtn = document.getElementById('file-submit-btn');

    if (!fileList || !submitBtn) {
      console.warn('File list elements not found');
      return;
    }

    Array.from(files).forEach(file => {
      if (this.validateFile(file)) {
        this.uploadedFiles.push(file);
        this.addFileToList(file);
      }
    });

    if (this.uploadedFiles.length > 0) {
      submitBtn.style.display = 'block';
    }
  }

  validateFile(file) {
    const validTypes = ['application/json', 'text/csv', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(json|csv|txt)$/i)) {
      this.showError('Invalid file type. Please upload JSON, CSV, or TXT files.');
      return false;
    }

    if (file.size > maxSize) {
      this.showError('File too large. Maximum size is 10MB.');
      return false;
    }

    return true;
  }
  addFileToList(file) {
    const fileList = document.getElementById('file-list');
    if (!fileList) {
      console.warn('File list element not found');
      return;
    }

    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <i class="fas fa-file-alt file-icon"></i>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="file-remove" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    fileList.appendChild(fileItem);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async handleFileImport() {
    if (this.uploadedFiles.length === 0) {
      this.showError('Please select files to upload');
      return;
    }

    try {
      await this.processWallet({ type: 'files', value: this.uploadedFiles });
    } catch (error) {
      this.showError('Failed to process files: ' + error.message);
    }
  }

  async connectMetaMask() {
    if (typeof window.ethereum === 'undefined') {
      this.showError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await this.processWallet({ type: 'metamask', value: accounts[0] });
      }
    } catch (error) {
      this.showError('Failed to connect MetaMask: ' + error.message);
    }
  }

  async connectWalletConnect() {
    this.showError('WalletConnect integration coming soon!');
  }

  async connectCoinbase() {
    this.showError('Coinbase Wallet integration coming soon!');
  }

  async processWallet(walletData) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.showProcessing();

    try {
      // Simulate processing steps
      const steps = [
        'Validating wallet data...',
        'Analyzing transaction history...',
        'Calculating credit metrics...',
        'Generating risk assessment...',
        'Finalizing score...'
      ];

      for (let i = 0; i < steps.length; i++) {
        this.updateProcessingStep(steps[i], (i + 1) * 20);
        await this.delay(1000);
      }

      // Make actual API call
      const result = await this.callAPI(walletData);
      this.showResults(result);

    } catch (error) {
      this.showError('Processing failed: ' + error.message);
    } finally {
      this.isProcessing = false;
      this.hideProcessing();
    }
  }  async callAPI(walletData) {
    try {
      console.log('Calling API with wallet data:', walletData);
      
      if (walletData.type === 'files') {
        // For file uploads, we still use the upload API
        const rawData = await uploadWalletFiles(walletData.value);
        console.log('Raw file upload response:', rawData);
        return {
          walletAddress: 'uploaded-files',
          walletGraph: rawData,
          creditScore: null,
          errors: []
        };
      } else {
        // For address input, use the combined analysis function
        const walletAddress = walletData.value;
        const analysisData = await fetchWalletAnalysis(walletAddress);
        console.log('Combined analysis response:', analysisData);
        return analysisData;
      }
    } catch (error) {
      console.error('API call failed:', error);
      
      // Show error message but also provide fallback
      this.showError(`API Error: ${error.message}. Showing demo data instead.`);
      
      // Return mock data based on your actual API structure
      return {
        walletAddress: walletData.value || 'demo-wallet',
        walletId: `0x1_${walletData.value || '0x57ef012861c4937a76b5d6061be800199a2b9100'}`,
        walletGraph: {
          wallets: [{
            address: walletData.value || "0x57ef012861c4937a76b5d6061be800199a2b9100",
            chainId: "0x1",
            balanceInUSD: 59.89498226995428,
            borrowInUSD: 1.5158480089915103,
            depositInUSD: 0.3616197511402248,
            numberOfLiquidation: 0,
            totalValueOfLiquidation: 0
          }],
          lending_events: [
            {
              _id: "9547741_170",
              amount: 4,
              block_timestamp: 1582568321,
              contract_address: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
              event_type: "DEPOSIT",
              wallet: walletData.value || "0x57ef012861c4937a76b5d6061be800199a2b9100"
            }
          ],
          contracts: [
            {
              _id: "0x1_0x39aa39c021dfbae8fac545936693ac917d5e7563",
              address: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
              tags: ["compound-usd-coin", "token", "compound-finance"],
              numberOfDailyCalls: 30,
              numberOfDailyActiveUsers: 30
            }
          ],
          projects: [],
          twitter_users: [],
          tweets: []
        },
        creditScore: {
          status: "success",
          explanation: "Demo credit score explanation. This wallet shows average credit behavior with some positive lending activities.",
          processing_time: "1.2s",
          tokens_used: 150,
          nodes: [
            {
              numberOfDailyActiveUsers: 4,
              address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1",
              chainId: "0x1",
              numberOfDailyCalls: 4,
              tags: ["token", "compound"]
            }
          ],
          edges: [
            { amount: 22.1377, _id: "8012768_93", timestamp: 1561272103 },
            { amount: 15663, _id: "7906376_112", timestamp: 1559833296 }
          ],
          score: 679.3870372065838
        },
        errors: [`Demo data shown due to API error: ${error.message}`]
      };
    }
  }
  showProcessing() {
    const processingContainer = document.getElementById('processing-container');
    const resultsContainer = document.getElementById('import-results');
    
    if (processingContainer) {
      processingContainer.style.display = 'block';
    }
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
  }

  hideProcessing() {
    const processingContainer = document.getElementById('processing-container');
    if (processingContainer) {
      processingContainer.style.display = 'none';
    }
  }

  updateProcessingStep(step, progress) {
    const stepElement = document.getElementById('processing-step');
    const progressFill = document.getElementById('progress-fill');
    
    if (stepElement) {
      stepElement.textContent = step;
    }
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }  showResults(data) {
    // Use the combined wallet analysis display
    this.walletAnalysisDisplay.displayWalletAnalysis(data);
  }

  showError(message) {
    // Create a temporary error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-red);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      ${message}
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WalletImport();
});
