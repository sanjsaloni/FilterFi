// Content script for Job Experience Filter extension
(function() {
    'use strict';

    // --- Target page check: Only run on LinkedIn job pages ---
    

    let filterEnabled = false;
    let currentExperienceLevel = 2;
    let stats = { total: 0, matching: 0, filtered: 0 };
    let observer = null;
    let extractionResults = [];
    console.log(filterEnabled,'10')
    
    // let floatingPopup = null;
    function isTargetPage() {
        return (
            window.location.hostname.includes("www.linkedin.com") &&
            window.location.pathname.includes("/jobs/")
            // document.querySelector('.jobs-search-results__list')
        );
    }
    if (!isTargetPage()) {
        alert("Not a LinkedIn jobs page. Exiting content script.");
        setupMutationObserver();
    }

    // Experience level patterns for matching
    // const experiencePatterns = {
    //     internship: /intern|internship|student/i,
    //     entryLevel: /entry.?level|0.?2\s*years?|1.?2\s*years?|junior|graduate|new.?grad/i,
    //     associate: /associate|2.?4\s*years?|3.?5\s*years?/i,
    //     midSenior: /mid.?senior|senior|4.?8\s*years?|5.?7\s*years?|6.?8\s*years?/i,
    //     director: /director|lead|principal|8\+?\s*years?|10\+?\s*years?|manager/i
    // };

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log('Content script received message:', request);
        switch (request.action) {
            case 'updateStats':  
                console.log("Updating in the switch block!")
                updateStats();
                break;

            case 'toggleFilter':
                filterEnabled = request.filterEnabled;
                // Persist filterEnabled state
                chrome.storage.sync.set({ filterEnabled });
                if (filterEnabled) {
                    applyFiltering();
                } else {
                    removeAllFiltering();
                }
                break;
                
            case 'updateFilter':
                filterEnabled = request.filterEnabled;
                currentExperienceLevel = request.experienceLevel;
                // Persist filterEnabled state
                chrome.storage.sync.set({ filterEnabled });
                if (filterEnabled) {
                    applyFiltering();
                } else {
                    removeAllFiltering();
                }
                break;
                
            // case 'getStats':
            //     console.log("Getting stats!")
            //     updateStats();
            //     break;
                
            case 'initializeFilter':
                filterEnabled = request.filterEnabled;
                currentExperienceLevel = request.experienceLevel;
                if (filterEnabled) {
                    startFiltering();
                }
                break;

            case 'toggleFloatingPopup':
                createOrToggleFloatingPopup();
                break;
        }
    }); // Event listener.

    // Floating popup logic
    let floatingPopup = null;

    function createOrToggleFloatingPopup() {
        console.log("entered the toggle popup.")
        if (floatingPopup && document.body.contains(floatingPopup)) {
            console.log("removing.")
            floatingPopup.remove();
            floatingPopup = null;
            removeAllFiltering();
            return;
        }
        // startFiltering();
        console.log("Updating when entered.")
        updateStats();
        console.log(stats, "32")
        console.log(filterEnabled, "33")
        floatingPopup = document.createElement('div');
        floatingPopup.className = 'je-floating-popup';
        floatingPopup.innerHTML = `
            <style>
                .je-slider-container {
                    padding: 8px 0;
                }
                .je-slider-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #555;
                    padding: 0 5px; /* Adds a little space at the ends */
                }
                .je-experience-slider {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: #ddd;
                    outline: none;
                    -webkit-appearance: none;
                    margin-bottom: 8px;
                }
                .je-experience-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                }
                .je-experience-slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                }
            </style>
            <div class="je-floating-popup-header">
                <span>Job Experience Filter</span>
                <button class="je-floating-popup-close" title="Close">&times;</button>
            </div>
            <div class="je-floating-popup-body">
                <label for="je-experience-slider" style="font-weight:bold;">Experience (years):</label>
                
                <div class="je-slider-container">
                    <input type="range" id="je-experience-slider" class="je-experience-slider" min="0" max="10" step="1" value="2">
                    <div class="je-slider-labels">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                        <span>6</span>
                        <span>7</span>
                        <span>8</span>
                        <span>9</span>
                        <span>10+</span>
                    </div>
                </div>
                
                <div class="je-filter-toggle-row">
                    <label for="je-filter-toggle" style="font-weight:bold;">Enable Filter:</label>
                    <label class="switch">
                    <input type="checkbox" id="je-filter-toggle">
                    <span class="slider"></span>
                    </label>
                </div>
                <button id="je-extract-descriptions" style="margin-top:8px; padding:6px 12px; font-size:14px;">Extract All Job Descriptions</button>
                <button id="je-clear-results" style="margin-top:8px; margin-left:8px; padding:6px 12px; font-size:14px;">Clear Results</button>
                <div id="je-extraction-results" style="margin-top:14px; max-height:180px; overflow:auto; border:1px solid #eee; border-radius:6px; background:#fafbfc;"></div>
            </div>
            <div class="stats-section">
            <div class="stat-item">
                <span class="stat-number" id="totalJobs">0</span>
                <span class="stat-label">Total Jobs</span>
            </div>
            <div class="stat-item">
                <span class="stat-number" id="matchingJobs">0</span>
                <span class="stat-label">Matching</span>
            </div>
            <div class="stat-item">
                <span class="stat-number" id="filteredJobs">0</span>
                <span class="stat-label">Filtered</span>
            </div>
        </div>
        `;
        floatingPopup.querySelector('.je-floating-popup-close').onclick = () => {
            floatingPopup.remove();
            floatingPopup = null;
            removeAllFiltering();
        };
        document.body.appendChild(floatingPopup);
    
        // Request the current stats when the popup opens
        // chrome.runtime.sendMessage({ action: 'getStats' });
        updateStats();
    
        // Experience level slider
        const slider = floatingPopup.querySelector('#je-experience-slider');
        chrome.storage.sync.get(['experienceLevel'], result => {
            const val = result.experienceLevel !== undefined ? result.experienceLevel : 2;
            slider.value = val;
        });
        slider.addEventListener('input', function () {
            const val = parseInt(slider.value);
            // The label textContent update is no longer needed.
            chrome.storage.sync.set({ experienceLevel: val }, function () {
                currentExperienceLevel = val;
                console.log(filterEnabled)
                if (filterEnabled) startFiltering();
            });
        });
        
        // Filter toggle
        console.log(filterEnabled, "116")
        const filterToggle = floatingPopup.querySelector('#je-filter-toggle');
        filterToggle.checked = filterEnabled;
        filterToggle.addEventListener('change', function () {
            filterEnabled = filterToggle.checked;
            chrome.storage.sync.set({ filterEnabled });
            if (filterEnabled) {
                applyFiltering();
            } else {
                removeAllFiltering();
            }
        });
    
        // Button event listeners
        // floatingPopup.querySelector('#je-extract-descriptions').addEventListener('click', updateExtractionResultsDisplay);
        floatingPopup.querySelector('#je-extract-descriptions').addEventListener('click', async () => {
                    // Show a loading indicator to the user
                    console.log('Starting extraction...');
                    await extractAllJobDescriptions(); // Run the slow scraper
                    console.log('Extraction complete. Applying filters.');
                    applyFiltering(); // Now apply the fast filter
                    updateExtractionResultsDisplay(); // Update the results table
                });
        floatingPopup.querySelector('#je-clear-results').addEventListener('click', function () {
            extractionResults = [];
            updateExtractionResultsDisplay();
            stats.matching = 0
            stats.filtered = 0
            removeAllExperienceBadges();
        });
    
        // Initial results display
        updateExtractionResultsDisplay();
    } // createOrToggleFloatingPopup() ends here

    // Initialize the filter
    function initialize() {
        console.log('Job Experience Filter: Initializing content script');
        
        // Load settings from storage
        // console.log(filterEnabled,'224')
        chrome.storage.sync.get(['filterEnabled', 'experienceLevel'], function(result) {
            // console.log(result.filterEnabled)
            // filterEnabled = result.filterEnabled !== undefined ? result.filterEnabled : true;
            currentExperienceLevel = result.experienceLevel !== undefined ? result.experienceLevel : 0;
            // Set toggle if popup is open
            console.log(floatingPopup,"initilaize floatingpopup value!")
            if (floatingPopup) {
                const filterToggle = floatingPopup.querySelector('#je-filter-toggle');
                if (filterToggle) filterToggle.checked = filterEnabled;
            }
            // Do NOT start filtering automatically
            if (filterEnabled) {
                startFiltering();
            }
        });

        // Set up mutation observer to handle dynamically loaded content
        setupMutationObserver();
    } //initialize() ends here

    function startFiltering() {
        console.log('Job Experience Filter: Starting filtering with level', currentExperienceLevel);
        const filterToggle = floatingPopup.querySelector('#je-filter-toggle');
        filterEnabled = filterToggle.checked;
        if (filterEnabled){
            applyFiltering();
            
        // Reapply filtering when new content loads
        setTimeout(applyFiltering, 2000);
        setInterval(applyFiltering, 5000);
        }  
    } // startfiltering() ends here 

    function shouldShowJob(jobCard, userExperienceLevel) {
        let jobExperienceLevel;
        const regex = /\d/
        console.log(jobCard._jeData,"Je data")
        if (jobCard._jeData && typeof jobCard._jeData.expLevel !== 'undefined') {
            jobExperienceLevel = jobCard._jeData.expLevel;
        } else {
            jobExperienceLevel = -1;
        }
        if (!filterEnabled) return true;
        // const tolerance = 2;
        console.log(jobExperienceLevel);
        return jobExperienceLevel <= userExperienceLevel;
    }

    function dimJob(jobCard) {
        jobCard.classList.add('job-experience-filtered');
        jobCard.style.transition = 'all 0.3s ease';
    }

    function showJob(jobCard) {
        jobCard.classList.remove('job-experience-filtered');
        jobCard.style.transition = 'all 0.3s ease';
    }

    function applyFiltering() {
        const jobCards = findJobCards();
        // extractAllJobDescriptions();
        console.log(extractionResults);
        if (extractionResults.length!==0) {
        stats = { total: jobCards.length, matching: 0, filtered: 0 };
        // chrome.storage.sync.set([])
        chrome.storage.sync.get(['experienceLevel'], result => {
            currentExperienceLevel = result.experienceLevel;
        });
        jobCards.forEach(jobCard => {
            const shouldShow = shouldShowJob(jobCard, currentExperienceLevel);
            const expLevel = jobCard._jeData ? jobCard._jeData.expLevel : -1;
            
            if (shouldShow && filterEnabled) {
                showJob(jobCard);
                stats.matching++;
            } else if (filterEnabled) {
                dimJob(jobCard);
                stats.filtered++;
            } else {
                showJob(jobCard); // Show all when filter disabled
            }
            
            setExperienceBadge(jobCard, expLevel);
            
        });
    }
        updateStats();
        console.log('Job Experience Filter: Applied filtering to', stats.total, 'jobs');
    }
    // applyfiltering() ends here.

    // function applyfilter(){
    //     const jobCards = findJobCards();
    //     stats = { total: jobCards.length, matching: 0, filtered: 0 };
    //     jobCards.forEach(function(jobCard) {
    //         // const experienceLevel = extractionResults[jobCard].expLevel;
    //         // console.log(experienceLevel)
    //         const shouldShow = shouldShowJob(jobCard, currentExperienceLevel);
    //         console.log(shouldShow,"Shouldshow")
    //         if (shouldShow && shouldShow!== null) {
    //             showJob(jobCard);
    //             // stats.matching++;
    //         } else {
    //             dimJob(jobCard);
    //             // stats.filtered++;
    //         }
    //         const expLevel = jobCard._jeData ? jobCard._jeData.expLevel : -1;
    //         setExperienceBadge(jobCard, expLevel);
    //     });
    // } //applyfilter() ends here.

    function setExperienceBadge(jobCard, expLevel) {
        // Remove any existing badge
        let badge = jobCard.querySelector('.je-exp-badge');
        if (badge) badge.remove();

        // Create new badge
        badge = document.createElement('span');
        badge.className = 'je-exp-badge';
        badge.style.cssText = `
            display: inline-block;
            background: #e1ecf4;
            color: #0073b1;
            font-size: 12px;
            font-weight: bold;
            border-radius: 4px;
            padding: 2px 6px;
            margin-left: 8px;
            margin-top: 4px;
            position: absolute;
            right: 10px;
            top: 10px;
            z-index: 10;
        `;
        badge.textContent = expLevel === -1 ? 'Exp: N/A' : `Exp: ${expLevel}+ yrs`;

        // Position badge (adjust as needed for your card layout)
        jobCard.style.position = 'relative';
        jobCard.appendChild(badge);
    }

    function removeAllExperienceBadges() {
        document.querySelectorAll('.je-exp-badge').forEach(badge => badge.remove());
    }

    function findJobCards() {
        // Multiple selectors to catch different LinkedIn layouts
        const selectors = [
            // 'jobs-description-content',
            '.job-card-container',
            '[data-job-id]',
            '.job-card',
            '.jobs-search-results__list-item',
            '.job-search-card'
        ];
        // const selectors = [
        //     '.jobs-description-content',  // ✅ Fixed missing dot
        //     '.job-card-container',
        //     '.jobs-search-results-list__list-item',  // ✅ Updated selector
        //     '.job-card-list__entity-lockup',
        //     '.jobs-search-results__list-item',
        //     '[data-job-id]',
        //     '.artdeco-entity-lockup__content'
        // ];
        let jobCards = [];
        selectors.forEach(function(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(function(element) {
                // Only include visible elements
                const style = window.getComputedStyle(element);
                if (
                    !jobCards.includes(element) &&
                    element.offsetParent !== null &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                ) {
                    jobCards.push(element);
                }
            });
        });
        return jobCards;
    } // findJobCards() ends here.

    function updateStats() {
        try {
            console.log("Updating")
            console.log(stats,"Stats")
            const totalJobsElement = floatingPopup.querySelector('#totalJobs');
            // console.log(totalJobsElement)
            const matchingJobsElement = floatingPopup.querySelector('#matchingJobs');
            const filteredJobsElement = floatingPopup.querySelector('#filteredJobs');
            if (totalJobsElement) totalJobsElement.textContent = stats.total;
            if (matchingJobsElement) matchingJobsElement.textContent = stats.matching;
            if (filteredJobsElement) filteredJobsElement.textContent = stats.filtered;
        //     chrome.runtime.sendMessage({
        //         action: 'updateStats',
        //         stats: stats
        //     }, () => {
        //         if (chrome.runtime.lastError) {
        //             // Ignore context invalidation errors
        //             console.warn('Extension context invalidated:', chrome.runtime.lastError.message);
        //         }
        //     });
        } catch (e) {
            // Ignore errors if extension context is invalid
            console.warn('Extension context invalidated:', e);
        }
    } // updateStats() ends here.
    function findExperienceOnPage() {
        // --- Step 1: Look for specific, structured fields first ---
        
        // Select all potential list items or "insight" elements where this info often lives
        const potentialElements = document.querySelectorAll('.job-details-jobs-unified-top-card__job-insight, li');
    
        for (const element of potentialElements) {
            const text = element.textContent || '';
            // Check if the element's text explicitly mentions "experience"
            if (text.toLowerCase().includes('experience')) {
                const years = extractExperienceLevel(text);
                if (years !== -1) {
                    // Found it in a structured field! This is the most reliable.
                    console.log(`Found experience (${years} yrs) in a structured field.`);
                    return years;
                }
            }
        }
    
        // --- Step 2: If not found, fall back to searching the main description ---
        console.log("Could not find experience in structured fields. Searching description...");
        let descElem = document.querySelector('.jobs-description-content__text, .jobs-description__container, .description__text');
        let descriptionText = descElem ? descElem.textContent : '';
        
        return extractExperienceLevel(descriptionText);
    }

        function extractExperienceLevel(overrideDescription) {
            const fullText = overrideDescription || '';
            
            const yearExpRegex = /(?:(\d+)[\s-]*(?:to|-)[\s]*(\d+)?\s*(?:years?|yrs?)|(\d+)\+?\s*(?:years?|yrs?))\s*(?:of\s*)?(?:experience|exp|work|professional|relevant|related|minimum|required)/gi;
            
            const matches = [...fullText.matchAll(yearExpRegex)];
            
            if (matches.length === 0) {
                return -1;
            }
            
            const match = matches[0];
            const [, minYears1, maxYears, minYears2] = match; // Using comma to skip fullMatch
            
            let experienceLevel = -1;
            
            if (minYears1 && maxYears) {
                // Range: "3-5 years" -> use minimum
                experienceLevel = parseInt(minYears1);
            } else if (minYears2) {
                // Minimum: "5+ years" -> use the number
                experienceLevel = parseInt(minYears2);
            } else if (minYears1) {
                // Exact: "3 years" -> use exact
                experienceLevel = parseInt(minYears1);
            }
            
            return experienceLevel === -1 ? -1 : Math.min(experienceLevel, 10);
        }
        
    // function extractExperienceLevel(jobCard, overrideDescription) {
    //     const fullText = overrideDescription || '';
            
    //         // Enhanced regex patterns
    //     const patterns = [
    //             // "3-5 years", "2 to 4 years"
    //         /(\d+)[\s-]*(?:to|-)[\s]*(\d+)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
    //         // "5+ years", "3+ yrs"
    //         /(\d+)\+\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
    //         // "Minimum 3 years", "At least 5 years"
    //         /(?:minimum|min|at\s*least|minimum\s*of)\s*(\d+)\s*(?:years?|yrs?)/gi,
    //         // "3 years experience", "5 yrs exp"
    //         /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi
    //     ];
            
    //     for (const pattern of patterns) {
    //         const matches = [...fullText.matchAll(pattern)];
    //         if (matches.length > 0) {
    //             const match = matches[0];
    //             const years = parseInt(match[1]);
    //             return Math.min(years, 10); // Cap at 10 years
    //         }
    //     }
            
    //     return -1;
    // } // extractExperienceLevel() ends here.

    async function waitForDescriptionToLoad(expectedTitle) {
        let attempts = 0;
        while (attempts < 15) { // Try for ~3 seconds
            let descTitleElem = document.querySelector('.jobs-unified-top-card__job-title, .topcard__title');
            if (descTitleElem && descTitleElem.textContent.trim() === expectedTitle) {
                return true; // It has loaded!
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms before trying again
            attempts++;
        }
        return false; // Timed out
    }
    
    async function extractAllJobDescriptions() {
        const jobCards = findJobCards();   
        stats = { total: jobCards.length, matching: 0, filtered: 0 };
        extractionResults = [];
        // Load previously extracted jobs from storage
        chrome.storage.local.get(['extractedJobs'], async (result) => {
            for (let i = 0; i < jobCards.length; i++) {
                console.log(jobCards.length);
                let jobTitleElem = document.querySelector('.jobs-unified-top-card__job-title, .topcard__title, .job-details-jobs-unified-top-card__job-title');
                let companyElem = document.querySelector('.jobs-unified-top-card__company-name, .topcard__org-name-link, .job-details-jobs-unified-top-card__company-name');
                let jobTitle = jobTitleElem ? jobTitleElem.textContent.trim() : '';
                let company = companyElem ? companyElem.textContent.trim() : '';
                jobCards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                // const cardTitle = getTitleFromCard(jobCards[i]); 
                jobCards[i].click();
                await waitForDescriptionToLoad(jobTitle);
                // await new Promise(resolve => setTimeout(resolve, 1400));
                // const description = getJobDescription(jobCards[i]);
                let descElem = document.querySelector('.jobs-description-content__text, .jobs-description__container, .description__text, .jobs-description-content');
                let description = descElem ? descElem.textContent.trim() : '[No description found]';
                // const expLevel = extractExperienceLevel(jobCards[i], description);
                const expLevel = findExperienceOnPage();
                
                let expText = expLevel === -1 ? 'No specific experience mentioned' : 'Experience Level: ' + expLevel;
                let jobData = {
                    title: jobTitle,
                    company: company,
                    expLevel: expLevel,
                    expText: expText,
                    description: description
                };
                extractionResults.push(jobData);
                jobCards[i]._jeData = jobData;
                // updateExtractionResultsDisplay();
                // console.log(`Extracted:`, jobData);
            }
            // applyfilter();
            updateExtractionResultsDisplay();
            // updateStats();
            // if (filterEnabled){
            //     applyFiltering();
            // }
            alert('Extraction complete! Check the popup for job experience results.');
        });
    } // extractAllJobDescriptions() ends here

    function updateExtractionResultsDisplay() {
        console.log("Updating!")
        if (!floatingPopup) return;
        const resultsDiv = floatingPopup.querySelector('#je-extraction-results');
        if (!resultsDiv) return;
        if (extractionResults.length === 0) {
            resultsDiv.innerHTML = '<div style="color:#888; font-size:13px; text-align:center; padding:10px;">No extraction results yet.</div>';
            return;
        }
        let html = '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
        html += '<tr style="background:#f0f0f0;"><th style="padding:4px; border:1px solid #eee;">#</th><th style="padding:4px; border:1px solid #eee;">Title</th><th style="padding:4px; border:1px solid #eee;">Company</th><th style="padding:4px; border:1px solid #eee;">Experience Level</th></tr>';
        extractionResults.forEach((item, idx) => {
            html += `<tr><td style="padding:4px; border:1px solid #eee;">${idx + 1}</td><td style="padding:4px; border:1px solid #eee;">${item.title}</td><td style="padding:4px; border:1px solid #eee;">${item.company}</td><td style="padding:4px; border:1px solid #eee;">${item.expText}</td></tr>`;
        });
        html += '</table>';
        resultsDiv.innerHTML = html;
    } // updateExtractionResultsDisplay() ends here.

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
                                console.log("shouldrefilter.")
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
    } //setupMutationObserver() ends here.
    
    function removeAllFiltering() {
        const jobCards = findJobCards();
        jobCards.forEach(function(jobCard) {
            showJob(jobCard);
        });
        updateExtractionResultsDisplay();
        stats = { total: jobCards.length, matching: 0, filtered: 0 };
        updateStats();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        console.log("Step 1 in content script")
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        console.log("step 1.1 in content.js")
        console.log(filterEnabled,"filterEnabled 517")
        initialize();
    }

})();

