// Credit Score Calculator Results Display
export class CreditScoreDisplay {
  constructor() {
    this.chartInstances = [];
  }

  displayCreditScoreResults(scoreData) {
    const resultsDiv = document.getElementById('import-results');
    
    resultsDiv.innerHTML = `
      <div class="credit-score-container">
        <div class="score-header">
          <h4><i class="fas fa-calculator"></i> Credit Score Analysis</h4>
          <span class="score-badge">${scoreData.status === 'success' ? 'Success' : 'Error'}</span>
        </div>

        ${this.renderScoreSummary(scoreData)}
        ${this.renderExplanation(scoreData)}
        ${this.renderNetworkGraph(scoreData)}
        ${this.renderTransactionFlow(scoreData)}
        ${this.renderDetailedMetrics(scoreData)}
      </div>
    `;

    resultsDiv.style.display = 'block';
    resultsDiv.classList.add('fadeIn');

    // Initialize visualizations after DOM is ready
    setTimeout(() => this.initializeVisualizations(scoreData), 100);
  }

  renderScoreSummary(scoreData) {
    if (scoreData.status !== 'success') {
      return `
        <div class="score-error">
          <h5><i class="fas fa-exclamation-triangle"></i> Calculation Error</h5>
          <p>${scoreData.error_message || 'Unknown error occurred'}</p>
        </div>
      `;
    }

    const score = scoreData.score || 0;
    const scoreLevel = this.getScoreLevel(score);
    const scoreColor = this.getScoreColor(score);

    return `
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
        
        <div class="processing-info">
          ${scoreData.processing_time ? `
            <div class="info-item">
              <i class="fas fa-clock"></i>
              <span>Processing Time: ${scoreData.processing_time}</span>
            </div>
          ` : ''}
          ${scoreData.tokens_used ? `
            <div class="info-item">
              <i class="fas fa-microchip"></i>
              <span>Tokens Used: ${scoreData.tokens_used}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderExplanation(scoreData) {
    if (!scoreData.explanation) return '';

    return `
      <div class="explanation-section">
        <h5><i class="fas fa-lightbulb"></i> Score Explanation</h5>
        <div class="explanation-content">
          <p>${scoreData.explanation}</p>
        </div>
      </div>
    `;
  }

  renderNetworkGraph(scoreData) {
    if (!scoreData.nodes || scoreData.nodes.length === 0) {
      return '<div class="no-data">No network data available</div>';
    }

    // Group nodes by address to remove duplicates
    const uniqueNodes = {};
    scoreData.nodes.forEach(node => {
      if (!uniqueNodes[node.address]) {
        uniqueNodes[node.address] = node;
      }
    });

    const nodes = Object.values(uniqueNodes);

    return `
      <div class="network-section">
        <h5><i class="fas fa-project-diagram"></i> Network Graph (${nodes.length} unique nodes)</h5>
        
        <div class="network-summary">
          <div class="network-stats">
            <div class="stat-card">
              <div class="stat-value">${nodes.length}</div>
              <div class="stat-label">Connected Contracts</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${scoreData.edges?.length || 0}</div>
              <div class="stat-label">Transactions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.calculateTotalVolume(scoreData.edges)}</div>
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
            ${nodes.slice(0, 6).map(node => `
              <div class="node-item">
                <div class="node-address">${node.address.substring(0, 10)}...${node.address.substring(node.address.length - 8)}</div>
                <div class="node-stats">
                  <span class="node-stat">Daily Users: ${node.numberOfDailyActiveUsers || 0}</span>
                  <span class="node-stat">Daily Calls: ${node.numberOfDailyCalls || 0}</span>
                </div>
                ${node.tags ? `
                  <div class="node-tags">
                    ${node.tags.slice(0, 2).map(tag => `<span class="node-tag">${tag}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          ${nodes.length > 6 ? `<p class="nodes-note">Showing 6 of ${nodes.length} contracts</p>` : ''}
        </div>
      </div>
    `;
  }

  renderTransactionFlow(scoreData) {
    if (!scoreData.edges || scoreData.edges.length === 0) {
      return '<div class="no-data">No transaction data available</div>';
    }

    const edges = scoreData.edges.sort((a, b) => b.timestamp - a.timestamp);

    return `
      <div class="transactions-section">
        <h5><i class="fas fa-exchange-alt"></i> Transaction Flow (${edges.length} transactions)</h5>
        
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
              ${edges.slice(0, 10).map(edge => `
                <tr>
                  <td>${new Date(edge.timestamp * 1000).toLocaleDateString()}</td>
                  <td class="amount">${edge.amount?.toLocaleString() || 'N/A'}</td>
                  <td class="tx-id">${edge._id}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${edges.length > 10 ? `<p class="table-note">Showing 10 of ${edges.length} transactions</p>` : ''}
        </div>
      </div>
    `;
  }

  renderDetailedMetrics(scoreData) {
    const nodes = scoreData.nodes || [];
    const edges = scoreData.edges || [];
    
    // Calculate metrics from raw data
    const avgDailyUsers = nodes.length > 0 ? 
      nodes.reduce((sum, node) => sum + (node.numberOfDailyActiveUsers || 0), 0) / nodes.length : 0;
    
    const avgDailyCalls = nodes.length > 0 ? 
      nodes.reduce((sum, node) => sum + (node.numberOfDailyCalls || 0), 0) / nodes.length : 0;

    const totalVolume = edges.reduce((sum, edge) => sum + (edge.amount || 0), 0);
    const avgTransactionSize = edges.length > 0 ? totalVolume / edges.length : 0;

    // Get unique tags
    const allTags = nodes.flatMap(node => node.tags || []);
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
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initializeVisualizations(scoreData) {
    this.drawNetworkGraph(scoreData.nodes, scoreData.edges);
    this.drawVolumeChart(scoreData.edges);
    this.drawDistributionChart(scoreData.edges);
  }

  drawNetworkGraph(nodes, edges) {
    const canvas = document.getElementById('network-graph');
    if (!canvas || !nodes) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Group nodes by address to remove duplicates
    const uniqueNodes = {};
    nodes.forEach(node => {
      if (!uniqueNodes[node.address]) {
        uniqueNodes[node.address] = node;
      }
    });

    const nodeArray = Object.values(uniqueNodes);
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
      
      // Node size based on activity
      const nodeSize = Math.max(5, Math.min(15, (node.numberOfDailyActiveUsers || 1) * 2));
      
      ctx.fillStyle = node.tags?.includes('compound') ? '#22c55e' : '#8b5cf6';
      ctx.beginPath();
      ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Add labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wallet', centerX, centerY + 5);
  }

  drawVolumeChart(edges) {
    const canvas = document.getElementById('volume-chart');
    if (!canvas || !edges) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sortedEdges = edges.sort((a, b) => a.timestamp - b.timestamp);
    const data = sortedEdges.map(edge => ({
      x: new Date(edge.timestamp * 1000),
      y: edge.amount || 0
    }));

    this.drawLineChart(ctx, data, 'Volume', '#3b82f6');
  }

  drawDistributionChart(edges) {
    const canvas = document.getElementById('distribution-chart');
    if (!canvas || !edges) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Group by amount ranges
    const ranges = {
      'Small (0-1000)': 0,
      'Medium (1000-10000)': 0,
      'Large (10000+)': 0
    };

    edges.forEach(edge => {
      const amount = edge.amount || 0;
      if (amount < 1000) ranges['Small (0-1000)']++;
      else if (amount < 10000) ranges['Medium (1000-10000)']++;
      else ranges['Large (10000+)']++;
    });

    this.drawPieChart(ctx, ranges);
  }

  drawLineChart(ctx, data, label, color) {
    if (!data || data.length === 0) return;

    const width = ctx.canvas.width - 80;
    const height = ctx.canvas.height - 60;
    const offsetX = 40;
    const offsetY = 30;

    const values = data.map(d => d.y);
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
      const x = offsetX + (index / (data.length - 1)) * width;
      const y = offsetY + height - ((point.y - minValue) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  drawPieChart(ctx, data) {
    if (!data || Object.keys(data).length === 0) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 60;

    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const colors = ['#3b82f6', '#22c55e', '#f59e0b'];

    let currentAngle = 0;
    Object.entries(data).forEach(([key, value], index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
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
      ctx.fillText(`${key}: ${value}`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }

  getScoreLevel(score) {
    if (score >= 750) return { label: 'Excellent', class: 'excellent', range: '750-900' };
    if (score >= 650) return { label: 'Very Good', class: 'very-good', range: '650-749' };
    if (score >= 560) return { label: 'Good', class: 'good', range: '560-649' };
    if (score >= 500) return { label: 'Fair', class: 'fair', range: '500-559' };
    if (score >= 300) return { label: 'Poor', class: 'poor', range: '300-499' };
    return { label: 'Very Poor', class: 'very-poor', range: '0-299' };
  }

  getScoreColor(score) {
    if (score >= 750) return 'var(--excellent)';
    if (score >= 650) return 'var(--very-good)';
    if (score >= 560) return 'var(--good)';
    if (score >= 500) return 'var(--fair)';
    if (score >= 300) return 'var(--poor)';
    return 'var(--very-poor)';
  }

  calculateTotalVolume(edges) {
    if (!edges) return '0';
    const total = edges.reduce((sum, edge) => sum + (edge.amount || 0), 0);
    return total.toLocaleString();
  }

  cleanup() {
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances = [];
  }
}
