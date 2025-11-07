(function () {
  'use strict';

  // State management
  const state = {
    selectedPlatforms: {
      facebook: false,
      instagram: false,
      twitter: false
    },
    mediaFiles: [],
    caption: '',
    postType: 'post'
  };

  // DOM elements
  const elements = {
    facebookBtn: null,
    instagramBtn: null,
    twitterBtn: null,
    postTypeToggle: null,
    postTypeSelection: null,
    postTypeRadios: null,
    captionInput: null,
    charCount: null,
    uploadArea: null,
    mediaInput: null,
    selectFileBtn: null,
    mediaPreview: null,
    connectBtn: null,
    platformHint: null,
    previewTitle: null,
    previewContent: null,
    integrationsBtn: null
  };

  // Initialize
  function init() {
    // Initialize DOM elements
    elements.facebookBtn = document.getElementById('platform-facebook');
    elements.instagramBtn = document.getElementById('platform-instagram');
    elements.twitterBtn = document.getElementById('platform-twitter');
    elements.postTypeToggle = document.getElementById('post-type-toggle');
    elements.postTypeSelection = document.getElementById('post-type-selection');
    elements.postTypeRadios = document.querySelectorAll('input[name="post-type"]');
    elements.captionInput = document.getElementById('post-caption');
    elements.charCount = document.getElementById('char-count');
    elements.uploadArea = document.getElementById('upload-area');
    elements.mediaInput = document.getElementById('media-input');
    elements.selectFileBtn = document.getElementById('select-file-btn');
    elements.mediaPreview = document.getElementById('media-preview');
    elements.connectBtn = document.getElementById('connect-btn');
    elements.platformHint = document.getElementById('platform-hint');
    elements.previewTitle = document.getElementById('preview-title');
    elements.previewContent = document.getElementById('preview-content');
    elements.integrationsBtn = document.getElementById('integrations-btn');
    
    setupEventListeners();
    updateUI();
    checkAuth();
  }

  // Check authentication
  function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login.html';
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Platform selection
    elements.facebookBtn.addEventListener('click', () => togglePlatform('facebook'));
    elements.instagramBtn.addEventListener('click', () => togglePlatform('instagram'));
    elements.twitterBtn.addEventListener('click', () => togglePlatform('twitter'));

    // Caption input
    elements.captionInput.addEventListener('input', (e) => {
      state.caption = e.target.value;
      updateCharCount();
      updatePreview();
      updateConnectButton();
    });

    // File input click
    elements.selectFileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.mediaInput.click();
    });

    // Upload area click
    elements.uploadArea.addEventListener('click', () => {
      elements.mediaInput.click();
    });

    // File input change
    elements.mediaInput.addEventListener('change', (e) => {
      handleFiles(Array.from(e.target.files));
    });

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadArea.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    });

    // Integrations button
    elements.integrationsBtn.addEventListener('click', () => {
      alert('Select media from integrations feature coming soon!');
    });

    // Post type selection
    elements.postTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.postType = e.target.value;
        updatePreview();
      });
    });

    // Connect button
    elements.connectBtn.addEventListener('click', handleConnect);
  }

  // Toggle platform selection
  function togglePlatform(platform) {
    state.selectedPlatforms[platform] = !state.selectedPlatforms[platform];
    updatePlatformUI();
    updatePostTypeSelection();
    updatePreview();
    updateConnectButton();
    updatePlatformHint();
  }

  // Update platform UI
  function updatePlatformUI() {
    elements.facebookBtn.classList.toggle('active', state.selectedPlatforms.facebook);
    elements.instagramBtn.classList.toggle('active', state.selectedPlatforms.instagram);
    elements.twitterBtn.classList.toggle('active', state.selectedPlatforms.twitter);
  }

  // Update post type selection visibility
  function updatePostTypeSelection() {
    const hasSelection = state.selectedPlatforms.facebook || 
                        state.selectedPlatforms.instagram || 
                        state.selectedPlatforms.twitter;
    
    if (hasSelection && elements.postTypeSelection) {
      elements.postTypeSelection.style.display = 'block';
    } else if (elements.postTypeSelection) {
      elements.postTypeSelection.style.display = 'none';
    }
  }

  // Update character count
  function updateCharCount() {
    const count = state.caption.length;
    elements.charCount.textContent = count;
    
    if (count > 2000) {
      elements.charCount.style.color = '#ef4444';
    } else if (count > 1800) {
      elements.charCount.style.color = '#f59e0b';
    } else {
      elements.charCount.style.color = '#9ca3af';
    }
  }

  // Handle file selection
  function handleFiles(files) {
    const validFiles = files.filter(file => {
      return file.type.startsWith('image/') || file.type.startsWith('video/');
    });

    if (validFiles.length === 0) {
      alert('Please select only image or video files.');
      return;
    }

    // Limit to 10 files
    const filesToAdd = validFiles.slice(0, 10 - state.mediaFiles.length);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.mediaFiles.push({
          file: file,
          url: e.target.result,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        });
        updateMediaPreview();
        updatePreview();
        updateConnectButton();
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    elements.mediaInput.value = '';
  }

  // Update media preview
  function updateMediaPreview() {
    if (state.mediaFiles.length === 0) {
      elements.mediaPreview.style.display = 'none';
      return;
    }

    elements.mediaPreview.style.display = 'grid';
    elements.mediaPreview.innerHTML = state.mediaFiles.map((media, index) => {
      return `
        <div class="media-item">
          ${media.type === 'image' 
            ? `<img src="${media.url}" alt="Media ${index + 1}">`
            : `<video src="${media.url}" controls></video>`
          }
          <button type="button" class="remove-btn" data-index="${index}" aria-label="Remove media">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Add remove button listeners
    elements.mediaPreview.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('.remove-btn').dataset.index);
        state.mediaFiles.splice(index, 1);
        updateMediaPreview();
        updatePreview();
        updateConnectButton();
      });
    });
  }

  // Update preview panel
  function updatePreview() {
    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;
    
    // Determine which platform to show preview for
    let platform = 'Instagram';
    if (state.selectedPlatforms.facebook && !state.selectedPlatforms.instagram && !state.selectedPlatforms.twitter) {
      platform = 'Facebook';
    } else if (state.selectedPlatforms.instagram && !state.selectedPlatforms.facebook && !state.selectedPlatforms.twitter) {
      platform = 'Instagram';
    } else if (state.selectedPlatforms.twitter && !state.selectedPlatforms.facebook && !state.selectedPlatforms.instagram) {
      platform = 'Twitter';
    } else if (hasSelection) {
      // If multiple selected, show first selected
      if (state.selectedPlatforms.facebook) platform = 'Facebook';
      else if (state.selectedPlatforms.instagram) platform = 'Instagram';
      else if (state.selectedPlatforms.twitter) platform = 'Twitter';
    }

    elements.previewTitle.textContent = `${platform} Preview`;
    
    if (!hasSelection || (state.mediaFiles.length === 0 && !state.caption.trim())) {
      elements.previewContent.innerHTML = `
        <div class="preview-placeholder">
          <div class="placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <p class="placeholder-text">See your post's preview here</p>
        </div>
      `;
      return;
    }

    // Build preview HTML
    let previewHTML = '<div class="preview-post">';
    
    // Header
    previewHTML += `
      <div class="preview-post-header">
        <div class="preview-avatar">${platform.charAt(0)}</div>
        <div class="preview-username">@your_account</div>
      </div>
    `;

    // Media
    if (state.mediaFiles.length > 0) {
      const firstMedia = state.mediaFiles[0];
      if (firstMedia.type === 'image') {
        previewHTML += `<img src="${firstMedia.url}" alt="Post media" class="preview-media">`;
      } else {
        previewHTML += `<video src="${firstMedia.url}" controls class="preview-media"></video>`;
      }
    }

    // Caption
    if (state.caption.trim()) {
      previewHTML += `<div class="preview-caption">${escapeHtml(state.caption)}</div>`;
    }

    previewHTML += '</div>';
    elements.previewContent.innerHTML = previewHTML;
  }

  // Update connect button state
  function updateConnectButton() {
    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;
    // Button enabled only when at least one platform is selected (Buffer behavior)
    elements.connectBtn.disabled = !hasSelection;
    
    // Update button text based on selected platform (Buffer style)
    if (hasSelection) {
      const selected = [];
      if (state.selectedPlatforms.facebook) selected.push('Facebook');
      if (state.selectedPlatforms.instagram) selected.push('Instagram');
      if (state.selectedPlatforms.twitter) selected.push('Twitter');
      
      if (selected.length === 1) {
        elements.connectBtn.textContent = `Connect ${selected[0]} to Post`;
      } else {
        elements.connectBtn.textContent = 'Connect a Channel to Post';
      }
    } else {
      elements.connectBtn.textContent = 'Connect a Channel to Post';
    }
  }

  // Update platform hint
  function updatePlatformHint() {
    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;
    
    if (hasSelection) {
      const platforms = [];
      if (state.selectedPlatforms.facebook) platforms.push('Facebook');
      if (state.selectedPlatforms.instagram) platforms.push('Instagram');
      if (state.selectedPlatforms.twitter) platforms.push('Twitter');
      
      elements.platformHint.textContent = `Selected: ${platforms.join(', ')}`;
      elements.platformHint.classList.add('has-selection');
    } else {
      elements.platformHint.textContent = 'Select at least one platform to continue';
      elements.platformHint.classList.remove('has-selection');
    }
  }

  // Update all UI elements
  function updateUI() {
    updatePlatformUI();
    updatePostTypeSelection();
    updateCharCount();
    updateMediaPreview();
    updatePreview();
    updateConnectButton();
    updatePlatformHint();
  }

  // Handle connect button click
  function handleConnect() {
    if (elements.connectBtn.disabled) {
      return;
    }

    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;

    if (!hasSelection) {
      alert('Please select at least one platform to continue.');
      return;
    }

    // Show loading state
    const originalText = elements.connectBtn.textContent;
    elements.connectBtn.disabled = true;
    elements.connectBtn.textContent = 'Processing...';

    // Prepare post data
    const postData = {
      platforms: Object.keys(state.selectedPlatforms).filter(p => state.selectedPlatforms[p]),
      caption: state.caption,
      mediaFiles: state.mediaFiles.map(m => ({
        name: m.file.name,
        type: m.type,
        size: m.file.size
      })),
      postType: state.postType
    };

    console.log('Post data:', postData);

    // TODO: Send to backend API
    // For now, just show a success message
    setTimeout(() => {
      alert('Post created successfully! (This is a demo - backend integration pending)');
      elements.connectBtn.textContent = originalText;
      elements.connectBtn.disabled = false;
      updateConnectButton();
    }, 1500);
  }

  // Utility: Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
