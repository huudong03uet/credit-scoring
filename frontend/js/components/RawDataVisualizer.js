// Raw Data Visualizer - displays original API data without analysis
export class RawDataVisualizer {
  constructor() {
    this.chartInstances = [];
  }

  displayRawData(apiData) {
    const resultsDiv = document.getElementById('import-results');
    
    resultsDiv.innerHTML = `
      <div class="raw-data-container">
        <div class="raw-data-header">
          <h4><i class="fas fa-database"></i> Raw Wallet Data</h4>
          <span class="data-badge">Original API Response</span>
        </div>

        ${this.renderWalletSummary(apiData.wallets)}
        ${this.renderLendingEventsList(apiData.lending_events)}
        ${this.renderContractsList(apiData.contracts)}
        ${this.renderProjectsList(apiData.projects)}
        ${this.renderSocialData(apiData.twitter_users, apiData.tweets)}
        ${this.renderCharts(apiData)}
      </div>
    `;

    resultsDiv.style.display = 'block';
    resultsDiv.classList.add('fadeIn');

    // Initialize charts after DOM is ready
    setTimeout(() => this.initializeCharts(apiData), 100);
  }

  renderWalletSummary(wallets) {
    if (!wallets || wallets.length === 0) {
      return '<div class="no-data">No wallet data available</div>';
    }

    const wallet = wallets[0];
    
    return `
      <div class="data-section">
        <h5><i class="fas fa-wallet"></i> Wallet Information</h5>
        <div class="wallet-summary-grid">
          <div class="summary-item">
            <span class="label">Address:</span>
            <span class="value">${wallet.address}</span>
          </div>
          <div class="summary-item">
            <span class="label">Chain ID:</span>
            <span class="value">${wallet.chainId}</span>
          </div>
          <div class="summary-item">
            <span class="label">Balance (USD):</span>
            <span class="value">$${wallet.balanceInUSD?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="summary-item">
            <span class="label">Borrow (USD):</span>
            <span class="value">$${wallet.borrowInUSD?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="summary-item">
            <span class="label">Deposit (USD):</span>
            <span class="value">$${wallet.depositInUSD?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="summary-item">
            <span class="label">Liquidations:</span>
            <span class="value">${wallet.numberOfLiquidation || 0}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total Liquidation Value:</span>
            <span class="value">$${wallet.totalValueOfLiquidation?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderLendingEventsList(lendingEvents) {
    if (!lendingEvents || lendingEvents.length === 0) {
      return '<div class="no-data">No lending events available</div>';
    }

    const eventsByType = lendingEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});

    const totalVolume = lendingEvents.reduce((sum, event) => sum + (event.amount || 0), 0);

    return `
      <div class="data-section">
        <h5><i class="fas fa-exchange-alt"></i> Lending Events (${lendingEvents.length} total)</h5>
        
        <div class="events-summary">
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">Total Volume:</span>
              <span class="stat-value">$${totalVolume.toFixed(2)}</span>
            </div>
            ${Object.entries(eventsByType).map(([type, count]) => `
              <div class="stat-item">
                <span class="stat-label">${type}:</span>
                <span class="stat-value">${count} events</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="events-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Contract</th>
              </tr>
            </thead>
            <tbody>
              ${lendingEvents.slice(0, 10).map(event => `
                <tr>
                  <td>${new Date(event.block_timestamp * 1000).toLocaleDateString()}</td>
                  <td><span class="event-type ${event.event_type.toLowerCase()}">${event.event_type}</span></td>
                  <td>${event.amount?.toFixed(6) || 'N/A'}</td>
                  <td class="contract-address">${event.contract_address?.substring(0, 10)}...</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${lendingEvents.length > 10 ? `<p class="table-note">Showing 10 of ${lendingEvents.length} events</p>` : ''}
        </div>
      </div>
    `;
  }

  renderContractsList(contracts) {
    if (!contracts || contracts.length === 0) {
      return '<div class="no-data">No contract data available</div>';
    }

    return `
      <div class="data-section">
        <h5><i class="fas fa-file-contract"></i> Smart Contracts (${contracts.length} total)</h5>
        
        <div class="contracts-grid">
          ${contracts.map(contract => `
            <div class="contract-item">
              <div class="contract-address">${contract.address}</div>
              <div class="contract-stats">
                <span class="stat">Daily Calls: ${contract.numberOfDailyCalls || 0}</span>
                <span class="stat">Daily Users: ${contract.numberOfDailyActiveUsers || 0}</span>
              </div>
              ${contract.tags ? `
                <div class="contract-tags">
                  ${contract.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderProjectsList(projects) {
    if (!projects || projects.length === 0) {
      return '<div class="no-data">No project data available</div>';
    }

    return `
      <div class="data-section">
        <h5><i class="fas fa-project-diagram"></i> Projects (${projects.length} total)</h5>
        
        <div class="projects-list">
          ${projects.map(project => `
            <div class="project-item">
              <div class="project-header">
                <h6>${project.name}</h6>
                <span class="project-category">${project.category}</span>
              </div>
              <div class="project-stats">
                <div class="stat-item">
                  <span class="stat-label">TVL:</span>
                  <span class="stat-value">$${project.tvl?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Chains:</span>
                  <span class="stat-value">${project.deployedChains?.length || 0}</span>
                </div>
              </div>
              ${project.deployedChains ? `
                <div class="deployed-chains">
                  <span class="chains-label">Deployed on:</span>
                  ${project.deployedChains.map(chain => `<span class="chain-badge">${chain}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSocialData(twitterUsers, tweets) {
    if ((!twitterUsers || twitterUsers.length === 0) && (!tweets || tweets.length === 0)) {
      return '<div class="no-data">No social data available</div>';
    }

    return `
      <div class="data-section">
        <h5><i class="fab fa-twitter"></i> Social Media Data</h5>
        
        ${twitterUsers && twitterUsers.length > 0 ? `
          <div class="twitter-users">
            <h6>Twitter Users (${twitterUsers.length})</h6>
            ${twitterUsers.map(user => `
              <div class="twitter-user">
                <div class="user-name">@${user.userName}</div>
                <div class="user-stats">
                  <span>Followers: ${user.followersCount?.toLocaleString() || 0}</span>
                  <span>Following: ${user.friendsCount?.toLocaleString() || 0}</span>
                  <span>Tweets: ${user.statusesCount?.toLocaleString() || 0}</span>
                  ${user.verified ? '<span class="verified">✓ Verified</span>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tweets && tweets.length > 0 ? `
          <div class="tweets-data">
            <h6>Recent Tweets (${tweets.length})</h6>
            <div class="tweets-summary">
              <div class="tweet-stats">
                <span>Total Likes: ${tweets.reduce((sum, tweet) => sum + (tweet.likes || 0), 0)}</span>
                <span>Total Retweets: ${tweets.reduce((sum, tweet) => sum + (tweet.retweetCounts || 0), 0)}</span>
                <span>Total Replies: ${tweets.reduce((sum, tweet) => sum + (tweet.replyCounts || 0), 0)}</span>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCharts(apiData) {
    return `
      <div class="data-section">
        <h5><i class="fas fa-chart-bar"></i> Data Visualizations</h5>
        
        <div class="charts-grid">
          <div class="chart-container">
            <h6>Balance Over Time</h6>
            <canvas id="balance-chart" width="400" height="200"></canvas>
          </div>
          
          <div class="chart-container">
            <h6>Lending Events Distribution</h6>
            <canvas id="events-chart" width="400" height="200"></canvas>
          </div>
          
          <div class="chart-container">
            <h6>Daily Transaction Counts</h6>
            <canvas id="transactions-chart" width="400" height="200"></canvas>
          </div>
          
          <div class="chart-container">
            <h6>Social Engagement</h6>
            <canvas id="social-chart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  initializeCharts(apiData) {
    this.createBalanceChart(apiData.wallets?.[0]?.balanceChangeLogs);
    this.createEventsChart(apiData.lending_events);
    this.createTransactionsChart(apiData.wallets?.[0]?.dailyNumberOfTransactions);
    this.createSocialChart(apiData.tweets);
  }

  createBalanceChart(balanceChangeLogs) {
    const canvas = document.getElementById('balance-chart');
    if (!canvas || !balanceChangeLogs) return;

    const ctx = canvas.getContext('2d');
    const data = Object.entries(balanceChangeLogs).map(([timestamp, balance]) => ({
      x: new Date(parseInt(timestamp) * 1000),
      y: balance
    }));

    this.drawLineChart(ctx, data, 'Balance (USD)', '#3b82f6');
  }

  createEventsChart(lendingEvents) {
    const canvas = document.getElementById('events-chart');
    if (!canvas || !lendingEvents) return;

    const ctx = canvas.getContext('2d');
    const eventCounts = lendingEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});

    this.drawPieChart(ctx, eventCounts);
  }

  createTransactionsChart(dailyTransactions) {
    const canvas = document.getElementById('transactions-chart');
    if (!canvas || !dailyTransactions) return;

    const ctx = canvas.getContext('2d');
    const data = Object.entries(dailyTransactions).map(([timestamp, count]) => ({
      x: new Date(parseInt(timestamp) * 1000),
      y: count
    }));

    this.drawLineChart(ctx, data, 'Transactions', '#22c55e');
  }

  createSocialChart(tweets) {
    const canvas = document.getElementById('social-chart');
    if (!canvas || !tweets) return;

    const ctx = canvas.getContext('2d');
    const engagementData = tweets.map(tweet => ({
      likes: tweet.likes || 0,
      retweets: tweet.retweetCounts || 0,
      replies: tweet.replyCounts || 0
    }));

    this.drawBarChart(ctx, engagementData);
  }

  drawLineChart(ctx, data, label, color) {
    if (!data || data.length === 0) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const width = ctx.canvas.width - 80;
    const height = ctx.canvas.height - 60;
    const offsetX = 40;
    const offsetY = 30;

    // Find min/max values
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

    // Add labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText(label, offsetX, offsetY - 10);
    ctx.fillText(minValue.toFixed(2), 5, offsetY + height);
    ctx.fillText(maxValue.toFixed(2), 5, offsetY);
  }

  drawPieChart(ctx, data) {
    if (!data || Object.keys(data).length === 0) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

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
      const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${key}: ${value}`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }

  drawBarChart(ctx, data) {
    if (!data || data.length === 0) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const width = ctx.canvas.width - 80;
    const height = ctx.canvas.height - 60;
    const offsetX = 40;
    const offsetY = 30;

    const barWidth = width / (data.length * 3);
    const maxEngagement = Math.max(...data.map(d => Math.max(d.likes, d.retweets, d.replies)));

    data.slice(0, 10).forEach((tweet, index) => {
      const x = offsetX + index * barWidth * 3;
      
      // Likes bar
      const likesHeight = (tweet.likes / maxEngagement) * height;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, offsetY + height - likesHeight, barWidth * 0.8, likesHeight);
      
      // Retweets bar
      const retweetsHeight = (tweet.retweets / maxEngagement) * height;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + barWidth, offsetY + height - retweetsHeight, barWidth * 0.8, retweetsHeight);
      
      // Replies bar
      const repliesHeight = (tweet.replies / maxEngagement) * height;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x + barWidth * 2, offsetY + height - repliesHeight, barWidth * 0.8, repliesHeight);
    });

    // Draw legend
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(offsetX, offsetY - 25, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Likes', offsetX + 15, offsetY - 16);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(offsetX + 60, offsetY - 25, 10, 10);
    ctx.fillText('Retweets', offsetX + 75, offsetY - 16);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(offsetX + 140, offsetY - 25, 10, 10);
    ctx.fillText('Replies', offsetX + 155, offsetY - 16);
  }

  cleanup() {
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances = [];
  }
}
