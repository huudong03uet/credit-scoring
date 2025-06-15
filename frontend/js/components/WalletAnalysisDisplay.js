// Combined Wallet Analysis Display
import { CreditScoreDisplay } from './CreditScoreDisplay.js';
import { RawDataVisualizer } from './RawDataVisualizer.js';

export class WalletAnalysisDisplay {
  constructor() {
    this.creditScoreDisplay = new CreditScoreDisplay();
    this.rawDataVisualizer = new RawDataVisualizer();
  }

  displayWalletAnalysis(analysisData) {
    const resultsDiv = document.getElementById('import-results');
    
    // Create the combined results container
    resultsDiv.innerHTML = `
      <div class="wallet-analysis-container">
        <div class="analysis-header">
          <h4><i class="fas fa-chart-line"></i> Wallet Analysis Results</h4>
          <div class="analysis-badges">
            ${this.createStatusBadges(analysisData)}
          </div>
        </div>
        
        <div class="analysis-tabs">
          <button class="analysis-tab active" data-tab="credit-score">
            <i class="fas fa-calculator"></i>
            Credit Score
          </button>
          <button class="analysis-tab" data-tab="wallet-data">
            <i class="fas fa-database"></i>
            Wallet Data
          </button>
          <button class="analysis-tab" data-tab="combined">
            <i class="fas fa-chart-pie"></i>
            Combined View
          </button>
        </div>
        
        <div class="analysis-content">
          <div id="credit-score-content" class="analysis-tab-content active">
            <!-- Credit score will be rendered here -->
          </div>
          <div id="wallet-data-content" class="analysis-tab-content">
            <!-- Wallet graph data will be rendered here -->
          </div>
          <div id="combined-content" class="analysis-tab-content">
            <!-- Combined analysis will be rendered here -->
          </div>
        </div>
      </div>
    `;

    resultsDiv.style.display = 'block';
    resultsDiv.classList.add('fadeIn');

    // Setup tab navigation
    this.setupAnalysisTabNavigation();

    // Render the different views
    this.renderCreditScoreView(analysisData.creditScore);
    this.renderWalletDataView(analysisData.walletGraph);
    this.renderCombinedView(analysisData);
  }

  createStatusBadges(analysisData) {
    const badges = [];
    
    if (analysisData.creditScore) {
      badges.push(`<span class="status-badge success">Credit Score Available</span>`);
    } else {
      badges.push(`<span class="status-badge error">Credit Score Failed</span>`);
    }
    
    if (analysisData.walletGraph) {
      badges.push(`<span class="status-badge success">Wallet Data Available</span>`);
    } else {
      badges.push(`<span class="status-badge error">Wallet Data Failed</span>`);
    }
    
    if (analysisData.errors && analysisData.errors.length > 0) {
      badges.push(`<span class="status-badge warning">${analysisData.errors.length} Error(s)</span>`);
    }
    
    return badges.join('');
  }

