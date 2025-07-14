// Background service worker for Job Experience Filter extension

chrome.runtime.onInstalled.addListener(function() {
    console.log('Job Experience Filter extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
        enabled: true,
        experienceLevel: 2
    });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStats') {
        // Forward stats to popup if it's open
        chrome.runtime.sendMessage(request);
    }
    
    if (request.action === 'logActivity') {
        console.log('Job filtering activity:', request.data);
    }
});

// Handle tab updates to reinitialize content script
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && 
        (tab.url.includes('linkedin.com/jobs') || tab.url.includes('www.linkedin.com/jobs'))) {
        
        // Send current settings to content script
        chrome.storage.sync.get(['enabled', 'experienceLevel'], function(result) {
            chrome.tabs.sendMessage(tabId, {
                action: 'initializeFilter',
                enabled: result.enabled !== undefined ? result.enabled : true,
                experienceLevel: result.experienceLevel !== undefined ? result.experienceLevel : 2
            });
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
    // This will open the popup automatically due to manifest configuration
    console.log('Extension icon clicked');
});

