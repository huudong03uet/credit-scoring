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

export async function fetchWalletGraph(walletAddress, limit = 20) {
    console.log(`2. Fetching wallet graph for address: ${walletAddress} with limit: ${limit}`);
  const res = await fetch(`${API_BASE_URL}/wallet-graph?wallet_address=${walletAddress}&limit=${limit}`, {
    method: 'GET',
    headers: { 'accept': 'application/json' }
  });
  console.log(`2. Response status: ${res}`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
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
    const res = await fetch(`${CREDIT_SCORE_API_URL}/credit_score_explain`, {
      method: 'POST',
      mode: 'cors',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wallet_id: walletId })
    });
    
    console.log(`6. Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`6. Error response: ${errorText}`);
      throw new Error(`API Error ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log(`6. Success response:`, data);
    return data;
    
  } catch (error) {
    console.error(`6. Fetch error:`, error);
    
    // Check if it's a network/CORS error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Cannot connect to credit score API. Please check if the API server is running on port 7999 and CORS is enabled.');
    }
    
    throw error;
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
    
    // Handle wallet graph result
    if (walletGraphData.status === 'fulfilled') {
      result.walletGraph = walletGraphData.value;
      console.log(`7. Wallet graph data retrieved successfully`);
    } else {
      result.errors.push(`Wallet graph error: ${walletGraphData.reason.message}`);
      console.error(`7. Wallet graph error:`, walletGraphData.reason);
    }
    
    // Handle credit score result
    if (creditScoreData.status === 'fulfilled') {
      result.creditScore = creditScoreData.value;
      console.log(`7. Credit score data retrieved successfully`);
    } else {
      result.errors.push(`Credit score error: ${creditScoreData.reason.message}`);
      console.error(`7. Credit score error:`, creditScoreData.reason);
    }
    
    // If both failed, throw an error
    if (!result.walletGraph && !result.creditScore) {
      throw new Error(`Both APIs failed: ${result.errors.join('; ')}`);
    }
    
    console.log(`7. Combined analysis result:`, result);
    return result;
    
  } catch (error) {
    console.error(`7. Wallet analysis error:`, error);
    throw error;
  }
}