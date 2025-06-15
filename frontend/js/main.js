import { WalletImport } from './components/WalletImport.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the enhanced wallet import interface
  new WalletImport();
  
  // Initialize other app functionality
  initializeApp();
});

function initializeApp() {
  // Handle navigation
  setupNavigation();
  
  // Handle tab switching
  setupTabs();
  
  // Handle chain selection
  setupChainSelection();
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

function setupTabs() {
  const tabs = document.querySelectorAll('.tabs-navigation .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function setupChainSelection() {
  const chainOptions = document.querySelectorAll('.chain-option');
  chainOptions.forEach(option => {
    option.addEventListener('click', () => {
      chainOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
    });
  });
}