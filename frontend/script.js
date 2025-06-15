document.addEventListener('DOMContentLoaded', function() {
    // Set the score value and rotate the needle based on score
    const score = 835;
    const minScore = 300;
    const maxScore = 900;
    
    // Calculate needle angle (0 = leftmost, 180 = rightmost)
    const scoreRange = maxScore - minScore;
    const scorePercentage = (score - minScore) / scoreRange;
    const needleAngle = scorePercentage * 180;
    
    const needle = document.querySelector('.gauge-needle');
    
    // Start with the needle at 0 degrees and then animate to the actual position
    needle.style.transform = 'rotate(0deg)';
    
    // After a short delay, animate the needle to the correct position
    setTimeout(() => {
        needle.style.transform = `rotate(${needleAngle}deg)`;
    }, 500);
    
    // Animate score number counting up
    const scoreElement = document.querySelector('.score-value');
    animateCounter(scoreElement, 0, score, 2000);
    
    // Add active state to tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Add active state to chain options
    const chainOptions = document.querySelectorAll('.chain-option');
    chainOptions.forEach(option => {
        option.addEventListener('click', function() {
            chainOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
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
});

// Function to animate counting up to a number
function animateCounter(element, start, end, duration) {
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

// Add interactivity to show tooltips for score ranges
const segments = document.querySelectorAll('.segment');
segments.forEach(segment => {
    segment.addEventListener('mouseenter', function() {
        const label = this.querySelector('.segment-label');
        label.style.transform = 'translateY(-5px)';
        label.style.transition = 'transform 0.3s ease';
    });
    
    segment.addEventListener('mouseleave', function() {
        const label = this.querySelector('.segment-label');
        label.style.transform = 'translateY(0)';
    });
});

// Add interactivity to explanation items
document.querySelectorAll('.explanation-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.style.transition = 'background-color 0.3s ease';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    });
});

// Add pulse effect to the sync button
document.querySelector('.sync-button button').addEventListener('click', function() {
    this.classList.add('pulsing');
    setTimeout(() => {
        this.classList.remove('pulsing');
        this.innerHTML = '<i class="fas fa-sync-alt"></i> SYNCED Just Now';
    }, 1500);
    this.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> SYNCING...';
});