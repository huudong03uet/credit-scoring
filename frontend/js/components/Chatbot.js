export class Chatbot {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:8000/chatbot/message/stream';
    this.walletAddress = options.walletAddress || null;
    this.scoreData = options.scoreData || null;
    this.messages = [];
    this.isOpen = false;
    this.isMinimized = false;
    this.typing = false;
    
    this.createChatbotUI();
    this.setupEventListeners();
    
    // Thêm tin nhắn chào mừng ban đầu từ chatbot
    this.addInitialMessages();
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
    
    // Then type out the message
    setTimeout(() => {
      element.innerHTML = '';
      const typeChar = () => {
        if (i < content.length) {
          element.innerHTML += content.charAt(i);
          i++;
          setTimeout(typeChar, speed);
        }
        this.scrollToBottom();
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
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  
  sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    
    // Hiển thị tin nhắn của người dùng
    this.appendMessage(text, 'user');
    
    // Thêm vào mảng messages
    this.messages.push({ role: 'user', content: text });
    
    // Xóa input
    this.inputEl.value = '';
    this.boxEl.classList.remove('typing');
    
    // Thêm tin nhắn trống cho assistant
    const assistantMsg = this.appendMessage('', 'assistant');
    const bubble = assistantMsg.querySelector('.chatbot-bubble');
    
    // Thêm chỉ báo typing
    bubble.innerHTML = '<span class="typing-indicator"><span>.</span><span>.</span><span>.</span></span>';
    
    // Call API để lấy response
    this.callChatAPI(text, bubble);
    
    // Focus input để tiếp tục chat
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
        this.scrollToBottom();
      }
      
      // Lưu tin nhắn của assistant vào mảng messages
      this.messages.push({ role: 'assistant', content: responseContent });
      
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
    
    // Focus input
    setTimeout(() => {
      this.inputEl.focus();
    }, 300);
    
    this.adjustPosition();
    this.scrollToBottom();
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
    this.scrollToBottom();
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