  setupAnalysisTabNavigation() {
    const tabs = document.querySelectorAll('.analysis-tab');
    const contents = document.querySelectorAll('.analysis-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active states
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-content`).classList.add('active');
      });
    });
  }

  renderCreditScoreView(creditScoreData) {
    const container = document.getElementById('credit-score-content');
    
    if (creditScoreData) {
      // Temporarily replace the results div ID for the credit score display
      const originalId = document.getElementById('import-results').id;
      document.getElementById('import-results').id = 'temp-results';
      container.id = 'import-results';
      
      this.creditScoreDisplay.displayCreditScoreResults(creditScoreData);
      
      // Restore the original ID
      container.id = 'credit-score-content';
      document.getElementById('temp-results').id = 'import-results';
    } else {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h5>Credit Score Data Unavailable</h5>
          <p>Unable to retrieve credit score data from the API.</p>
          <div class="error-actions">
            <button class="retry-btn" onclick="location.reload()">
              <i class="fas fa-redo"></i>
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  renderWalletDataView(walletGraphData) {
    const container = document.getElementById('wallet-data-content');
    
    if (walletGraphData) {
      // Temporarily replace the results div ID for the raw data visualizer
      const originalId = document.getElementById('import-results').id;
      document.getElementById('import-results').id = 'temp-results';
      container.id = 'import-results';
      
      this.rawDataVisualizer.displayRawData(walletGraphData);
      
      // Restore the original ID
      container.id = 'wallet-data-content';
      document.getElementById('temp-results').id = 'import-results';
    } else {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-database"></i>
          <h5>Wallet Graph Data Unavailable</h5>
          <p>Unable to retrieve wallet transaction data from the API.</p>
          <div class="error-actions">
            <button class="retry-btn" onclick="location.reload()">
              <i class="fas fa-redo"></i>
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  renderCombinedView(analysisData) {
    const container = document.getElementById('combined-content');
    const { creditScore, walletGraph, errors, walletAddress } = analysisData;
    
    container.innerHTML = `
      <div class="combined-analysis">
        <div class="combined-header">
          <h5><i class="fas fa-wallet"></i> Wallet: ${walletAddress}</h5>
          <div class="data-availability">
            <div class="availability-item ${creditScore ? 'available' : 'unavailable'}">
              <i class="fas ${creditScore ? 'fa-check-circle' : 'fa-times-circle'}"></i>
              <span>Credit Score API</span>
            </div>
            <div class="availability-item ${walletGraph ? 'available' : 'unavailable'}">
              <i class="fas ${walletGraph ? 'fa-check-circle' : 'fa-times-circle'}"></i>
              <span>Wallet Graph API</span>
            </div>
          </div>
        </div>

        ${this.renderCombinedSummary(creditScore, walletGraph)}
        ${this.renderErrorSummary(errors)}
        ${this.renderQuickActions()}
      </div>
    `;
  }

  renderCombinedSummary(creditScore, walletGraph) {
    if (!creditScore && !walletGraph) {
      return `
        <div class="combined-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h6>No Data Available</h6>
          <p>Both APIs failed to return data. Please check the API servers and try again.</p>
        </div>
      `;
    }

    return `
      <div class="combined-summary">
        <div class="summary-grid">
          ${creditScore ? `
            <div class="summary-card">
              <h6><i class="fas fa-star"></i> Credit Score</h6>
              <div class="score-display">
                <span class="score-value">${creditScore.score?.toFixed(1) || 'N/A'}</span>
                <span class="score-status">${creditScore.status || 'Unknown'}</span>
              </div>
              <p class="score-explanation">${creditScore.explanation ? creditScore.explanation.substring(0, 100) + '...' : 'No explanation available'}</p>
            </div>
          ` : ''}
          
          ${walletGraph ? `
            <div class="summary-card">
              <h6><i class="fas fa-chart-line"></i> Transaction Activity</h6>
              <div class="activity-stats">
                <div class="stat">
                  <span class="stat-label">Total Events:</span>
                  <span class="stat-value">${walletGraph.lending_events?.length || 0}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Contracts:</span>
                  <span class="stat-value">${walletGraph.contracts?.length || 0}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Projects:</span>
                  <span class="stat-value">${walletGraph.projects?.length || 0}</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderErrorSummary(errors) {
    if (!errors || errors.length === 0) return '';

    return `
      <div class="error-summary">
        <h6><i class="fas fa-exclamation-triangle"></i> Errors Encountered</h6>
        <ul class="error-list">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderQuickActions() {
    return `
      <div class="quick-actions">
        <h6><i class="fas fa-bolt"></i> Quick Actions</h6>
        <div class="action-buttons">
          <button class="action-btn" onclick="location.reload()">
            <i class="fas fa-redo"></i>
            Retry Analysis
          </button>
          <button class="action-btn" onclick="window.open('/credit-score-demo.html', '_blank')">
            <i class="fas fa-external-link-alt"></i>
            Test Credit Score API
          </button>
          <button class="action-btn" onclick="window.open('/raw-data-demo.html', '_blank')">
            <i class="fas fa-external-link-alt"></i>
            Test Wallet Graph API
          </button>
        </div>
      </div>
    `;
  }

  cleanup() {
    this.creditScoreDisplay.cleanup();
    this.rawDataVisualizer.cleanup();
  }
}
