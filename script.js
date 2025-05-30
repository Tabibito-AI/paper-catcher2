// Paper Catcher Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');

    // Navigation click handlers
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get view type
            const viewType = this.getAttribute('data-view');
            
            // Handle different views
            handleViewChange(viewType);
        });
    });

    // Modal functionality - use event delegation for dynamically added buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('details-btn')) {
            openModal(e.target);
        }
    });

    modalClose.addEventListener('click', function() {
        closeModal();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Twitter/X share functionality
    const twitterLinks = document.querySelectorAll('.twitter-link');
    twitterLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get paper title from the closest paper item
            const paperItem = this.closest('.paper-item');
            const title = paperItem.querySelector('.paper-title').textContent;
            
            // Create Twitter share URL
            const tweetText = encodeURIComponent(`${title} - Paper Catcher で発見した論文`);
            const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(window.location.href)}`;
            
            // Open Twitter in new window
            window.open(tweetUrl, '_blank', 'width=550,height=420');
        });
    });

    function handleViewChange(viewType) {
        // This would typically load different data or filter existing data
        // For now, we'll just show a message
        console.log(`Switching to view: ${viewType}`);
        
        // In a real implementation, you would:
        // 1. Fetch data for the specific view
        // 2. Update the main content area
        // 3. Handle loading states
        
        // Placeholder for different view implementations
        switch(viewType) {
            case 'registration':
                // Show papers sorted by registration date
                break;
            case 'journal':
                // Show papers grouped by journal
                break;
            case 'publication':
                // Show papers sorted by publication date
                break;
            case 'archive':
                // Show archived papers
                break;
        }
    }

    function openModal(button) {
        // Get paper data from button's data attributes
        const title = button.getAttribute('data-title');
        const translatedTitle = button.getAttribute('data-translated-title');
        const authors = button.getAttribute('data-authors');
        const journal = button.getAttribute('data-journal');
        const date = button.getAttribute('data-date');
        const abstract = button.getAttribute('data-abstract');
        const translatedAbstract = button.getAttribute('data-translated-abstract');
        const paperUrl = button.getAttribute('data-url');

        // Populate modal content - show original title, with translated title if available
        const displayTitle = translatedTitle && translatedTitle.trim() ?
            `${title} (${translatedTitle})` : title;
        document.getElementById('modal-title').textContent = displayTitle;
        document.getElementById('modal-authors').textContent = authors || 'Unknown';
        document.getElementById('modal-journal').textContent = journal || 'Unknown';
        document.getElementById('modal-date').textContent = date || 'Unknown';
        document.getElementById('modal-abstract-text').textContent = abstract || 'No abstract available';
        document.getElementById('modal-translation-text').textContent = translatedAbstract || 'No translation available';
        document.getElementById('modal-paper-link').href = paperUrl || '#';

        // Show/hide translation section based on availability
        const translationSection = document.getElementById('modal-translation-section');
        if (translatedAbstract && translatedAbstract !== abstract) {
            translationSection.style.display = 'block';
        } else {
            translationSection.style.display = 'none';
        }

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading animation for paper links
    const paperLinks = document.querySelectorAll('.paper-link');
    paperLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Add a small loading indicator
            const originalText = this.textContent;
            this.textContent = '読み込み中...';
            
            // Restore original text after a short delay
            setTimeout(() => {
                this.textContent = originalText;
            }, 1000);
        });
    });

    // Initialize tooltips or other UI enhancements
    initializeUIEnhancements();

    function initializeUIEnhancements() {
        // Add hover effects for paper items
        const paperItems = document.querySelectorAll('.paper-item');
        paperItems.forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });

        // Add keyboard navigation support
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                // Enhance tab navigation visibility
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // Performance optimization: Lazy loading for images (if any)
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Add search functionality (placeholder)
    function addSearchFunctionality() {
        // This would be implemented to search through papers
        // Could include filtering by title, author, journal, etc.
        console.log('Search functionality would be implemented here');
    }

    // Auto-refresh functionality (for live updates)
    function setupAutoRefresh() {
        // In a real application, this would periodically check for new papers
        // and update the display without requiring a page refresh
        setInterval(() => {
            console.log('Checking for new papers...');
            // Implementation would go here
        }, 300000); // Check every 5 minutes
    }

    // Initialize auto-refresh if needed
    // setupAutoRefresh();

    console.log('Paper Catcher frontend initialized successfully');
});
