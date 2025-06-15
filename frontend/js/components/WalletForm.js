export function initWalletForm(onSubmit) {
  const input = document.getElementById('wallet-address-input');
  const btn = document.getElementById('wallet-submit-btn');
  
  // Validate wallet address format
  function isValidWalletAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Handle form submission
  function handleSubmit() {
    const addr = input.value.trim();
    
    if (!addr) {
      alert('Please enter a wallet address');
      return;
    }
    
    if (!isValidWalletAddress(addr)) {
      alert('Please enter a valid wallet address (0x followed by 40 hex characters)');
      return;
    }
    
    // Disable button during processing
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    
    onSubmit(addr).finally(() => {
      // Re-enable button
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search"></i> Check Score';
    });
  }
  
  // Event listeners
  btn.addEventListener('click', handleSubmit);
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  });
  
  // Real-time validation feedback
  input.addEventListener('input', (e) => {
    const addr = e.target.value.trim();
    const inputGroup = input.parentElement;
    
    if (addr && !isValidWalletAddress(addr)) {
      inputGroup.style.borderColor = 'var(--accent-red)';
    } else {
      inputGroup.style.borderColor = 'var(--border-color)';
    }
  });
}