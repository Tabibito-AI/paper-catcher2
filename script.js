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

    // Initialize papers data on page load
    loadPapersData();

    // Store papers data globally
    window.papersData = [];

    function handleViewChange(viewType) {
        console.log(`Switching to view: ${viewType}`);

        // Load papers data if not already loaded
        if (window.papersData.length === 0) {
            loadPapersData().then(() => {
                sortAndDisplayPapers(viewType);
            });
        } else {
            sortAndDisplayPapers(viewType);
        }
    }

    // Helper function to format date, displaying '本日' for future dates
    const formatDisplayDate = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pubDate = new Date(dateString);
        pubDate.setHours(0, 0, 0, 0);

        if (!dateString || pubDate > today) {
            return '本日';
        } else {
            return new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
        }
    };

    function loadPapersData() {
        return new Promise((resolve) => {
            // Extract papers data from current page
            const paperItems = document.querySelectorAll('.paper-item');
            const papers = [];

            paperItems.forEach(item => {
                const dateElement = item.querySelector('.publication-date');
                const detailsBtn = item.querySelector('.details-btn');

                // Apply date formatting to the main card's displayed date
                if (dateElement && detailsBtn) {
                    const rawDate = detailsBtn.getAttribute('data-date') || '';
                    dateElement.textContent = formatDisplayDate(rawDate);
                }

                const titleElement = item.querySelector(".paper-title");
                const authorElement = item.querySelector(".paper-author");
                const journalElement = item.querySelector(".paper-journal");
                // dateElementとdetailsBtnは既に上で取得・処理済みなので、ここでは再取得しない

                if (titleElement && detailsBtn) {
                    papers.push({
                        title: titleElement.textContent.trim(),
                        author: authorElement ? authorElement.textContent.trim() : 'Unknown',
                        journal: detailsBtn.getAttribute('data-journal') || 'Unknown',
                        publicationDate: detailsBtn.getAttribute('data-date') || '1900-01-01',
                        abstract: detailsBtn.getAttribute('data-abstract') || '',
                        translatedAbstract: detailsBtn.getAttribute('data-translated-abstract') || '',
                        translatedTitle: detailsBtn.getAttribute('data-translated-title') || '',
                        url: detailsBtn.getAttribute('data-url') || '#',
                        element: item
                    });
                }
            });

            window.papersData = papers;
            resolve();
        });
    }

    function sortAndDisplayPapers(viewType) {
        if (window.papersData.length === 0) return;

        const sortedPapers = sortPapers(window.papersData, viewType);
        displayPapers(sortedPapers);
    }

    function displayPapers(papers) {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // Clear current content
        mainContent.innerHTML = '';

        // Add papers in sorted order
        papers.forEach(paper => {
            if (paper.element) {
                mainContent.appendChild(paper.element.cloneNode(true));
            }
        });

        // Re-initialize UI enhancements for new elements
        initializeUIEnhancements();

        // Re-attach event listeners for new elements
        attachEventListeners();
    }

    function attachEventListeners() {
        // Re-attach Twitter share functionality
        const twitterLinks = document.querySelectorAll('.twitter-link');
        twitterLinks.forEach(link => {
            link.removeEventListener('click', handleTwitterShare); // Remove existing
            link.addEventListener('click', handleTwitterShare);
        });

        // Re-attach paper link loading animation
        const paperLinks = document.querySelectorAll('.paper-link');
        paperLinks.forEach(link => {
            link.removeEventListener('click', handlePaperLinkClick); // Remove existing
            link.addEventListener('click', handlePaperLinkClick);
        });
    }

    function handleTwitterShare(e) {
        e.preventDefault();

        // Get paper title and URL from the closest paper item
        const paperItem = this.closest('.paper-item');
        const title = paperItem.querySelector('.paper-title').textContent;
        const paperLink = paperItem.querySelector('.paper-link');
        const paperUrl = paperLink ? paperLink.href : '';

        // Create Twitter share URL with paper URL instead of site URL
        const tweetText = encodeURIComponent(title);
        const shareUrl = paperUrl || window.location.href;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;

        // Open Twitter in new window
        window.open(tweetUrl, '_blank', 'width=550,height=420');
    }

    function handlePaperLinkClick() {
        // Add a small loading indicator
        const originalText = this.textContent;
        this.textContent = '読み込み中...';

        // Restore original text after a short delay
        setTimeout(() => {
            this.textContent = originalText;
        }, 1000);
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

        // Debug logging
        console.log('Modal opening with data:', {
            title,
            paperUrl,
            hasUrl: !!paperUrl,
            urlNotEmpty: paperUrl !== '#'
        });

        // Populate modal content - show original title, with translated title if available
        const displayTitle = translatedTitle && translatedTitle.trim() ?
            `${title} (${translatedTitle})` : title;
        document.getElementById('modal-title').textContent = displayTitle;
        document.getElementById('modal-authors').textContent = authors || 'Unknown';
        document.getElementById('modal-journal').textContent = journal || 'Unknown';
             // Format the date for display. If the date is in the future, display '本日'.
        document.getElementById('modal-date').textContent = formatDisplayDate(date) || 'Unknown';        document.getElementById('modal-abstract-text').textContent = abstract || 'No abstract available';
        document.getElementById('modal-translation-text').textContent = translatedAbstract || 'No translation available';

        // Set paper link URL
        const modalPaperLink = document.getElementById('modal-paper-link');
        console.log('Setting modal paper link:', paperUrl);

        if (paperUrl && paperUrl !== '#' && paperUrl.trim() !== '') {
            modalPaperLink.href = paperUrl;
            modalPaperLink.target = '_blank';
            modalPaperLink.style.display = 'inline-block';
            console.log('Modal paper link set to:', modalPaperLink.href);

            // Add click event listener as backup
            modalPaperLink.onclick = function(e) {
                e.preventDefault();
                console.log('Modal paper link clicked, opening:', paperUrl);
                window.open(paperUrl, '_blank');
                return false;
            };
        } else {
            modalPaperLink.href = '#';
            modalPaperLink.removeAttribute('target');
            modalPaperLink.onclick = null;
            modalPaperLink.style.display = 'none';
            console.log('Modal paper link hidden (no valid URL)');
        }

        // Set up Twitter share button
        const modalTwitterBtn = document.querySelector('#modal .btn-secondary');
        if (modalTwitterBtn) {
            modalTwitterBtn.onclick = function(e) {
                e.preventDefault();
                const tweetText = encodeURIComponent(title);
                const shareUrl = paperUrl || window.location.href;
                const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;
                window.open(tweetUrl, '_blank', 'width=550,height=420');
            };
        }

        // Show/hide translation section based on availability
        const translationSection = document.getElementById('modal-translation-section');
        if (translatedAbstract && translatedAbstract.trim() && translatedAbstract !== abstract && translatedAbstract !== 'No translation available') {
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

    // Initialize event listeners
    attachEventListeners();

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

    // Sort papers by different criteria
    function sortPapers(papers, sortType) {
        const sortedPapers = [...papers];

        switch (sortType) {
            case 'registration':
                // Sort by registration date (newest first) - assuming papers are already in registration order
                return sortedPapers;

            case 'journal':
                // Sort by journal name alphabetically
                return sortedPapers.sort((a, b) => {
                    const journalA = a.journal || 'Unknown';
                    const journalB = b.journal || 'Unknown';
                    return journalA.localeCompare(journalB);
                });

            case 'publication':
                // Sort by publication date (newest first)
                return sortedPapers.sort((a, b) => {
                    const dateA = new Date(a.publicationDate || '1900-01-01');
                    const dateB = new Date(b.publicationDate || '1900-01-01');
                    return dateB - dateA;
                });

            case 'archive':
                // Sort by publication date (oldest first) for archive view
                return sortedPapers.sort((a, b) => {
                    const dateA = new Date(a.publicationDate || '1900-01-01');
                    const dateB = new Date(b.publicationDate || '1900-01-01');
                    return dateA - dateB;
                });

            default:
                return sortedPapers;
        }
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
