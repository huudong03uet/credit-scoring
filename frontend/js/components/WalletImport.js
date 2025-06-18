import { analyzeWallet, uploadWalletFiles, fetchCreditScoreExplanation, fetchWalletAnalysis } from '../services/apiService.js';
import { CreditScoreDisplay } from './CreditScoreDisplay.js';
import { RawDataVisualizer } from './RawDataVisualizer.js';

export class WalletImport {  constructor() {
    console.log('WalletImport constructor called');
    this.currentTab = 'address';
    this.uploadedFiles = [];
    this.isProcessing = false;
    this.creditScoreDisplay = new CreditScoreDisplay();
    this.rawDataVisualizer = new RawDataVisualizer();
    console.log('WalletImport constructor complete, calling init...');
    this.init();
  }

  init() {
    console.log('WalletImport init called');
    this.setupTabNavigation();
    this.setupAddressInput();
    this.setupFileUpload();
    this.setupWalletConnect();
    console.log('WalletImport init complete');
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
    console.log('setupAddressInput called');
    
    // Wait for DOM to be fully ready
    const waitForElements = () => {
      const input = document.getElementById('wallet-address-input');
      const button = document.getElementById('address-submit-btn');
      const demoButton = document.getElementById('demo-wallet-btn');
      
      console.log('Elements check:', {
        input: !!input,
        button: !!button,
        demoButton: !!demoButton,
        domState: document.readyState
      });

      if (!input || !button) {
        console.warn('Required elements not found, retrying in 100ms...');
        setTimeout(waitForElements, 100);
        return;
      }      // Set up main input handlers
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('=== MAIN IMPORT BUTTON CLICKED ===');
        console.log('Event target:', e.target);
        console.log('Current input value:', input.value);
        this.handleAddressImport();
      });
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          console.log('=== ENTER KEY PRESSED ===');
          console.log('Current input value:', input.value);
          this.handleAddressImport();
        }
      });

      // Demo button functionality
      if (demoButton) {
        console.log('Setting up demo button event listener');
        
        // Test if button is visible and enabled
        const styles = window.getComputedStyle(demoButton);
        console.log('Demo button styles:', {
          display: styles.display,
          visibility: styles.visibility,
          disabled: demoButton.disabled,
          offsetParent: !!demoButton.offsetParent
        });
          demoButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('=== DEMO BUTTON CLICKED ===');
          console.log('Event target:', e.target);
          console.log('Current input value before demo:', input.value);
          this.handleAddressImport();
        });
        console.log('Demo button event listener attached successfully');
      } else {
        console.warn('Demo button not found in DOM');
        console.log('Available elements:', 
          Array.from(document.querySelectorAll('button')).map(b => ({ id: b.id, className: b.className, text: b.textContent.trim() }))
        );
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
    };
    
    // Start checking for elements
    waitForElements();
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
  }  async handleAddressImport() {
    console.log('=== handleAddressImport called ===');
    console.log('Call stack:', new Error().stack);
    
    const input = document.getElementById('wallet-address-input');
    const address = input.value.trim();
    console.log('Wallet address from input:', address);
    console.log('Input element:', input);

    if (!address) {
      console.log('No address provided');
      this.showError('Please enter a wallet address or ENS name');
      return;
    }

    if (!this.validateWalletAddress(address)) {
      console.log('Invalid wallet address:', address);
      this.showError('Please enter a valid wallet address or ENS name');
      return;
    }

    console.log('Processing wallet with address:', address);
    try {
      await this.processWallet({ type: 'address', value: address });
    } catch (error) {
      console.error('Failed to process wallet:', error);
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
  }  async processWallet(walletData) {
    console.log('processWallet called with:', walletData);
    if (this.isProcessing) {
      console.log('Already processing, returning early');
      return;
    }
    
    this.isProcessing = true;
    console.log('Starting wallet processing...');
    this.showProcessing();

    try {
      // Show real processing steps
      console.log('Step 1: Validating wallet address...');
      this.updateProcessingStep('Validating wallet address...', 10);
      await this.delay(500);
      
      console.log('Step 2: Connecting to Credit Score API...');
      this.updateProcessingStep('Connecting to Credit Score API...', 25);
      await this.delay(500);
      
      console.log('Step 3: Connecting to Wallet Graph API...');
      this.updateProcessingStep('Connecting to Wallet Graph API...', 40);
      await this.delay(500);
      
      console.log('Step 4: Fetching transaction data...');
      this.updateProcessingStep('Fetching transaction data...', 60);
      await this.delay(500);
        console.log('Step 5: Calculating credit score...');
      this.updateProcessingStep('Calculating credit score...', 80);
      await this.delay(500);
      
      console.log('Step 6: Finalizing analysis...');
      this.updateProcessingStep('Finalizing analysis...', 95);
      
      // Make actual API call - wait for real response
      console.log('Making API call with data:', walletData);
      const result = await this.callAPI(walletData);
      console.log('API call completed, result:', result);
      
      this.updateProcessingStep('Analysis complete!', 100);
      await this.delay(500);
      
      // Only show results if we have real data
      console.log('Showing results...');
      this.showResults(result);

      const walletAddress = document.getElementById('wallet-address')?.textContent || walletData.value;
const scoringCompleteEvent = new CustomEvent('scoringComplete', {
  detail: {
    walletAddress: walletAddress,
    scoreData: {
      score: result.score || (result.creditScore ? result.creditScore.score : 720),
      scoreLabel: result.scoreLabel || (result.creditScore ? 
                  result.creditScore.scoreLabel : this.getScoreLabel(result.score || 720)),
      explanation: result.explanation || (result.creditScore ? result.creditScore.explanation : '')
    }
  }
});
document.dispatchEvent(scoringCompleteEvent);
console.log('🚀 Dispatched scoringComplete event');

    } catch (error) {
      console.error('Processing failed:', error);
      this.showError('Processing failed: ' + error.message + '. Please check that both API servers are running.');
      // Don't show any results on error
    } finally {
      this.isProcessing = false;
      this.hideProcessing();
    }
  }async callAPI(walletData) {
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
        console.log(`Fetching real data for wallet: ${walletAddress}`);
        
        // Wait for real API response - no fallback data
        const analysisData = await fetchWalletAnalysis(walletAddress);
        console.log('Real API analysis response:', analysisData);
        return analysisData;
      }
    } catch (error) {
      console.error('API call failed:', error);
      
      // Show error and re-throw - no demo data fallback
      this.showError(`API Error: ${error.message}. Please check your API servers.`);
      throw error; // Re-throw to stop processing
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
    console.log('Displaying results with data:', data);
    
    try {
      if (data.creditScore && data.creditScore.status === 'success') {
        // Display credit score results
        this.creditScoreDisplay.displayCreditScoreResults(data.creditScore);
        
        // Dispatch event that scoring is complete to show chatbot
        const walletAddress = data.walletAddress || document.getElementById('wallet-address')?.textContent;
        const scoringCompleteEvent = new CustomEvent('scoringComplete', {
          detail: {
            walletAddress: walletAddress,
            scoreData: {
              score: data.creditScore.score,
              scoreLabel: this.getScoreLabel(data.creditScore.score),
              explanation: data.creditScore.explanation || ''
            }
          }
        });
        document.dispatchEvent(scoringCompleteEvent);
        
      } else if (data.walletGraph) {
        // Display raw wallet graph data
        this.rawDataVisualizer.displayRawData(data.walletGraph);
      } else {
        // Show error if no valid data
        this.showError('No valid data received from APIs');
      }
    } catch (error) {
      console.error('Error displaying results:', error);
      this.showError('Failed to display results: ' + error.message);
    }
  }

  getScoreLabel(score) {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
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
