/**
 * YouTube Auto Subtitles Extension
 * Automatically enables subtitles on YouTube videos and selects user's preferred subtitle option
 */

// Track if we've already enabled captions for the current video
let captionsEnabledForCurrentVideo = false;
let currentVideoId = '';

// Default subtitle preference (now using YouTube's actual format)
let PREFERRED_SUBTITLE = "English (auto-generated)";

// Format conversion map to handle differences between UI display and what we store
const FORMAT_MAP = {
  "English - auto generated": "English (auto-generated)",
  "Spanish - auto generated": "Spanish (auto-generated)",
  "French - auto generated": "French (auto-generated)",
  "German - auto generated": "German (auto-generated)",
  "Japanese - auto generated": "Japanese (auto-generated)"
};

// Load user preference from storage
function loadPreferredSubtitle() {
  browser.storage.sync.get('preferredSubtitle').then((result) => {
    if (result.preferredSubtitle) {
      // Check if we need to convert from the stored format to YouTube's format
      if (FORMAT_MAP[result.preferredSubtitle]) {
        PREFERRED_SUBTITLE = FORMAT_MAP[result.preferredSubtitle];
      } else {
        PREFERRED_SUBTITLE = result.preferredSubtitle;
      }
      console.log(`Loaded subtitle preference: ${PREFERRED_SUBTITLE}`);
    }
  }).catch(error => {
    console.error("Error loading subtitle preference:", error);
  });
}

// Load preference when script starts
loadPreferredSubtitle();

// Listen for changes to the preference
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.preferredSubtitle) {
    const newValue = changes.preferredSubtitle.newValue;
    // Convert format if needed
    if (FORMAT_MAP[newValue]) {
      PREFERRED_SUBTITLE = FORMAT_MAP[newValue];
    } else {
      PREFERRED_SUBTITLE = newValue;
    }
    console.log(`Updated subtitle preference: ${PREFERRED_SUBTITLE}`);
    
    // Reset tracking to allow re-processing current video with new preference
    captionsEnabledForCurrentVideo = false;
    // Try to apply the new setting immediately
    setTimeout(enableCaptions, 500);
  }
});

// Main function to enable captions
function enableCaptions() {
  // Only run on video pages
  if (!window.location.pathname.includes('/watch')) {
    return;
  }

  // Extract video ID from URL to track when video changes
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  
  // If we've already enabled captions for this video, don't do it again
  if (videoId === currentVideoId && captionsEnabledForCurrentVideo) {
    return;
  }
  
  // Update current video tracking
  currentVideoId = videoId;
  captionsEnabledForCurrentVideo = false;

  // Find the YouTube player
  const player = document.querySelector('.html5-video-player');
  if (!player) {
    // Try again if player isn't loaded yet
    setTimeout(enableCaptions, 1000);
    return;
  }

  // Check if captions are already enabled
  const captionsButton = document.querySelector('.ytp-subtitles-button');
  if (captionsButton) {
    const captionsAlreadyEnabled = captionsButton.getAttribute('aria-pressed') === 'true';
    
    if (!captionsAlreadyEnabled) {
      // Enable captions first if they're not already on
      captionsButton.click();
      console.log("Clicked captions button to enable subtitles");
      
      // Wait a bit for the UI to update after enabling captions
      setTimeout(selectPreferredSubtitle, 500);
    } else {
      // If captions are already on, just select the preferred subtitle
      selectPreferredSubtitle();
    }
    
    captionsEnabledForCurrentVideo = true;
    return;
  }
  
  // Fallback methods if the captions button wasn't found
  
  // Method 2: Try using YouTube API if available
  if (typeof player.toggleSubtitlesOn === 'function') {
    player.toggleSubtitlesOn();
    console.log("Used player API to enable subtitles");
    setTimeout(selectPreferredSubtitle, 500);
    captionsEnabledForCurrentVideo = true;
    return;
  }

  // Method 3: Last resort - use keyboard shortcut
  const videoElement = document.querySelector('video');
  if (videoElement) {
    // Ensure video has focus
    videoElement.focus();
    
    // Create and dispatch a keyboard event for the 'c' key
    const keyEvent = new KeyboardEvent('keydown', {
      key: 'c',
      code: 'KeyC',
      keyCode: 67,
      which: 67,
      bubbles: true,
      cancelable: true
    });
    
    videoElement.dispatchEvent(keyEvent);
    console.log("Used keyboard shortcut to enable subtitles");
    setTimeout(selectPreferredSubtitle, 500);
    captionsEnabledForCurrentVideo = true;
  }
}

