// Utility functions to analyze wallet graph data and calculate metrics
export class WalletAnalyzer {
  static analyzeWalletData(walletGraphData) {
    const wallet = walletGraphData.wallets?.[0];
    const lendingEvents = walletGraphData.lending_events || [];
    const contracts = walletGraphData.contracts || [];
    const projects = walletGraphData.projects || [];
    const tweets = walletGraphData.tweets || [];
    
    if (!wallet) {
      throw new Error('No wallet data found');
    }

    return {
      basicMetrics: this.calculateBasicMetrics(wallet),
      creditScore: walletGraphData.credit_score || this.calculateCreditScore(wallet, lendingEvents),
      riskAssessment: this.assessRisk(wallet, lendingEvents),
      defiActivity: this.analyzeDeFiActivity(lendingEvents, contracts, projects),
      socialPresence: this.analyzeSocialPresence(tweets),
      portfolioHealth: this.analyzePortfolioHealth(wallet),
      explainable: walletGraphData.explainable || this.generateExplanation(wallet, lendingEvents)
    };
  }

  static calculateBasicMetrics(wallet) {
    const latestBalance = wallet.balanceInUSD || 0;
    const borrowAmount = wallet.borrowInUSD || 0;
    const depositAmount = wallet.depositInUSD || 0;
    
    // Calculate change over time
    const balanceChanges = Object.values(wallet.balanceChangeLogs || {});
    const balanceChange = balanceChanges.length >= 2 ? 
      ((balanceChanges[balanceChanges.length - 1] - balanceChanges[balanceChanges.length - 2]) / balanceChanges[balanceChanges.length - 2] * 100) : 0;

    return {
      netWorth: latestBalance,
      totalAssets: latestBalance + depositAmount,
      totalDebts: borrowAmount,
      netWorthChange: balanceChange,
      healthRatio: borrowAmount > 0 ? (latestBalance + depositAmount) / borrowAmount : null,
      liquidationRisk: wallet.numberOfLiquidation || 0
    };
  }

  static calculateCreditScore(wallet, lendingEvents) {
    let score = 300; // Base score
    
    // Balance factor (0-200 points)
    const balance = wallet.balanceInUSD || 0;
    if (balance > 50000) score += 200;
    else if (balance > 20000) score += 150;
    else if (balance > 5000) score += 100;
    else if (balance > 1000) score += 50;
    
    // Borrowing history factor (0-150 points)
    const borrowHistory = lendingEvents.filter(e => e.event_type === 'BORROW');
    const repayHistory = lendingEvents.filter(e => e.event_type === 'REPAY');
    
    if (repayHistory.length > 0) {
      const repayRatio = repayHistory.length / Math.max(borrowHistory.length, 1);
      score += Math.min(150, repayRatio * 150);
    }
    
    // Activity factor (0-100 points)
    const totalTransactions = lendingEvents.length;
    if (totalTransactions > 50) score += 100;
    else if (totalTransactions > 20) score += 75;
    else if (totalTransactions > 10) score += 50;
    else if (totalTransactions > 0) score += 25;
    
    // Liquidation penalty
    const liquidations = wallet.numberOfLiquidation || 0;
    score -= liquidations * 50;
    
    // Stability factor (0-100 points)
    const balanceChanges = Object.values(wallet.balanceChangeLogs || {});
    if (balanceChanges.length > 1) {
      const volatility = this.calculateVolatility(balanceChanges);
      score += Math.max(0, 100 - volatility * 100);
    }
    
    return Math.min(900, Math.max(300, Math.round(score)));
  }

  static assessRisk(wallet, lendingEvents) {
    const balance = wallet.balanceInUSD || 0;
    const borrow = wallet.borrowInUSD || 0;
    const liquidations = wallet.numberOfLiquidation || 0;
    
    let riskScore = 0;
    
    // Debt-to-asset ratio risk
    if (borrow > 0) {
      const debtRatio = borrow / Math.max(balance, 1);
      if (debtRatio > 0.8) riskScore += 40;
      else if (debtRatio > 0.6) riskScore += 30;
      else if (debtRatio > 0.4) riskScore += 20;
      else if (debtRatio > 0.2) riskScore += 10;
    }
    
    // Liquidation history risk
    riskScore += liquidations * 20;
    
    // Activity risk (too little activity can be risky)
    const recentActivity = lendingEvents.filter(e => 
      e.block_timestamp > (Date.now() / 1000) - (90 * 24 * 3600) // Last 90 days
    ).length;
    
    if (recentActivity === 0 && borrow > 0) riskScore += 15;
    
    if (riskScore >= 60) return 'High';
    if (riskScore >= 30) return 'Medium';
    if (riskScore >= 15) return 'Low-Medium';
    return 'Low';
  }

  static analyzeDeFiActivity(lendingEvents, contracts, projects) {
    const uniqueContracts = new Set(lendingEvents.map(e => e.contract_address)).size;
    const totalVolume = lendingEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const eventTypes = lendingEvents.reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {});

    const protocolDiversity = projects.length;
    
