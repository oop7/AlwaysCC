document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const subtitlePreference = document.getElementById('subtitle-preference');
  const customSubtitle = document.getElementById('custom-subtitle');
  const customContainer = document.getElementById('custom-option-container');
  const saveBtn = document.getElementById('save-btn');
  const status = document.getElementById('status');
  const presetButtons = document.querySelectorAll('.preset-btn');

  // Load saved preferences
  browser.storage.sync.get('preferredSubtitle').then((result) => {
    if (result.preferredSubtitle) {
      // Check if the value matches any of our predefined options
      const isPreDefinedOption = [...subtitlePreference.options].some(option => {
        return option.value === result.preferredSubtitle && option.value !== 'custom';
      });

      if (isPreDefinedOption) {
        subtitlePreference.value = result.preferredSubtitle;
      } else {
        // It's a custom value
        subtitlePreference.value = 'custom';
        customSubtitle.value = result.preferredSubtitle;
        customContainer.style.display = 'block';
      }
    }
  }).catch(error => {
    console.error("Error loading preferences:", error);
  });

  // Show/hide custom input based on select value
  subtitlePreference.addEventListener('change', function() {
    if (this.value === 'custom') {
      customContainer.style.display = 'block';
    } else {
      customContainer.style.display = 'none';
    }
  });

  // Handle preset buttons
  presetButtons.forEach(button => {
    button.addEventListener('click', function() {
      const value = this.getAttribute('data-value');
      subtitlePreference.value = 'custom';
      customSubtitle.value = value;
      customContainer.style.display = 'block';
    });
  });

  // Save preferences
  saveBtn.addEventListener('click', function() {
    const preferredValue = subtitlePreference.value === 'custom' 
      ? customSubtitle.value.trim() 
      : subtitlePreference.value;
    
    // Validate that we have a value
    if (!preferredValue) {
      status.textContent = 'Please enter a subtitle preference';
      status.style.color = '#c00';
      return;
    }

    // Save to storage
    browser.storage.sync.set({
      preferredSubtitle: preferredValue
    }).then(() => {
      status.textContent = 'Preferences saved!';
      status.style.color = '#080';
      
      // Show success for 1.5 seconds, then clear
      setTimeout(() => {
        status.textContent = '';
      }, 1500);
    }).catch(error => {
      status.textContent = 'Error saving preferences.';
      status.style.color = '#c00';
      console.error("Error saving preferences:", error);
    });
  });
}); 