// Function to select the preferred subtitle language/type
function selectPreferredSubtitle() {
  console.log(`Attempting to select preferred subtitle: ${PREFERRED_SUBTITLE}`);
  
  // Check if we need to handle auto-translate
  const isAutoTranslate = PREFERRED_SUBTITLE.startsWith('auto-translate:');
  let targetLanguage = '';
  
  if (isAutoTranslate) {
    // Extract target language from the preference string
    targetLanguage = PREFERRED_SUBTITLE.split(':')[1];
    console.log(`Auto-translate mode detected. Target language: ${targetLanguage}`);
  }
  
  // Click the settings button to open the menu
  const settingsButton = document.querySelector('.ytp-settings-button');
  if (!settingsButton) {
    console.log("Settings button not found");
    return;
  }
  
  settingsButton.click();
  console.log("Clicked settings button");
  
  // Wait for the settings menu to appear
  setTimeout(() => {
    // Find and click the subtitles menu item
    const menuItems = document.querySelectorAll('.ytp-menuitem');
    let subtitlesMenuItem = null;
    
    for (const item of menuItems) {
      const text = item.textContent.trim();
      if (text.includes('Subtitles/CC') || text.includes('Caption')) {
        subtitlesMenuItem = item;
        console.log(`Found subtitles menu item: ${text}`);
        break;
      }
    }
    
    if (subtitlesMenuItem) {
      subtitlesMenuItem.click();
      console.log("Clicked subtitles menu item");
      
      // Wait for the subtitles submenu to appear
      setTimeout(() => {
        // Find and click the preferred subtitle option
        const subtitleOptions = document.querySelectorAll('.ytp-menuitem');
        let preferredOption = null;
        let autoTranslateOption = null;
        
        console.log(`Looking for subtitle option containing: ${isAutoTranslate ? 'Auto-translate' : PREFERRED_SUBTITLE}`);
        
        // Debug: Log all available options
        subtitleOptions.forEach(option => {
          const text = option.textContent.trim();
          console.log(`Available option: ${text}`);
          
          // Keep track of the auto-translate option
          if (text.includes('Auto-translate')) {
            autoTranslateOption = option;
          }
        });
        
        if (isAutoTranslate && autoTranslateOption) {
          // Click the Auto-translate option
          autoTranslateOption.click();
          console.log("Clicked auto-translate option");
          
          // Wait for the language submenu to appear
          setTimeout(() => {
            // Find and click the target language
            const languageOptions = document.querySelectorAll('.ytp-menuitem');
            let targetLanguageOption = null;
            
            console.log(`Looking for language option containing: ${targetLanguage}`);
            
            // Debug: Log all available language options
            languageOptions.forEach(option => {
              console.log(`Available language: ${option.textContent.trim()}`);
              
              if (option.textContent.trim().includes(targetLanguage)) {
                targetLanguageOption = option;
              }
            });
            
            if (targetLanguageOption) {
              targetLanguageOption.click();
              console.log(`Selected ${targetLanguage} from auto-translate menu`);
            } else {
              console.log(`Could not find ${targetLanguage} in auto-translate menu`);
              // If can't find the exact language, just close the menu
              settingsButton.click();
            }
          }, 300);
        } else if (!isAutoTranslate) {
          // Regular subtitle selection
          for (const option of subtitleOptions) {
            const text = option.textContent.trim();
            if (text.includes(PREFERRED_SUBTITLE)) {
              preferredOption = option;
              console.log(`Found preferred subtitle option: ${text}`);
              break;
            }
          }
          
          if (preferredOption) {
            preferredOption.click();
            console.log("Clicked preferred subtitle option");
            
            // Always close the settings menu after selecting the option
            setTimeout(() => {
              // Check if the settings menu is still open
              if (document.querySelector('.ytp-settings-menu')) {
                console.log("Closing settings menu");
                settingsButton.click();
              }
            }, 300);
          } else {
            // If preferred option not found, just close the menu
            console.log("Preferred subtitle option not found, closing menu");
            settingsButton.click();
          }
        } else {
          // Auto-translate was requested but option not found
          console.log("Auto-translate option not found, closing menu");
          settingsButton.click();
        }
      }, 300);
    } else {
      // If subtitles menu item not found, just close the menu
      console.log("Subtitles menu item not found, closing menu");
      settingsButton.click();
    }
  }, 300);
}

// Initial run when page loads
setTimeout(() => {
  enableCaptions();
}, 2000); // Wait for player to be fully initialized

// Re-run when navigation happens within YouTube (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    captionsEnabledForCurrentVideo = false; // Reset state when URL changes
    setTimeout(enableCaptions, 2000); // Wait for video player to load after navigation
  }
}).observe(document, { subtree: true, childList: true });

// One additional check in case the player loads late
setTimeout(enableCaptions, 5000); 