    return {
      protocolsUsed: uniqueContracts,
      totalVolume,
      eventBreakdown: eventTypes,
      protocolDiversity,
      experienceLevel: this.calculateExperienceLevel(lendingEvents, uniqueContracts)
    };
  }

  static calculateExperienceLevel(lendingEvents, protocolCount) {
    const totalEvents = lendingEvents.length;
    
    if (totalEvents > 100 && protocolCount > 5) return 'Expert';
    if (totalEvents > 50 && protocolCount > 3) return 'Advanced';
    if (totalEvents > 20 && protocolCount > 1) return 'Intermediate';
    if (totalEvents > 0) return 'Beginner';
    return 'New';
  }

  static analyzeSocialPresence(tweets) {
    if (!tweets || tweets.length === 0) return null;
    
    const totalEngagement = tweets.reduce((sum, tweet) => 
      sum + (tweet.likes || 0) + (tweet.retweetCounts || 0) + (tweet.replyCounts || 0), 0
    );
    
    return {
      totalTweets: tweets.length,
      totalEngagement,
      averageEngagement: totalEngagement / tweets.length,
      influenceLevel: totalEngagement > 1000 ? 'High' : totalEngagement > 100 ? 'Medium' : 'Low'
    };
  }

  static analyzePortfolioHealth(wallet) {
    const balance = wallet.balanceInUSD || 0;
    const borrow = wallet.borrowInUSD || 0;
    const deposit = wallet.depositInUSD || 0;
    
    const balanceChanges = Object.values(wallet.balanceChangeLogs || {});
    const trend = balanceChanges.length >= 2 ? 
      (balanceChanges[balanceChanges.length - 1] > balanceChanges[0] ? 'Positive' : 'Negative') : 'Stable';
    
    return {
      healthScore: this.calculateHealthScore(balance, borrow, deposit),
      trend,
      diversification: deposit > 0 ? 'Diversified' : 'Single Asset',
      liquidityRatio: balance / Math.max(borrow, 1)
    };
  }

  static calculateHealthScore(balance, borrow, deposit) {
    if (borrow === 0) return balance > 1000 ? 90 : 70;
    
    const healthRatio = (balance + deposit) / borrow;
    if (healthRatio > 3) return 90;
    if (healthRatio > 2) return 75;
    if (healthRatio > 1.5) return 60;
    if (healthRatio > 1.2) return 45;
    return 30;
  }

  static calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  static generateExplanation(wallet, lendingEvents) {
    const balance = wallet.balanceInUSD || 0;
    const borrowCount = lendingEvents.filter(e => e.event_type === 'BORROW').length;
    const repayCount = lendingEvents.filter(e => e.event_type === 'REPAY').length;
    
    let explanation = `This wallet shows `;
    
    if (balance > 10000) {
      explanation += `strong financial capacity with $${balance.toFixed(2)} in assets. `;
    } else if (balance > 1000) {
      explanation += `moderate financial activity with $${balance.toFixed(2)} in assets. `;
    } else {
      explanation += `limited financial activity with $${balance.toFixed(2)} in assets. `;
    }
    
    if (borrowCount > 0) {
      const repayRatio = repayCount / borrowCount;
      if (repayRatio >= 0.8) {
        explanation += `Excellent repayment history with ${repayCount} repayments out of ${borrowCount} borrows. `;
      } else if (repayRatio >= 0.5) {
        explanation += `Good repayment behavior with ${repayCount} repayments out of ${borrowCount} borrows. `;
      } else {
        explanation += `Some repayment concerns with only ${repayCount} repayments out of ${borrowCount} borrows. `;
      }
    }
    
    if (lendingEvents.length > 20) {
      explanation += `High DeFi activity with ${lendingEvents.length} total transactions indicates experience. `;
    } else if (lendingEvents.length > 5) {
      explanation += `Moderate DeFi engagement with ${lendingEvents.length} transactions. `;
    }
    
    return explanation;
  }

  static generateScoreFactors(analysisResult) {
    const factors = [];
    
    // Transaction History
    factors.push({
      name: 'Transaction History',
      score: Math.min(100, Math.max(0, (analysisResult.defiActivity.totalVolume / 100) * 10)),
      impact: 'high',
      description: `${analysisResult.defiActivity.eventBreakdown.DEPOSIT || 0} deposits, ${analysisResult.defiActivity.eventBreakdown.BORROW || 0} borrows`
    });
    
    // Portfolio Health
    factors.push({
      name: 'Portfolio Health',
      score: analysisResult.portfolioHealth.healthScore,
      impact: 'high',
      description: `${analysisResult.portfolioHealth.trend} trend, ${analysisResult.portfolioHealth.diversification}`
    });
    
    // DeFi Experience
    factors.push({
      name: 'DeFi Experience',
      score: Math.min(100, analysisResult.defiActivity.protocolsUsed * 20),
      impact: 'medium',
      description: `${analysisResult.defiActivity.experienceLevel} level, ${analysisResult.defiActivity.protocolsUsed} protocols`
    });
    
    // Risk Management
    const riskScore = analysisResult.riskAssessment === 'Low' ? 90 : 
                     analysisResult.riskAssessment === 'Low-Medium' ? 70 :
                     analysisResult.riskAssessment === 'Medium' ? 50 : 30;
    factors.push({
      name: 'Risk Management',
      score: riskScore,
      impact: 'high',
      description: `${analysisResult.riskAssessment} risk level`
    });
    
    // Asset Stability
    factors.push({
      name: 'Asset Stability',
      score: Math.max(30, 90 - Math.abs(analysisResult.basicMetrics.netWorthChange)),
      impact: 'medium',
      description: `${analysisResult.basicMetrics.netWorthChange > 0 ? '+' : ''}${analysisResult.basicMetrics.netWorthChange.toFixed(1)}% change`
    });
    
    return factors;
  }
}
