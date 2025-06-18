const API_BASE_URL = 'http://localhost:8000'; // Wallet graph API
const CREDIT_SCORE_API_URL = 'http://localhost:7999'; // Credit score API

export async function fetchScore(address) {
    console.log(`1. Fetching score for address: ${address}`);
  const res = await fetch(`${API_BASE_URL}/score/${address}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(`1. Response status: ${res}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function fetchWalletGraph(walletAddress, limit = 50) {
  console.log(`2. Fetching wallet graph for address: ${walletAddress} with limit: ${limit}`);
  
  try {
    const data = await safeFetch(`${API_BASE_URL}/wallet-graph?wallet_address=${walletAddress}&limit=${limit}`);
    
    // Validate expected fields for wallet graph
    const validation = validateApiResponse(data, ['wallets', 'lending_events', 'contracts']);
    
    if (!validation.isValid) {
      console.warn(`2. Wallet graph validation warnings:`, validation.errors);
    }
    
    console.log(`2. Wallet graph response validated successfully`);
    return validation.sanitized;
    
  } catch (error) {
    console.error(`2. Wallet graph fetch error:`, error);
    throw new Error(`Wallet Graph API error: ${error.message}`);
  }
}

export async function analyzeWallet(walletData) {
  // Use the actual wallet graph API for address-based analysis
  console.log(`3. Analyzing wallet data: ${JSON.stringify(walletData)}`);
  if (walletData.type === 'address' || walletData.type === 'metamask') {
    return await fetchWalletGraph(walletData.value);
  }
  
  const res = await fetch(`${API_BASE_URL}/wallet/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(walletData)
  });
  console.log(`3. Response status: ${res}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function uploadWalletFiles(files) {
    console.log(`4. Uploading wallet files: ${files.length} files`);
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`file_${index}`, file);
  });

  const res = await fetch(`${API_BASE_URL}/wallet/upload`, {
    method: 'POST',
    body: formData
  });
  console.log(`4. Response status: ${res}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function predictScore(userData) {
    console.log(`5. Predicting score with user data: ${JSON.stringify(userData)}`);
  const res = await fetch(`${API_BASE_URL}/score/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
    console.log(`5. Response status: ${res}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export async function fetchCreditScoreExplanation(walletId) {
  console.log(`6. Fetching credit score explanation for wallet: ${walletId}`);
  
  try {
    const data = await safeFetch(`${CREDIT_SCORE_API_URL}/credit_score_explain`, {
      method: 'POST',
      body: JSON.stringify({ wallet_id: walletId })
    });
    
    // Validate expected fields for credit score
    const validation = validateApiResponse(data, ['status', 'score', 'explanation']);
    
    if (!validation.isValid) {
      console.warn(`6. Credit score validation warnings:`, validation.errors);
    }
    
    console.log(`6. Credit score response validated successfully`);
    return validation.sanitized;
    
  } catch (error) {
    console.error(`6. Credit score fetch error:`, error);
    throw new Error(`Credit Score API error: ${error.message}`);
  }
}

export async function fetchWalletAnalysis(walletAddress) {
  console.log(`7. Fetching complete wallet analysis for: ${walletAddress}`);
  
  try {
    // Create wallet_id format for credit score API
    const walletId = `0x1_${walletAddress}`;
    
    // Fetch both APIs in parallel
    const [walletGraphData, creditScoreData] = await Promise.allSettled([
      fetchWalletGraph(walletAddress),
      fetchCreditScoreExplanation(walletId)
    ]);
    
    // Combine the results
    const result = {
      walletAddress: walletAddress,
      walletId: walletId,
      walletGraph: null,
      creditScore: null,
      errors: []
    };
      // Handle wallet graph result with error tolerance
    if (walletGraphData.status === 'fulfilled') {
      try {
        result.walletGraph = sanitizeObject(walletGraphData.value);
        console.log(`7. Wallet graph data retrieved successfully`);
      } catch (sanitizeError) {
        result.errors.push(`Wallet graph data corruption: ${sanitizeError.message}`);
        result.walletGraph = null;
      }
    } else {
      const errorMsg = safeGet(walletGraphData, 'reason.message', 'Unknown wallet graph error');
      result.errors.push(`Wallet graph error: ${errorMsg}`);
      console.error(`7. Wallet graph error:`, walletGraphData.reason);
    }
    
    // Handle credit score result with error tolerance
    if (creditScoreData.status === 'fulfilled') {
      try {
        result.creditScore = sanitizeObject(creditScoreData.value);
        console.log(`7. Credit score data retrieved successfully`);
      } catch (sanitizeError) {
        result.errors.push(`Credit score data corruption: ${sanitizeError.message}`);
        result.creditScore = null;
      }
    } else {
      const errorMsg = safeGet(creditScoreData, 'reason.message', 'Unknown credit score error');
      result.errors.push(`Credit score error: ${errorMsg}`);
      console.error(`7. Credit score error:`, creditScoreData.reason);
    }
    
    // If both failed, throw an error with detailed information
    if (!result.walletGraph && !result.creditScore) {
      throw new Error(`Both APIs failed: ${result.errors.join('; ')}`);
    }
    
    console.log(`7. Combined analysis result:`, result);
    return sanitizeObject(result);
    
  } catch (error) {
    console.error(`7. Wallet analysis error:`, error);
    throw error;
  }
}

// Data validation utilities for error tolerance
export function validateApiResponse(response, expectedFields = []) {
  const validation = {
    isValid: true,
    errors: [],
    sanitized: {}
  };

  try {
    if (!response || typeof response !== 'object') {
      validation.isValid = false;
      validation.errors.push('Invalid response format');
      return validation;
    }

    // Validate expected fields
    expectedFields.forEach(field => {
      const value = safeGet(response, field);
      if (value === null || value === undefined) {
        validation.errors.push(`Missing or null field: ${field}`);
      }
    });

    // Sanitize the response
    validation.sanitized = sanitizeObject(response);

    if (validation.errors.length > 0) {
      validation.isValid = false;
    }

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(`Validation error: ${error.message}`);
  }

  return validation;
}

export function safeGet(obj, path, defaultValue = null) {
  try {
    if (!obj) return defaultValue;
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

export function sanitizeObject(obj, maxDepth = 5) {
  if (maxDepth <= 0) return obj;
  
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    try {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    } catch (error) {
      console.warn(`Error sanitizing key "${key}":`, error);
      sanitized[key] = null;
    }
  }

  return sanitized;
}

// Enhanced fetch with error tolerance
export async function safeFetch(url, options = {}) {
  console.log(`Making request to: ${url}`);
  console.log('Request options:', options);
  
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, [...response.headers.entries()]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data received successfully');
    return sanitizeObject(data);

  } catch (error) {
    console.error('Fetch error details:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Cannot connect to ${url}. Please check if the server is running and CORS is enabled.`);
    }
    throw error;
  }
}