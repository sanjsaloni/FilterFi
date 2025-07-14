document.addEventListener('DOMContentLoaded', function() {
    const enableFilter = document.getElementById('enableFilter');
    const experienceSlider = document.getElementById('experienceSlider');
    const experienceValue = document.getElementById('experienceValue');
    const levelItems = document.querySelectorAll('.level-item');
    const resetButton = document.getElementById('resetButton');
    const filterSection = document.querySelector('.filter-section');
    const totalJobsElement = document.getElementById('totalJobs');
    const matchingJobsElement = document.getElementById('matchingJobs');
    const filteredJobsElement = document.getElementById('filteredJobs');

    // Experience level mappings
    const experienceLevels = {
        0: { label: '0-1 years', text: 'Internship' },
        1: { label: '0-2 years', text: 'Entry Level' },
        2: { label: '0-2 years', text: 'Entry Level' },
        3: { label: '2-4 years', text: 'Associate' },
        4: { label: '2-4 years', text: 'Associate' },
        5: { label: '4-6 years', text: 'Mid-Senior' },
        6: { label: '4-8 years', text: 'Mid-Senior' },
        7: { label: '6-8 years', text: 'Mid-Senior' },
        8: { label: '8+ years', text: 'Director' },
        9: { label: '8+ years', text: 'Director' },
        10: { label: '10+ years', text: 'Executive' }
    };

    // Load saved settings
    loadSettings();

    // Event listeners
    enableFilter.addEventListener('change', function() {
        const isEnabled = this.checked;
        filterSection.classList.toggle('disabled', !isEnabled);
        saveSettings();
        sendMessageToContentScript({ action: 'toggleFilter', enabled: isEnabled });
    });

    experienceSlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        updateExperienceDisplay(value);
        updateLevelItems(value);
        saveSettings();
        sendMessageToContentScript({ 
            action: 'updateFilter', 
            experienceLevel: value,
            enabled: enableFilter.checked 
        });
    });

    levelItems.forEach(item => {
        item.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            experienceSlider.value = level;
            updateExperienceDisplay(level);
            updateLevelItems(level);
            saveSettings();
            sendMessageToContentScript({ 
                action: 'updateFilter', 
                experienceLevel: level,
                enabled: enableFilter.checked 
            });
        });
    });

    resetButton.addEventListener('click', function() {
        experienceSlider.value = 2;
        enableFilter.checked = true;
        filterSection.classList.remove('disabled');
        updateExperienceDisplay(2);
        updateLevelItems(2);
        saveSettings();
        sendMessageToContentScript({ 
            action: 'updateFilter', 
            experienceLevel: 2,
            enabled: true 
        });
    });

    function updateExperienceDisplay(value) {
        const level = experienceLevels[value];
        experienceValue.textContent = level.label;
    }

    function updateLevelItems(value) {
        levelItems.forEach(item => {
            const itemLevel = parseInt(item.dataset.level);
            item.classList.toggle('active', itemLevel === value || 
                (value >= itemLevel && value < itemLevel + 2));
        });
    }

    function saveSettings() {
        const settings = {
            enabled: enableFilter.checked,
            experienceLevel: parseInt(experienceSlider.value)
        };
        chrome.storage.sync.set(settings);
    }

    function loadSettings() {
        chrome.storage.sync.get(['enabled', 'experienceLevel'], function(result) {
            const enabled = result.enabled !== undefined ? result.enabled : true;
            const experienceLevel = result.experienceLevel !== undefined ? result.experienceLevel : 2;
            
            enableFilter.checked = enabled;
            experienceSlider.value = experienceLevel;
            filterSection.classList.toggle('disabled', !enabled);
            updateExperienceDisplay(experienceLevel);
            updateLevelItems(experienceLevel);
        });
    }

    function sendMessageToContentScript(message) {
        // chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        //     if (tabs[0]) {
        //         chrome.tabs.sendMessage(tabs[0].id, message);
        //     }
        // });
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs.length) return;
    
            const tab = tabs[0];
            const url = tab.url || '';
    
            if (url.includes('linkedin.com/jobs')) {
                chrome.tabs.sendMessage(tab.id, message, function (response) {
                    if (chrome.runtime.lastError) {
                        console.warn("No content script found on tab:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn('Not a LinkedIn jobs tab:', url);
            }
            console.log("Sending message to tab:", message);
        });
    }

    // Request current stats from content script
    function updateStats() {
        sendMessageToContentScript({ action: 'getStats' });
    }

    // Listen for stats updates from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateStats') {
            totalJobsElement.textContent = request.stats.total;
            matchingJobsElement.textContent = request.stats.matching;
            filteredJobsElement.textContent = request.stats.filtered;
        }
    });

    // Update stats when popup opens
    updateStats();
    
    // Periodically update stats
    setInterval(updateStats, 2000);
});

