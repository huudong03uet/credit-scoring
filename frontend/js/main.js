import { WalletImport } from './components/WalletImport.js';
import { CreditScoreDisplay } from './components/CreditScoreDisplay.js';
import { RawDataVisualizer } from './components/RawDataVisualizer.js';
import { Chatbot } from './components/Chatbot.js';

// Đảm bảo chỉ tạo một instance chatbot

// Biến toàn cục để lưu trữ chatbot instance
let chatbotInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing app...');
  
  // Initialize the wallet import functionality
  const walletImport = new WalletImport();
  
  // Initialize credit score display
  const creditScoreDisplay = new CreditScoreDisplay();
  
  // Initialize raw data visualizer
  const dataVisualizer = new RawDataVisualizer();
  
  // Chỉ khởi tạo chatbot nếu chưa tồn tại
  if (!chatbotInstance) {
    chatbotInstance = new Chatbot({
      apiUrl: 'http://localhost:8000/chatbot/message/stream'
    });
    console.log('Chatbot initialized');
  }
  
  // Initialize other app functionality
  initializeApp();
  
  // Lắng nghe sự kiện scoringComplete
  // Sử dụng biến cờ để chỉ xử lý sự kiện một lần sau mỗi lần gửi điểm
  let processingEvent = false;
  
  document.addEventListener('scoringComplete', (event) => {
    // Ngăn xử lý nhiều sự kiện liên tiếp
    if (processingEvent) return;
    processingEvent = true;
    
    const { walletAddress, scoreData } = event.detail;
    console.log('🔥 Scoring complete event received', walletAddress, scoreData);
    
    // Làm tròn điểm số
    if (scoreData && scoreData.score) {
      scoreData.score = Math.round(scoreData.score);
    }
    
    // Update chatbot with wallet and score data
    if (chatbotInstance) {
      chatbotInstance.updateData({
        walletAddress: walletAddress,
        scoreData: scoreData
      });
      
      // Show the chatbot after a short delay
      setTimeout(() => {
        chatbotInstance.show();
        // Reset biến cờ sau khi hoàn thành
        processingEvent = false;
      }, 1000);
    } else {
      console.error('⚠️ Chatbot not initialized!');
      processingEvent = false;
    }
  });
  
  // Set up demo button
  const demoWalletBtn = document.getElementById('demo-wallet-btn');
  if (demoWalletBtn) {
    demoWalletBtn.addEventListener('click', () => {
      walletImport.testWithDemoWallet();
    });
  }
  
  // Setup analyze button
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      walletImport.handleAddressImport();
    });
  }
  
  
  const resultsSection = document.getElementById('results-section');
  if (resultsSection) {
    observer.observe(resultsSection, { 
      attributes: true, 
      attributeFilter: ['style'] 
    });
  }
});

function initializeApp() {
  // Set up navigation
  setupNavigation();
  
  // Set up theme toggle
  setupThemeToggle();
  
  // Set up wallet connect modal
  setupWalletModal();
  
  // Add animation to score explanation items
  const explanationItems = document.querySelectorAll('.explanation-item');
  explanationItems.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add('fadeIn');
    }, 300 * index);
  });
  
  // Add hover effects to financial cards
  const financialCards = document.querySelectorAll('.financial-card');
  financialCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function setupThemeToggle() {
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });
  }
}

function setupWalletModal() {
  const connectBtn = document.getElementById('connect-wallet-btn');
  // FIX: Sửa ID của modal
  const modal = document.getElementById('wallet-connect-modal'); 
  const closeBtn = modal?.querySelector('.close-modal');
  
  if (connectBtn && modal) {
    connectBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

// Function to animate counting up to a number
export function animateCounter(element, start, end, duration) {
  if (!element) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    element.textContent = currentValue;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}