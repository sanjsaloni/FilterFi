// Content script for Job Experience Filter extension
(function() {
    'use strict';

    let filterEnabled = true;
    let currentExperienceLevel = 2;
    let stats = { total: 0, matching: 0, filtered: 0 };
    let observer = null;

    // Experience level patterns for matching
    const experiencePatterns = {
        internship: /intern|internship|student/i,
        entryLevel: /entry.?level|0.?2\s*years?|1.?2\s*years?|junior|graduate|new.?grad/i,
        associate: /associate|2.?4\s*years?|3.?5\s*years?/i,
        midSenior: /mid.?senior|senior|4.?8\s*years?|5.?7\s*years?|6.?8\s*years?/i,
        director: /director|lead|principal|8\+?\s*years?|10\+?\s*years?|manager/i
    };

    // Initialize the filter
    function initialize() {
        console.log('Job Experience Filter: Initializing content script');
        
        // Load settings from storage
        chrome.storage.sync.get(['enabled', 'experienceLevel'], function(result) {
            filterEnabled = result.enabled !== undefined ? result.enabled : true;
            currentExperienceLevel = result.experienceLevel !== undefined ? result.experienceLevel : 2;
            
            if (filterEnabled) {
                startFiltering();
            }
        });

        // Set up mutation observer to handle dynamically loaded content
        setupMutationObserver();
    }

    function setupMutationObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(function(mutations) {
            let shouldRefilter = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new job listings were added
                            if (node.querySelector && (
                                node.querySelector('.job-card-container') ||
                                node.querySelector('[data-job-id]') ||
                                node.classList.contains('job-card-container')
                            )) {
                                shouldRefilter = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (shouldRefilter && filterEnabled) {
                setTimeout(applyFiltering, 500); // Debounce
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function startFiltering() {
        console.log('Job Experience Filter: Starting filtering with level', currentExperienceLevel);
        applyFiltering();
        
        // Reapply filtering when new content loads
        setTimeout(applyFiltering, 2000);
        setInterval(applyFiltering, 5000);
    }

    function applyFiltering() {
        const jobCards = findJobCards();
        stats = { total: jobCards.length, matching: 0, filtered: 0 };

        jobCards.forEach(function(jobCard) {
            const experienceLevel = extractExperienceLevel(jobCard);
            const shouldShow = shouldShowJob(experienceLevel, currentExperienceLevel);
            
            if (shouldShow) {
                showJob(jobCard);
                stats.matching++;
            } else {
                dimJob(jobCard);
                stats.filtered++;
            }
        });

        updateStats();
        console.log('Job Experience Filter: Applied filtering to', stats.total, 'jobs');
    }

    function findJobCards() {
        // Multiple selectors to catch different LinkedIn layouts
        const selectors = [
            '.job-card-container',
            '[data-job-id]',
            '.job-card',
            '.jobs-search-results__list-item',
            '.job-search-card'
        ];

        let jobCards = [];
        
        selectors.forEach(function(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(function(element) {
                if (!jobCards.includes(element)) {
                    jobCards.push(element);
                }
            });
        });

        return jobCards;
    }

    function extractExperienceLevel(jobCard) {
        // Get text content from job card
        const textContent = jobCard.textContent || '';
        const jobTitle = getJobTitle(jobCard);
        const jobDescription = getJobDescription(jobCard);
        
        const fullText = (textContent + ' ' + jobTitle + ' ' + jobDescription).toLowerCase();

        // Check for specific experience patterns
        if (experiencePatterns.internship.test(fullText)) {
            return 0; // Internship
        }
        
        if (experiencePatterns.entryLevel.test(fullText)) {
            return 2; // Entry level
        }
        
        if (experiencePatterns.associate.test(fullText)) {
            return 4; // Associate
        }
        
        if (experiencePatterns.midSenior.test(fullText)) {
            return 6; // Mid-Senior
        }
        
        if (experiencePatterns.director.test(fullText)) {
            return 8; // Director
        }

        // Extract numeric experience requirements
        const yearMatches = fullText.match(/(\d+)[\s\-\+]*(?:to|-)?\s*(\d+)?\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:experience|exp)/g);
        
        if (yearMatches) {
            const numbers = yearMatches[0].match(/\d+/g);
            if (numbers) {
                const minYears = parseInt(numbers[0]);
                return Math.min(minYears, 10); // Cap at 10
            }
        }

        // Default to entry level if no specific experience mentioned
        return 2;
    }

    function getJobTitle(jobCard) {
        const titleSelectors = [
            '.job-card-list__title',
            '.job-title',
            'h3 a',
            'h4 a',
            '.job-card-container__link',
            '[data-control-name="job_card_title"]'
        ];

        for (let selector of titleSelectors) {
            const element = jobCard.querySelector(selector);
            if (element) {
                return element.textContent || '';
            }
        }
        
        return '';
    }

    function getJobDescription(jobCard) {
        const descSelectors = [
            '.job-card-list__footer-wrapper',
            '.job-description',
            '.job-card-container__metadata',
            '.job-card-list__company-name'
        ];

        for (let selector of descSelectors) {
            const element = jobCard.querySelector(selector);
            if (element) {
                return element.textContent || '';
            }
        }
        
        return '';
    }

    function shouldShowJob(jobExperienceLevel, userExperienceLevel) {
        if (!filterEnabled) return true;
        
        // Show jobs that match or are slightly below user's experience level
        const tolerance = 2; // Allow jobs up to 2 levels below
        return jobExperienceLevel <= userExperienceLevel + tolerance;
    }

    function dimJob(jobCard) {
        jobCard.classList.add('job-experience-filtered');
        jobCard.style.transition = 'all 0.3s ease';
    }

    function showJob(jobCard) {
        jobCard.classList.remove('job-experience-filtered');
        jobCard.style.transition = 'all 0.3s ease';
    }

    function updateStats() {
        // Send stats to popup
        chrome.runtime.sendMessage({
            action: 'updateStats',
            stats: stats
        });
    }

    function removeAllFiltering() {
        const jobCards = findJobCards();
        jobCards.forEach(function(jobCard) {
            showJob(jobCard);
        });
        
        stats = { total: jobCards.length, matching: jobCards.length, filtered: 0 };
        updateStats();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.action) {
            case 'toggleFilter':
                filterEnabled = request.enabled;
                if (filterEnabled) {
                    applyFiltering();
                } else {
                    removeAllFiltering();
                }
                break;
                
            case 'updateFilter':
                filterEnabled = request.enabled;
                currentExperienceLevel = request.experienceLevel;
                if (filterEnabled) {
                    applyFiltering();
                } else {
                    removeAllFiltering();
                }
                break;
                
            case 'getStats':
                updateStats();
                break;
                
            case 'initializeFilter':
                filterEnabled = request.enabled;
                currentExperienceLevel = request.experienceLevel;
                if (filterEnabled) {
                    startFiltering();
                }
                break;
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also initialize after a short delay to catch dynamically loaded content
    setTimeout(initialize, 1000);

})();

