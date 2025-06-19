export class Chatbot {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:8000/chatbot/message/stream';
    this.walletAddress = options.walletAddress || null;
    this.scoreData = options.scoreData || null;
    this.messages = [];
    this.isOpen = false;
    this.isMinimized = false;
    this.typing = false;
    
    // Set fake data directly
    this.completeResults = {
      walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      ensName: "vitalik.eth",
      scoreData: {
        score: 785,
        scoreLabel: "Excellent",
        explanation: "Exceptional DeFi engagement with diverse protocol interactions"
      },
      transactionData: {
        totalTransactions: 2847,
        totalVolume: 1245.67,
        avgTransactionValue: 0.437,
        activeDays: 892,
        firstTransaction: "2020-05-15T14:30:00Z",
        lastTransaction: "2024-12-18T09:15:00Z",
        gasEfficiency: 0.85,
        failedTransactions: 12
      },
      relationships: [
        {
          address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          ensName: "uniswap-v3.eth",
          type: "DEX Protocol",
          transactionCount: 342,
          totalValue: 156.78,
          relationship: "Liquidity Provider",
          riskLevel: "Low",
          firstInteraction: "2021-05-05T10:20:00Z",
          lastInteraction: "2024-12-17T16:45:00Z"
        },
        {
          address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          ensName: "compound.eth", 
          type: "Lending Protocol",
          transactionCount: 187,
          totalValue: 234.56,
          relationship: "Borrower/Lender",
          riskLevel: "Low",
          firstInteraction: "2021-03-12T08:30:00Z",
          lastInteraction: "2024-12-15T14:20:00Z"
        },
        {
          address: "0x742d35Cc6634C0532925a3b8D098C3D701d5F694",
          ensName: "aave.eth",
          type: "Lending Protocol", 
          transactionCount: 98,
          totalValue: 189.23,
          relationship: "Liquidity Provider",
          riskLevel: "Low",
          firstInteraction: "2021-08-20T12:15:00Z",
          lastInteraction: "2024-12-10T11:30:00Z"
        },
        {
          address: "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
          ensName: "convex.eth",
          type: "Yield Farming",
          transactionCount: 67,
          totalValue: 89.45,
          relationship: "Yield Farmer",
          riskLevel: "Medium",
          firstInteraction: "2022-01-10T09:45:00Z",
          lastInteraction: "2024-11-28T15:10:00Z"
        },
        {
          address: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
          ensName: "maker.eth",
          type: "Stablecoin Protocol",
          transactionCount: 45,
          totalValue: 67.89,
          relationship: "CDP Owner",
          riskLevel: "Low",
          firstInteraction: "2020-08-20T12:15:00Z",
          lastInteraction: "2024-12-10T11:30:00Z"
        }
      ],
      defiActivity: {
        protocolsUsed: 18,
        totalVolume: 892.34,
        liquidityProvided: 156.78,
        yieldFarming: true,
        dexVolume: 234.56,
        topProtocols: ["Uniswap V3", "Compound", "Aave", "MakerDAO", "Curve", "Convex", "Balancer", "Yearn"]
      },
      nftActivity: {
        collections: 12,
        nftsOwned: 47,
        tradingVolume: 34.67,
        topCollections: ["CryptoPunks", "Bored Ape Yacht Club", "Art Blocks", "Azuki", "CloneX"]
      },
      riskFactors: {
        overallRisk: "Low",
        suspiciousActivity: false,
        blacklistedInteractions: 0,
        highRiskProtocols: false,
        riskScore: 15
      }
    };
    
    this.createChatbotUI();
    this.setupEventListeners();
    this.addInitialMessages();
    
    console.log("🧪 Chatbot initialized with fake data:", this.completeResults);
  }
  
  createChatbotUI() {
    // Tạo container chính
    this.container = document.createElement('div');
    this.container.className = 'chatbot-container';
    this.container.style.display = 'none';
    
    // Tạo HTML cho chatbot
    this.container.innerHTML = `
      <div class="chatbot-launcher">
        <div class="chatbot-launcher-icon">
          <i class="fas fa-robot"></i>
          <div class="chatbot-notification-dot"></div>
        </div>
      </div>
      
      <div class="chatbot-box">
        <div class="chatbot-header">
          <div class="chatbot-title">
            <i class="fas fa-robot"></i>
            <span>BAAI Assistant</span>
          </div>
          <div class="chatbot-actions">
            <button class="chatbot-action minimize">
              <i class="fas fa-minus"></i>
            </button>
            <button class="chatbot-action close">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="chatbot-body">
          <div class="chatbot-messages"></div>
        </div>
        
        <div class="chatbot-footer">
          <div class="chatbot-input-container">
            <input 
              type="text" 
              class="chatbot-input" 
              placeholder="Ask about your score..." 
            />
            <button class="chatbot-send">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          <div class="chatbot-powered-by">
            Powered by BAAI
          </div>
        </div>
      </div>
    `;
    
    // Thêm vào body
    document.body.appendChild(this.container);
    
    // Lưu các element để dễ truy cập
    this.launcherEl = this.container.querySelector('.chatbot-launcher');
    this.boxEl = this.container.querySelector('.chatbot-box');
    this.messagesEl = this.container.querySelector('.chatbot-messages');
    this.inputEl = this.container.querySelector('.chatbot-input');
    this.sendBtn = this.container.querySelector('.chatbot-send');
    this.minimizeBtn = this.container.querySelector('.chatbot-action.minimize');
    this.closeBtn = this.container.querySelector('.chatbot-action.close');
  }
  
  setupEventListeners() {
    // Nút launcher để mở chatbot
    this.launcherEl.addEventListener('click', () => this.toggleChatbot());
    
    // Nút minimize
    this.minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeChatbot();
    });
    
    // Nút close
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeChatbot();
    });
    
    // Gửi tin nhắn khi nhấn nút send
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Gửi tin nhắn khi nhấn Enter
    this.inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    
    // Đánh dấu đang nhập khi user nhập liệu
    this.inputEl.addEventListener('focus', () => {
      this.boxEl.classList.add('typing');
    });
    
    this.inputEl.addEventListener('blur', () => {
      if (this.inputEl.value.trim() === '') {
        this.boxEl.classList.remove('typing');
      }
    });
    
    // Theo dõi thay đổi kích thước màn hình
    window.addEventListener('resize', () => this.adjustPosition());
  }
  
  addInitialMessages() {
    setTimeout(() => {
      const welcomeMsg = `👋 Hi there! I'm BAAI Assistant, your personal guide to understand your Web3 credit score.`;
      this.appendMessage(welcomeMsg, 'assistant');
      this.messages.push({ role: 'assistant', content: welcomeMsg });
      
      // Nếu có dữ liệu về điểm số, hiển thị thông tin đó
      if (this.scoreData && this.scoreData.score) {
        // Đảm bảo sử dụng số nguyên
        const score = Math.round(this.scoreData.score);
        // Đảm bảo có scoreLabel hợp lệ
        const scoreLabel = this.scoreData.scoreLabel || this.getScoreLabel(score);
        
        const scoreMsg = `I see your credit score is ${score} (${scoreLabel}). What would you like to know about your score?`;
        setTimeout(() => {
          this.appendMessage(scoreMsg, 'assistant');
          this.messages.push({ role: 'assistant', content: scoreMsg });
        }, 1000);
        
        // Chỉ thêm các gợi ý một lần
        setTimeout(() => {
          this.appendSuggestions([
            'How is my score calculated?',
            'How can I improve my score?',
            'What is affecting my score negatively?',
            'What are my strongest factors?'
          ]);
        }, 1500);
      } else {
        setTimeout(() => {
          this.appendMessage('How can I help you understand your Web3 credit score?', 'assistant');
          this.messages.push({ role: 'assistant', content: 'How can I help you understand your Web3 credit score?' });
        }, 1000);
      }
    }, 300);
  }
  
  formatAddress(address) {
    if (!address) return '';
    if (address.endsWith('.eth')) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  appendMessage(content, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message ${role}`;
    
    // Thêm avatar cho tin nhắn của assistant
    if (role === 'assistant') {
      messageEl.innerHTML = `
        <div class="chatbot-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chatbot-bubble"></div>
      `;
      
      const bubble = messageEl.querySelector('.chatbot-bubble');
      this.animateTyping(content, bubble);
    } else {
      messageEl.innerHTML = `<div class="chatbot-bubble">${content}</div>`;
    }
    
    this.messagesEl.appendChild(messageEl);
    this.scrollToBottom();
    
    return messageEl;
  }
  
  animateTyping(content, element) {
    let i = 0;
    const speed = 15; // milliseconds per character
    
    // First show typing indicator
    element.innerHTML = '<span class="typing-indicator"><span>.</span><span>.</span><span>.</span></span>';
    this.scrollToBottom();
    
    // Then type out the message
    setTimeout(() => {
      element.innerHTML = '';
      const typeChar = () => {
        if (i < content.length) {
          element.innerHTML += content.charAt(i);
          i++;
          this.scrollToBottom(); // Cuộn sau mỗi ký tự
          setTimeout(typeChar, speed);
        } else {
          // Cuộn cuối cùng khi hoàn thành typing
          this.scrollToBottom();
        }
      };
      typeChar();
    }, 500);
  }
  
  appendSuggestions(suggestions) {
    // Kiểm tra nếu đã có suggestions rồi thì không thêm nữa
    if (this.messagesEl.querySelector('.chatbot-suggestions')) {
      return;
    }
    
    const suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'chatbot-suggestions';
    
    suggestions.forEach(suggestion => {
      const suggestionEl = document.createElement('button');
      suggestionEl.className = 'chatbot-suggestion';
      suggestionEl.textContent = suggestion;
      suggestionEl.addEventListener('click', () => {
        this.inputEl.value = suggestion;
        this.sendMessage();
      });
      suggestionsEl.appendChild(suggestionEl);
    });
    
    this.messagesEl.appendChild(suggestionsEl);
    this.scrollToBottom();
  }
  
  scrollToBottom() {
    // Sử dụng requestAnimationFrame để đảm bảo DOM đã được cập nhật
    requestAnimationFrame(() => {
      if (this.messagesEl) {
        const chatBody = this.messagesEl.parentElement;
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    });
  }
  
  // Add method to handle specific user commands
handleSpecificCommands(userMessage) {
  const message = userMessage.toLowerCase().trim();
  
  // Command: "tôi giao dịch với ví nào nhiều nhất"
  if (message.includes('giao dịch')) {
    return this.getMostInteractedWallet();
  }
  
  // Command: "tương tác với bao nhiêu project"
  if (message.includes('tương tác')) {
    return this.getProjectInteractionCount();
  }
  
  // Return null if no specific command matched
  return null;
}

getMostInteractedWallet() {
  if (!this.completeResults || !this.completeResults.relationships) {
    return "Không có dữ liệu về các ví liên kết để phân tích.";
  }

  const relationships = this.completeResults.relationships;
  
  // Find wallet with highest transaction count
  const mostInteracted = relationships.reduce((max, current) => {
    return (current.transactionCount > max.transactionCount) ? current : max;
  }, relationships[0]);

  let response = `🏆 **Ví bạn giao dịch nhiều nhất:**\n\n`;
  response += `**Địa chỉ:** ${mostInteracted.address}\n`;
  if (mostInteracted.ensName) {
    response += `**ENS:** ${mostInteracted.ensName}\n`;
  }
  response += `**Loại:** ${mostInteracted.type}\n`;
  response += `**Số giao dịch:** ${mostInteracted.transactionCount} giao dịch\n`;
  response += `**Tổng giá trị:** ${mostInteracted.totalValue} ETH\n`;
  response += `**Mối quan hệ:** ${mostInteracted.relationship}\n`;
  response += `**Mức rủi ro:** ${mostInteracted.riskLevel}\n\n`;
  
  response += `**Thời gian tương tác:**\n`;
  response += `- Lần đầu: ${new Date(mostInteracted.firstInteraction).toLocaleDateString('vi-VN')}\n`;
  response += `- Lần cuối: ${new Date(mostInteracted.lastInteraction).toLocaleDateString('vi-VN')}`;

  return response;
}

getProjectInteractionCount() {
  if (!this.completeResults) {
    return "Không có dữ liệu để phân tích số lượng project.";
  }

  const defiProtocols = this.completeResults.defiActivity?.protocolsUsed || 0;
  const walletRelationships = this.completeResults.relationships?.length || 0;
  const nftCollections = this.completeResults.nftActivity?.collections || 0;

  let response = `📊 **Thống kê tương tác với các project:**\n\n`;
  
  response += `🏦 **DeFi Protocols:** ${defiProtocols} protocols\n`;
  if (this.completeResults.defiActivity?.topProtocols) {
    response += `   Top protocols: ${this.completeResults.defiActivity.topProtocols.slice(0, 5).join(', ')}\n\n`;
  }
  
  response += `🤝 **Wallet Relationships:** ${walletRelationships} ví liên kết\n`;
  const protocolTypes = {};
  this.completeResults.relationships?.forEach(rel => {
    protocolTypes[rel.type] = (protocolTypes[rel.type] || 0) + 1;
  });
  Object.entries(protocolTypes).forEach(([type, count]) => {
    response += `   - ${type}: ${count}\n`;
  });
  response += `\n`;
  
  response += `🎨 **NFT Collections:** ${nftCollections} collections\n`;
  if (this.completeResults.nftActivity?.topCollections) {
    response += `   Top collections: ${this.completeResults.nftActivity.topCollections.slice(0, 3).join(', ')}\n\n`;
  }
  
  const totalProjects = defiProtocols + nftCollections;
  response += `🎯 **Tổng cộng:** ${totalProjects} projects chính\n`;
  response += `📈 **Đánh giá:** ${this.getEngagementLevel(totalProjects)}`;

  return response;
}

getEngagementLevel(projectCount) {
  if (projectCount >= 20) return "Rất tích cực - Heavy DeFi user";
  if (projectCount >= 10) return "Tích cực - Active DeFi user";
  if (projectCount >= 5) return "Trung bình - Moderate user";
  return "Ít tương tác - Beginner user";
}

// Modify the sendMessage method to check for specific commands first
async sendMessage() {
  const text = this.inputEl.value.trim();
  if (!text) return;
  
  // Display user message
  this.appendMessage(text, 'user');
  this.messages.push({ role: 'user', content: text });
  this.inputEl.value = '';
  this.boxEl.classList.remove('typing');
  
  // Check for specific commands first
  const specificResponse = this.handleSpecificCommands(text);
  
  if (specificResponse) {
    // Handle specific command locally
    const assistantMsg = this.appendMessage('', 'assistant');
    const bubble = assistantMsg.querySelector('.chatbot-bubble');
    this.animateTyping(specificResponse, bubble);
  } else {
    // Handle with AI API
    const assistantMsg = this.appendMessage('', 'assistant');
    const bubble = assistantMsg.querySelector('.chatbot-bubble');
    bubble.innerHTML = '<span class="typing-indicator"><span>.</span><span>.</span><span>.</span></span>';
    this.scrollToBottom();
    this.callChatAPI(text, bubble);
  }
  
  this.inputEl.focus();
}

  async callChatAPI(text, messageElement) {
    try {
      // Thêm thông tin wallet và score vào message đầu tiên
      let contextMessages = [...this.messages];
      if (this.messages.length <= 2 && (this.walletAddress || this.scoreData)) {
        let systemPrompt = "You are a helpful AI assistant that helps users understand their Web3 credit score.";
        
        if (this.walletAddress) {
          systemPrompt += ` The user's wallet address is ${this.walletAddress}.`;
        }
        
        if (this.scoreData) {
          systemPrompt += ` Their credit score is ${this.scoreData.score} (${this.scoreData.scoreLabel}).`;
          if (this.scoreData.explanation) {
            systemPrompt += ` Score explanation: ${this.scoreData.explanation}`;
          }
        }
        
        contextMessages.unshift({ role: 'system', content: systemPrompt });
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Xóa indicator typing
      messageElement.innerHTML = '';
      
      // Biến lưu nội dung phản hồi
      let responseContent = '';
      
      // Đọc từng phần của stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        responseContent += chunk;
        
        // Cập nhật nội dung tin nhắn
        messageElement.innerHTML += chunk;
        this.scrollToBottom(); // Cuộn sau mỗi chunk
      }
      
      // Lưu tin nhắn của assistant vào mảng messages
      this.messages.push({ role: 'assistant', content: responseContent });
      
      // Cuộn cuối cùng sau khi hoàn thành
      this.scrollToBottom();
      
      // Thêm suggestions sau khi trả lời xong
      if (this.messages.length < 4) {
        setTimeout(() => {
          this.appendSuggestions([
            'Can you explain my score in simple terms?',
            'What factors impact my score most?',
            'How do I compare to other wallets?'
          ]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error calling chat API:', error);
      messageElement.innerHTML = 'Sorry, I encountered an error. Please try again.';
      
      // Thêm nút retry
      const retryButton = document.createElement('button');
      retryButton.className = 'chatbot-retry-btn';
      retryButton.innerHTML = '<i class="fas fa-redo"></i> Retry';
      retryButton.addEventListener('click', () => {
        // Xóa tin nhắn lỗi
        messageElement.parentNode.remove();
        
        // Thử lại
        const assistantMsg = this.appendMessage('', 'assistant');
        const bubble = assistantMsg.querySelector('.chatbot-bubble');
        this.callChatAPI(text, bubble);
      });
      
      messageElement.appendChild(retryButton);
      this.scrollToBottom();
    }
  }
  
  toggleChatbot() {
    if (!this.isOpen) {
      this.openChatbot();
    } else if (this.isMinimized) {
      this.maximizeChatbot();
    } else {
      this.minimizeChatbot();
    }
  }
  
  openChatbot() {
    this.isOpen = true;
    this.isMinimized = false;
    this.boxEl.style.display = 'flex';
    this.container.classList.add('open');
    
    // Xóa notification dot
    this.launcherEl.querySelector('.chatbot-notification-dot').style.display = 'none';
    
    // Focus input và cuộn xuống dưới
    setTimeout(() => {
      this.inputEl.focus();
      this.scrollToBottom();
    }, 300);
    
    this.adjustPosition();
  }
  
  minimizeChatbot() {
    this.isOpen = true;
    this.isMinimized = true;
    this.boxEl.style.display = 'none';
  }
  
  maximizeChatbot() {
    this.isMinimized = false;
    this.boxEl.style.display = 'flex';
    
    this.adjustPosition();
    // Cuộn xuống dưới khi maximize
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
  
  closeChatbot() {
    this.isOpen = false;
    this.boxEl.style.display = 'none';
    this.container.classList.remove('open');
  }
  
  show() {
    console.log('Showing chatbot');
    this.container.style.display = 'block';
    this.container.classList.add('animate-in');
    
    // Thêm animation cho notification
    setTimeout(() => {
      const notificationDot = this.launcherEl.querySelector('.chatbot-notification-dot');
      if (notificationDot) {
        notificationDot.style.display = 'block';
        notificationDot.classList.add('pulse');
      }
    }, 2000);
  }
  
  hide() {
    this.container.style.display = 'none';
    this.container.classList.remove('animate-in');
  }
  
  updateData(data) {
    // Flag để theo dõi liệu có thay đổi
    let dataChanged = false;
    
    // Check if wallet address changed
    if (data.walletAddress && this.walletAddress !== data.walletAddress) {
      this.walletAddress = data.walletAddress;
      dataChanged = true;
    }
    
    // Check if score data changed
    if (data.scoreData) {
      // Nếu chưa có dữ liệu score trước đó hoặc score đã thay đổi
      if (!this.scoreData || 
          this.scoreData.score !== data.scoreData.score) {
        
        // Làm tròn điểm số thành số nguyên
        if (data.scoreData.score) {
          data.scoreData.score = Math.round(data.scoreData.score);
        }
        
        // Đảm bảo luôn có scoreLabel
        if (!data.scoreData.scoreLabel || data.scoreData.scoreLabel === 'undefined') {
          data.scoreData.scoreLabel = this.getScoreLabel(data.scoreData.score);
        }
        
        this.scoreData = data.scoreData;
        dataChanged = true;
      }
    }
    
    // Chỉ thêm tin nhắn mới nếu dữ liệu thay đổi hoặc không có tin nhắn nào
    if (dataChanged || this.messages.length === 0) {
      // Xóa tin nhắn cũ nếu có
      this.clearMessages();
      // Thêm tin nhắn mới
      this.addInitialMessages();
    }
  }
  
  clearMessages() {
    this.messages = [];
    if (this.messagesEl) {
      this.messagesEl.innerHTML = '';
    }
  }
  
  getScoreLabel(score) {
    if (!score) return 'Unknown';
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  }
  
  adjustPosition() {
    // Đảm bảo chatbot luôn nằm trong viewport
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (windowWidth < 768) {
      this.boxEl.style.width = '85vw';
      this.boxEl.style.height = '70vh';
      this.boxEl.style.bottom = '80px';
      this.boxEl.style.right = '10px';
    } else {
      this.boxEl.style.width = '380px';
      this.boxEl.style.height = '520px';
      this.boxEl.style.bottom = '100px';
      this.boxEl.style.right = '20px';
    }
  }
}

// Remove the external fake data setting since it's now built into the constructor
console.log("🧪 Chatbot will use built-in fake data");