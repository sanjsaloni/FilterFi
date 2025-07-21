// Listen for a click on the extension's icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
  
  // Check if we are on a LinkedIn jobs page before sending the message.
  if (tab.url && tab.url.includes("linkedin.com/jobs")) {

    // Send a message to the content script to toggle the floating popup.
    chrome.tabs.sendMessage(tab.id, { action: 'toggleFloatingPopup' }, (response) => {
      // The callback is optional, but good for debugging.
      if (chrome.runtime.lastError) {
        console.warn("Could not send message:", chrome.runtime.lastError.message);
      } else {
        console.log("Toggle message sent successfully.");
      }
    });

  } else {
    console.log("Not a LinkedIn jobs page. No message sent.");
  }
});