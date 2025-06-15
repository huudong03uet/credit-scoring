// Credit Score Calculator Results Display with Error Tolerance
export class CreditScoreDisplay {
  constructor() {
    this.chartInstances = [];
  }

  // Utility methods for safe data access
  safeGet(obj, path, defaultValue = null) {
    try {
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        if (result === null || result === undefined || !(key in result)) {
          return defaultValue;
        }
        result = result[key];
      }
      return result !== null && result !== undefined ? result : defaultValue;
    } catch (error) {
      console.warn(`Safe get failed for path "${path}":`, error);
      return defaultValue;
    }
  }

  safeArray(arr, defaultValue = []) {
    return Array.isArray(arr) ? arr : defaultValue;
  }

  safeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  safeString(value, defaultValue = '') {
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : defaultValue;
  }

  validateScoreData(scoreData) {
    if (!scoreData || typeof scoreData !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid or missing score data'],
        sanitized: this.getEmptyScoreData()
      };
    }

    const errors = [];
    const sanitized = {
      status: this.safeString(scoreData.status, 'unknown'),
      score: this.safeNumber(scoreData.score, 0),
      explanation: this.safeString(scoreData.explanation, 'No explanation available'),
      processing_time: this.safeString(scoreData.processing_time, null),
      tokens_used: this.safeNumber(scoreData.tokens_used, null),
      error_message: this.safeString(scoreData.error_message, null),
      nodes: this.safeArray(scoreData.nodes),
      edges: this.safeArray(scoreData.edges)
    };

    // Validate nodes array
    if (sanitized.nodes.length > 0) {
      sanitized.nodes = sanitized.nodes.filter(node => {
        if (!node || typeof node !== 'object') {
          errors.push('Invalid node data found');
          return false;
        }
        return true;
      }).map(node => ({
        numberOfDailyActiveUsers: this.safeNumber(node.numberOfDailyActiveUsers, 0),
        address: this.safeString(node.address, 'Unknown'),
        chainId: this.safeString(node.chainId, '0x1'),
        numberOfDailyCalls: this.safeNumber(node.numberOfDailyCalls, 0),
        id: this.safeString(node.id, node.address || 'unknown'),
        tags: this.safeArray(node.tags).filter(tag => typeof tag === 'string')
      }));
    }

    // Validate edges array
    if (sanitized.edges.length > 0) {
      sanitized.edges = sanitized.edges.filter(edge => {
        if (!edge || typeof edge !== 'object') {
          errors.push('Invalid edge data found');
          return false;
        }
        return true;
      }).map(edge => ({
        amount: this.safeNumber(edge.amount, 0),
        _id: this.safeString(edge._id, 'unknown'),
        timestamp: this.safeNumber(edge.timestamp, Date.now() / 1000)
      }));
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  getEmptyScoreData() {
    return {
      status: 'error',
      score: 0,
      explanation: 'No data available',
      processing_time: null,
      tokens_used: null,
      error_message: 'No score data provided',
      nodes: [],
      edges: []
    };
  }
  displayCreditScoreResults(scoreData) {
    const resultsDiv = document.getElementById('import-results');
    
    try {
      console.log('displayCreditScoreResults called with:', scoreData);
      
      // Validate and sanitize the data
      const validation = this.validateScoreData(scoreData);
      const safeData = validation.sanitized;
      
      console.log('Validation result:', validation);
      console.log('Safe data:', safeData);
      
      if (!validation.isValid) {
        console.warn('Score data validation errors:', validation.errors);
      }

      resultsDiv.innerHTML = `
        <div class="credit-score-container">
          <div class="score-header">
            <h4><i class="fas fa-calculator"></i> Credit Score Analysis</h4>
            <span class="score-badge ${safeData.status === 'success' ? 'success' : 'error'}">${safeData.status}</span>
          </div>

          ${validation.errors.length > 0 ? this.renderValidationWarnings(validation.errors) : ''}
          ${this.renderScoreSummary(safeData)}
          ${this.renderExplanation(safeData)}
          ${this.renderNetworkGraph(safeData)}
          ${this.renderTransactionFlow(safeData)}
          ${this.renderDetailedMetrics(safeData)}
        </div>
      `;

      resultsDiv.style.display = 'block';
      resultsDiv.classList.add('fadeIn');

      // Initialize visualizations after DOM is ready with safe data
      setTimeout(() => this.initializeVisualizations(safeData), 100);

    } catch (error) {
      console.error('Error displaying credit score results:', error);
      console.error('Error stack:', error.stack);
      console.error('Input scoreData:', scoreData);
      this.renderErrorFallback(resultsDiv, error);
    }
  }

  renderValidationWarnings(errors) {
    return `
      <div class="validation-warnings">
        <h6><i class="fas fa-exclamation-triangle"></i> Data Quality Warnings</h6>
        <ul>
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderErrorFallback(resultsDiv, error) {
    resultsDiv.innerHTML = `
      <div class="credit-score-container">
        <div class="score-error">
          <h5><i class="fas fa-exclamation-triangle"></i> Display Error</h5>
          <p>Failed to render credit score data: ${error.message}</p>
          <div class="error-actions">
            <button class="retry-btn" onclick="location.reload()">
              <i class="fas fa-redo"></i>
              Retry
            </button>
          </div>
        </div>
      </div>
    `;
    resultsDiv.style.display = 'block';
  }  renderScoreSummary(scoreData) {
    try {
      console.log('Rendering score summary with data:', scoreData);
      
      if (this.safeGet(scoreData, 'status') !== 'success') {
        console.log('Score status is not success:', this.safeGet(scoreData, 'status'));
        return `
          <div class="score-error">
            <h5><i class="fas fa-exclamation-triangle"></i> Calculation Error</h5>
            <p>${this.safeGet(scoreData, 'error_message', 'Unknown error occurred')}</p>
          </div>
        `;
      }

      const score = this.safeNumber(scoreData.score, 0);
      console.log('Score value:', score);
      
      const scoreLevel = this.getScoreLevel(score);
      const scoreColor = this.getScoreColor(score);
      const processingTime = this.safeGet(scoreData, 'processing_time');
      const tokensUsed = this.safeNumber(scoreData.tokens_used);

      console.log('Score rendering data:', { score, scoreLevel, scoreColor, processingTime, tokensUsed });      return `
        <div class="score-summary">
          <div class="main-score">
            <div class="score-circle" style="border-color: ${scoreColor}">
              <div class="score-value" style="color: ${scoreColor}">${score.toFixed(1)}</div>
              <div class="score-label">Credit Score</div>
            </div>
            <div class="score-details">
              <div class="score-level ${scoreLevel.class}">${scoreLevel.label}</div>
              <div class="score-range">${scoreLevel.range}</div>
            </div>
          </div>
          
          ${this.renderScoreBar(score)}
          
          <div class="processing-info">
            ${processingTime ? `
              <div class="info-item">
                <i class="fas fa-clock"></i>
                <span>Processing Time: ${processingTime}</span>
              </div>
            ` : ''}
            ${tokensUsed > 0 ? `
              <div class="info-item">
                <i class="fas fa-microchip"></i>
                <span>Tokens Used: ${tokensUsed}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering score summary:', error);
      console.error('Error stack:', error.stack);
      console.error('Score data that caused error:', scoreData);
      return `
        <div class="score-error">
          <h5><i class="fas fa-exclamation-triangle"></i> Rendering Error</h5>
          <p>Failed to display score summary: ${error.message}</p>
          <p><small>Check console for details</small></p>
        </div>
      `;
    }
  }

  renderScoreBar(score) {
    try {
      // Calculate position on the bar (300-900 range)
      const minScore = 300;
      const maxScore = 900;
      const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
      const position = ((normalizedScore - minScore) / (maxScore - minScore)) * 100;
      
      // Define score ranges with their labels
      const ranges = [
        { label: 'Very Poor', range: '300-400', class: 'very-poor' },
        { label: 'Poor', range: '400-500', class: 'poor' },
        { label: 'Fair', range: '500-600', class: 'fair' },
        { label: 'Good', range: '600-700', class: 'good' },
        { label: 'Very Good', range: '700-800', class: 'very-good' },
        { label: 'Excellent', range: '800-900', class: 'excellent' }
      ];
      
      // Determine which range the current score falls into
      const currentRangeIndex = Math.min(Math.floor((normalizedScore - minScore) / 100), 5);
      
      return `
        <div class="score-bar-container">
          <div class="score-bar-ranges">
            ${ranges.map((range, index) => `
              <div class="score-bar-range ${index === currentRangeIndex ? 'active' : ''}">${range.label}</div>
            `).join('')}
          </div>
          <div class="score-bar">
            <div class="score-indicator" style="left: ${position}%"></div>
          </div>
          <div class="score-bar-labels">
            <span>300</span>
            <span>400</span>
            <span>500</span>
            <span>600</span>
            <span>700</span>
            <span>800</span>
            <span>900</span>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering score bar:', error);
      return '<div class="score-bar-error">Unable to display score bar</div>';
    }
  }

  renderExplanation(scoreData) {
    try {
      const explanation = this.safeGet(scoreData, 'explanation');
      if (!explanation) return '';

      return `
        <div class="explanation-section">
          <h5><i class="fas fa-lightbulb"></i> Score Explanation</h5>
          <div class="explanation-content">
            <p>${explanation}</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering explanation:', error);
      return '';
    }
  }

  renderNetworkGraph(scoreData) {
    try {
      const nodes = this.safeArray(scoreData.nodes);
      const edges = this.safeArray(scoreData.edges);

      if (nodes.length === 0) {
        return `
          <div class="network-section">
            <h5><i class="fas fa-project-diagram"></i> Network Graph</h5>
            <div class="no-data">No network data available</div>
          </div>
        `;
      }

      // Group nodes by address to remove duplicates safely
      const uniqueNodes = {};
      nodes.forEach(node => {
        const address = this.safeGet(node, 'address', 'unknown');
        if (!uniqueNodes[address] && address !== 'unknown') {
          uniqueNodes[address] = {
            address: address,
            numberOfDailyActiveUsers: this.safeNumber(node.numberOfDailyActiveUsers, 1),
            tags: this.safeArray(node.tags)
          };
        }
      });

      const nodeArray = Object.values(uniqueNodes);
      const totalVolume = this.calculateTotalVolume(edges);

      return `
        <div class="network-section">
          <h5><i class="fas fa-project-diagram"></i> Network Graph (${nodeArray.length} unique nodes)</h5>
          
          <div class="network-summary">
            <div class="network-stats">
              <div class="stat-card">
                <div class="stat-value">${nodeArray.length}</div>
                <div class="stat-label">Connected Contracts</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${edges.length}</div>
                <div class="stat-label">Transactions</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${totalVolume}</div>
                <div class="stat-label">Total Volume</div>
              </div>
            </div>
          </div>

          <div class="network-visualization">
            <canvas id="network-graph" width="800" height="400"></canvas>
          </div>

          <div class="nodes-list">
            <h6>Connected Contracts</h6>
            <div class="nodes-grid">
              ${nodeArray.slice(0, 6).map(node => `
                <div class="node-item">
                  <div class="node-address">${this.formatAddress(node.address)}</div>
                  <div class="node-stats">
                    <span class="node-stat">Daily Users: ${node.numberOfDailyActiveUsers}</span>
                    <span class="node-stat">Daily Calls: ${node.numberOfDailyCalls}</span>
                  </div>
                  ${node.tags.length > 0 ? `
                    <div class="node-tags">
                      ${node.tags.slice(0, 2).map(tag => `<span class="node-tag">${tag}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            ${nodeArray.length > 6 ? `<p class="nodes-note">Showing 6 of ${nodeArray.length} contracts</p>` : ''}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering network graph:', error);
      return `
        <div class="network-section">
          <h5><i class="fas fa-project-diagram"></i> Network Graph</h5>
          <div class="render-error">Error displaying network data</div>
        </div>
      `;
    }
  }

  renderTransactionFlow(scoreData) {
    try {
      const edges = this.safeArray(scoreData.edges);

      if (edges.length === 0) {
        return `
          <div class="transactions-section">
            <h5><i class="fas fa-exchange-alt"></i> Transaction Flow</h5>
            <div class="no-data">No transaction data available</div>
          </div>
        `;
      }

      // Sort edges safely
      const sortedEdges = edges
        .filter(edge => edge && typeof edge === 'object')
        .sort((a, b) => this.safeNumber(b.timestamp, 0) - this.safeNumber(a.timestamp, 0));

      return `
        <div class="transactions-section">
          <h5><i class="fas fa-exchange-alt"></i> Transaction Flow (${sortedEdges.length} transactions)</h5>
          
          <div class="transaction-charts">
            <div class="chart-container">
              <h6>Volume Over Time</h6>
              <canvas id="volume-chart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
              <h6>Transaction Distribution</h6>
              <canvas id="distribution-chart" width="400" height="200"></canvas>
            </div>
          </div>

          <div class="transactions-table">
            <h6>Recent Transactions</h6>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                ${sortedEdges.slice(0, 10).map(edge => {
                  const timestamp = this.safeNumber(edge.timestamp, 0);
                  const amount = this.safeNumber(edge.amount, 0);
                  const id = this.safeGet(edge, '_id', 'unknown');
                  
                  return `
                    <tr>
                      <td>${timestamp > 0 ? new Date(timestamp * 1000).toLocaleDateString() : 'Unknown'}</td>
                      <td class="amount">${amount.toLocaleString()}</td>
                      <td class="tx-id">${id}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            ${sortedEdges.length > 10 ? `<p class="table-note">Showing 10 of ${sortedEdges.length} transactions</p>` : ''}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering transaction flow:', error);
      return `
        <div class="transactions-section">
          <h5><i class="fas fa-exchange-alt"></i> Transaction Flow</h5>
          <div class="render-error">Error displaying transaction data</div>
        </div>
      `;
    }
  }

  renderDetailedMetrics(scoreData) {
    try {
      const nodes = this.safeArray(scoreData.nodes);
      const edges = this.safeArray(scoreData.edges);
      
      // Calculate metrics from raw data safely
      const avgDailyUsers = nodes.length > 0 ? 
        nodes.reduce((sum, node) => sum + this.safeNumber(node.numberOfDailyActiveUsers, 0), 0) / nodes.length : 0;
      
      const avgDailyCalls = nodes.length > 0 ? 
        nodes.reduce((sum, node) => sum + this.safeNumber(node.numberOfDailyCalls, 0), 0) / nodes.length : 0;

      const totalVolume = edges.reduce((sum, edge) => sum + this.safeNumber(edge.amount, 0), 0);
      const avgTransactionSize = edges.length > 0 ? totalVolume / edges.length : 0;

      // Get unique tags safely
      const allTags = nodes.flatMap(node => this.safeArray(node.tags))
        .filter(tag => typeof tag === 'string' && tag.length > 0);
      const uniqueTags = [...new Set(allTags)];

      return `
        <div class="metrics-section">
          <h5><i class="fas fa-chart-bar"></i> Detailed Metrics</h5>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <h6>Network Activity</h6>
              <div class="metric-stats">
                <div class="metric-item">
                  <span class="metric-label">Avg Daily Users:</span>
                  <span class="metric-value">${avgDailyUsers.toFixed(1)}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Avg Daily Calls:</span>
                  <span class="metric-value">${avgDailyCalls.toFixed(1)}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Unique Protocols:</span>
                  <span class="metric-value">${uniqueTags.length}</span>
                </div>
              </div>
            </div>

            <div class="metric-card">
              <h6>Transaction Metrics</h6>
              <div class="metric-stats">
                <div class="metric-item">
                  <span class="metric-label">Total Volume:</span>
                  <span class="metric-value">${totalVolume.toLocaleString()}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Avg Transaction:</span>
                  <span class="metric-value">${avgTransactionSize.toLocaleString()}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Transaction Count:</span>
                  <span class="metric-value">${edges.length}</span>
                </div>
              </div>
            </div>

            <div class="metric-card">
              <h6>Protocol Distribution</h6>
              <div class="protocol-tags">
                ${uniqueTags.slice(0, 8).map(tag => `
                  <span class="protocol-tag">${tag}</span>
                `).join('')}
                ${uniqueTags.length === 0 ? '<span class="no-protocols">No protocols identified</span>' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering detailed metrics:', error);
      return `
        <div class="metrics-section">
          <h5><i class="fas fa-chart-bar"></i> Detailed Metrics</h5>
          <div class="render-error">Error displaying metrics data</div>
        </div>
      `;
    }
  }

  initializeVisualizations(scoreData) {
    try {
      const nodes = this.safeArray(scoreData.nodes);
      const edges = this.safeArray(scoreData.edges);
      
      if (nodes.length > 0 || edges.length > 0) {
        this.drawNetworkGraph(nodes, edges);
      }
      
      if (edges.length > 0) {
        this.drawVolumeChart(edges);
        this.drawDistributionChart(edges);
      }
    } catch (error) {
      console.error('Error initializing visualizations:', error);
    }
  }

  drawNetworkGraph(nodes, edges) {
    try {
      const canvas = document.getElementById('network-graph');
      if (!canvas || !Array.isArray(nodes)) return;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Group nodes by address to remove duplicates safely
      const uniqueNodes = {};
      nodes.forEach(node => {
        const address = this.safeGet(node, 'address', 'unknown');
        if (!uniqueNodes[address] && address !== 'unknown') {
          uniqueNodes[address] = {
            address: address,
            numberOfDailyActiveUsers: this.safeNumber(node.numberOfDailyActiveUsers, 1),
            tags: this.safeArray(node.tags)
          };
        }
      });

      const nodeArray = Object.values(uniqueNodes);
      if (nodeArray.length === 0) {
        // Draw "no data" message
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No network data to display', canvas.width / 2, canvas.height / 2);
        return;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 60;

      // Draw connections (simplified)
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      nodeArray.forEach((node, index) => {
        const angle = (index / nodeArray.length) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
      });

      // Draw center node
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outer nodes
      nodeArray.forEach((node, index) => {
        const angle = (index / nodeArray.length) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Node size based on activity (with safe bounds)
        const users = Math.max(1, Math.min(20, node.numberOfDailyActiveUsers));
        const nodeSize = Math.max(5, Math.min(15, users * 2));
        
        const hasCompound = node.tags.some(tag => 
          typeof tag === 'string' && tag.toLowerCase().includes('compound')
        );
        ctx.fillStyle = hasCompound ? '#22c55e' : '#8b5cf6';
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Add labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Wallet', centerX, centerY + 5);

    } catch (error) {
      console.error('Error drawing network graph:', error);
    }
  }

  drawVolumeChart(edges) {
    try {
      const canvas = document.getElementById('volume-chart');
      if (!canvas || !Array.isArray(edges) || edges.length === 0) return;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const validEdges = edges
        .filter(edge => edge && typeof edge === 'object')
        .map(edge => ({
          timestamp: this.safeNumber(edge.timestamp, 0),
          amount: this.safeNumber(edge.amount, 0)
        }))
        .filter(edge => edge.timestamp > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (validEdges.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No valid transaction data', canvas.width / 2, canvas.height / 2);
        return;
      }

      const data = validEdges.map(edge => ({
        x: new Date(edge.timestamp * 1000),
        y: edge.amount
      }));

      this.drawLineChart(ctx, data, 'Volume', '#3b82f6');

    } catch (error) {
      console.error('Error drawing volume chart:', error);
    }
  }

  drawDistributionChart(edges) {
    try {
      const canvas = document.getElementById('distribution-chart');
      if (!canvas || !Array.isArray(edges) || edges.length === 0) return;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Group by amount ranges safely
      const ranges = {
        'Small (0-1000)': 0,
        'Medium (1000-10000)': 0,
        'Large (10000+)': 0
      };

      edges.forEach(edge => {
        const amount = this.safeNumber(edge.amount, 0);
        if (amount < 1000) ranges['Small (0-1000)']++;
        else if (amount < 10000) ranges['Medium (1000-10000)']++;
        else ranges['Large (10000+)']++;
      });

      this.drawPieChart(ctx, ranges);

    } catch (error) {
      console.error('Error drawing distribution chart:', error);
    }
  }

  drawLineChart(ctx, data, label, color) {
    try {
      if (!data || data.length === 0) return;

      const width = ctx.canvas.width - 80;
      const height = ctx.canvas.height - 60;
      const offsetX = 40;
      const offsetY = 30;

      const values = data.map(d => this.safeNumber(d.y, 0));
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const range = maxValue - minValue || 1;

      // Draw axes
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(offsetX, offsetY + height);
      ctx.lineTo(offsetX + width, offsetY + height);
      ctx.stroke();

      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = offsetX + (index / Math.max(1, data.length - 1)) * width;
        const y = offsetY + height - ((this.safeNumber(point.y, 0) - minValue) / range) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

    } catch (error) {
      console.error('Error drawing line chart:', error);
    }
  }

  drawPieChart(ctx, data) {
    try {
      if (!data || Object.keys(data).length === 0) return;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      const centerX = ctx.canvas.width / 2;
      const centerY = ctx.canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 60;

      const total = Object.values(data).reduce((sum, val) => sum + this.safeNumber(val, 0), 0);
      if (total === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No transaction data', centerX, centerY);
        return;
      }

      const colors = ['#3b82f6', '#22c55e', '#f59e0b'];

      let currentAngle = 0;
      Object.entries(data).forEach(([key, value], index) => {
        const numValue = this.safeNumber(value, 0);
        const sliceAngle = (numValue / total) * 2 * Math.PI;
        
        if (sliceAngle > 0) {
          ctx.fillStyle = colors[index % colors.length];
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
          ctx.closePath();
          ctx.fill();

          // Add label
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
          const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${key}: ${numValue}`, labelX, labelY);

          currentAngle += sliceAngle;
        }
      });

    } catch (error) {
      console.error('Error drawing pie chart:', error);
    }
  }

  formatAddress(address) {
    try {
      if (!address || typeof address !== 'string' || address.length < 16) {
        return 'Unknown Address';
      }
      return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
    } catch (error) {
      return 'Unknown Address';
    }
  }

  calculateTotalVolume(edges) {
    try {
      if (!Array.isArray(edges)) return '0';
      const total = edges.reduce((sum, edge) => sum + this.safeNumber(edge.amount, 0), 0);
      return total.toLocaleString();
    } catch (error) {
      return '0';
    }
  }

  cleanup() {
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances = [];
  }

  getScoreLevel(score) {
    try {
      if (score >= 800) {
        return { label: 'Excellent', class: 'excellent', range: '800-900' };
      } else if (score >= 700) {
        return { label: 'Very Good', class: 'very-good', range: '700-799' };
      } else if (score >= 600) {
        return { label: 'Good', class: 'good', range: '600-699' };
      } else if (score >= 500) {
        return { label: 'Fair', class: 'fair', range: '500-599' };
      }
      else if (score >= 400) {
        return { label: 'Poor', class: 'poor', range: '400-499' };
      } else {
        return { label: 'Very Poor', class: 'very-poor', range: '300-399' };
      }
    } catch (error) {
      console.error('Error determining score level:', error);
      return { label: 'Unknown', class: 'unknown', range: 'N/A' };
    }
  }
  //   --very-poor: #ff4d4f;
  // --poor: #ff7a45;
  // --fair: #9254de;
  // --good: #4f7df9;
  // --very-good: #2b8def;
  // --excellent: #36cfc9;

  getScoreColor(score) {
    try {
      if (score >= 800) {
        return '#36cfc9'; // Excellent
      } else if (score >= 700) {
        return '#2b8def'; // Very Good
      }
      else if (score >= 600) {
        return '#4f7df9'; // Good
      } else if (score >= 500) {
        return '#9254de'; // Fair
      } else if (score >= 400) {
        return '#ff7a45'; // Poor
      } else {
        return '#ff4d4f'; // Very Poor
      }
      

    } catch (error) {
      console.error('Error determining score color:', error);
      return '#9e9e9e'; // Gray fallback
    }
  }
}
