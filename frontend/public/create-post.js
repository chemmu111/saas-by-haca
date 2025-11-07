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
    postType: 'post',
    tags: [], // Selected tags for this post
    availableTags: [], // All created tags
    selectedTagColor: '#8b5cf6'
  };

  // Load available tags from localStorage
  function loadAvailableTags() {
    try {
      const savedTags = localStorage.getItem('available_tags');
      if (savedTags) {
        state.availableTags = JSON.parse(savedTags);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      state.availableTags = [];
    }
  }

  // Save available tags to localStorage
  function saveAvailableTags() {
    try {
      localStorage.setItem('available_tags', JSON.stringify(state.availableTags));
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }

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
    elements.platformPostTypeWrapper = document.getElementById('platform-post-type-wrapper');
    elements.platformIndicator = document.getElementById('platform-indicator');
    elements.platformIndicatorIcon = document.getElementById('platform-indicator-icon');
    elements.postTypeSelection = document.getElementById('post-type-selection');
    elements.postTypeRadios = document.querySelectorAll('input[name="post-type"]');
    elements.contentSection = document.getElementById('content-section');
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
    elements.toggleSelectBtn = document.getElementById('toggle-select-btn');
    elements.tagsBtn = document.getElementById('tags-btn');
    elements.tagsDropdown = document.getElementById('tags-dropdown');
    elements.tagsSearchInput = document.getElementById('tags-search-input');
    elements.tagsList = document.getElementById('tags-list');
    elements.createTagBtn = document.getElementById('create-tag-btn');
    elements.tagModalOverlay = document.getElementById('tag-modal-overlay');
    elements.tagModalClose = document.getElementById('tag-modal-close');
    elements.tagModalCancel = document.getElementById('tag-modal-cancel');
    elements.tagModalSave = document.getElementById('tag-modal-save');
    elements.tagNameInput = document.getElementById('tag-name-input');
    elements.colorOptions = document.querySelectorAll('.color-option');
    
    // Load available tags
    loadAvailableTags();
    
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
    // Platform selection - click and keyboard events
    const platformButtons = [
      { element: elements.facebookBtn, id: 'facebook' },
      { element: elements.instagramBtn, id: 'instagram' },
      { element: elements.twitterBtn, id: 'twitter' }
    ];

    platformButtons.forEach(({ element, id }) => {
      if (element) {
        // Click handler
        element.addEventListener('click', () => togglePlatform(id));
        
        // Keyboard handler (Enter/Space)
        element.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePlatform(id);
          }
        });
      }
    });

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
    if (elements.postTypeRadios) {
      elements.postTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          state.postType = e.target.value;
          // Show content section when post type is selected
          if (elements.contentSection) {
            elements.contentSection.style.display = 'block';
          }
          updatePreview();
        });
      });
    }

    // Toggle Select All button
    if (elements.toggleSelectBtn) {
      elements.toggleSelectBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSelectAll();
      });
    }

    // Tags button
    if (elements.tagsBtn) {
      elements.tagsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTagsDropdown();
      });
    }

    // Tags search input
    if (elements.tagsSearchInput) {
      elements.tagsSearchInput.addEventListener('input', (e) => {
        filterTags(e.target.value);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (elements.tagsDropdown && elements.tagsBtn) {
        if (!elements.tagsDropdown.contains(e.target) && !elements.tagsBtn.contains(e.target)) {
          if (elements.tagsDropdown.style.display === 'block') {
            elements.tagsDropdown.style.display = 'none';
          }
        }
      }
    });

    // Create Tag button
    if (elements.createTagBtn) {
      elements.createTagBtn.addEventListener('click', openTagModal);
    }

    // Tag Modal
    if (elements.tagModalClose) {
      elements.tagModalClose.addEventListener('click', closeTagModal);
    }

    if (elements.tagModalCancel) {
      elements.tagModalCancel.addEventListener('click', closeTagModal);
    }

    if (elements.tagModalSave) {
      elements.tagModalSave.addEventListener('click', saveNewTag);
    }

    // Color options
    if (elements.colorOptions) {
      elements.colorOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          const color = e.currentTarget.dataset.color;
          selectTagColor(color);
        });
      });
    }

    // Close modal on overlay click
    if (elements.tagModalOverlay) {
      elements.tagModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.tagModalOverlay) {
          closeTagModal();
        }
      });
    }

    // Connect button
    elements.connectBtn.addEventListener('click', handleConnect);
  }

  // Toggle platform selection
  function togglePlatform(platform) {
    state.selectedPlatforms[platform] = !state.selectedPlatforms[platform];
    updatePlatformUI();
    updatePostTypeSelection();
    updateToggleButton();
    updatePreview();
    updateConnectButton();
    updatePlatformHint();
  }

  // Update platform UI
  function updatePlatformUI() {
    if (elements.facebookBtn) {
      if (state.selectedPlatforms.facebook) {
        elements.facebookBtn.classList.add('active');
      } else {
        elements.facebookBtn.classList.remove('active');
      }
    }
    if (elements.instagramBtn) {
      if (state.selectedPlatforms.instagram) {
        elements.instagramBtn.classList.add('active');
      } else {
        elements.instagramBtn.classList.remove('active');
      }
    }
    if (elements.twitterBtn) {
      if (state.selectedPlatforms.twitter) {
        elements.twitterBtn.classList.add('active');
      } else {
        elements.twitterBtn.classList.remove('active');
      }
    }
  }

  // Update post type selection visibility
  function updatePostTypeSelection() {
    const hasSelection = state.selectedPlatforms.facebook || 
                        state.selectedPlatforms.instagram || 
                        state.selectedPlatforms.twitter;
    
    if (hasSelection && elements.platformPostTypeWrapper) {
      elements.platformPostTypeWrapper.style.display = 'flex';
      updatePlatformIndicator();
      // Show content section when post type is selected
      if (elements.contentSection) {
        elements.contentSection.style.display = 'block';
      }
    } else {
      if (elements.platformPostTypeWrapper) {
        elements.platformPostTypeWrapper.style.display = 'none';
      }
      if (elements.contentSection) {
        elements.contentSection.style.display = 'none';
      }
    }
  }

  // Update platform indicator icon
  function updatePlatformIndicator() {
    if (!elements.platformIndicatorIcon) return;
    
    let selectedPlatform = null;
    if (state.selectedPlatforms.facebook) {
      selectedPlatform = 'facebook';
    } else if (state.selectedPlatforms.instagram) {
      selectedPlatform = 'instagram';
    } else if (state.selectedPlatforms.twitter) {
      selectedPlatform = 'twitter';
    }
    
    if (selectedPlatform) {
      elements.platformIndicatorIcon.innerHTML = getPlatformIcon(selectedPlatform);
      elements.platformIndicatorIcon.className = `platform-indicator-icon ${selectedPlatform}`;
    }
  }

  // Get platform icon SVG
  function getPlatformIcon(platform) {
    const icons = {
      facebook: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>`,
      instagram: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>`,
      twitter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>`
    };
    return icons[platform] || '';
  }

  // Toggle select all platforms
  function toggleSelectAll() {
    const allSelected = state.selectedPlatforms.facebook && 
                       state.selectedPlatforms.instagram && 
                       state.selectedPlatforms.twitter;
    
    if (allSelected) {
      // Unselect all
      state.selectedPlatforms.facebook = false;
      state.selectedPlatforms.instagram = false;
      state.selectedPlatforms.twitter = false;
    } else {
      // Select all
      state.selectedPlatforms.facebook = true;
      state.selectedPlatforms.instagram = true;
      state.selectedPlatforms.twitter = true;
    }
    
    updatePlatformUI();
    updatePostTypeSelection();
    updateToggleButton();
    updatePreview();
    updateConnectButton();
    updatePlatformHint();
  }

  // Update toggle button text and style
  function updateToggleButton() {
    if (!elements.toggleSelectBtn) return;
    
    const allSelected = state.selectedPlatforms.facebook && 
                       state.selectedPlatforms.instagram && 
                       state.selectedPlatforms.twitter;
    
    if (allSelected) {
      elements.toggleSelectBtn.textContent = 'Unselect All';
      elements.toggleSelectBtn.classList.add('unselect-mode');
    } else {
      elements.toggleSelectBtn.textContent = 'Select All';
      elements.toggleSelectBtn.classList.remove('unselect-mode');
    }
  }


  // Toggle tags dropdown
  function toggleTagsDropdown() {
    if (!elements.tagsDropdown) return;
    
    const isVisible = elements.tagsDropdown.style.display === 'block';
    elements.tagsDropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      updateTagsList();
      if (elements.tagsSearchInput) {
        elements.tagsSearchInput.focus();
      }
    }
  }

  // Filter tags based on search
  function filterTags(searchTerm) {
    updateTagsList(searchTerm);
  }

  // Update tags list in dropdown
  function updateTagsList(searchTerm = '') {
    if (!elements.tagsList) return;
    
    let filteredTags = state.availableTags;
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredTags = state.availableTags.filter(tag => 
        tag.name.toLowerCase().includes(search)
      );
    }
    
    if (filteredTags.length === 0) {
      elements.tagsList.innerHTML = `
        <div class="tags-empty">
          <p class="tags-empty-text">No tags found</p>
        </div>
      `;
      return;
    }
    
    elements.tagsList.innerHTML = filteredTags.map(tag => {
      const tagName = tag.name;
      const tagColor = tag.color || '#8b5cf6';
      const isSelected = state.tags.some(t => {
        const name = typeof t === 'string' ? t : t.name;
        return name === tagName;
      });
      
      return `
        <label class="tag-list-item">
          <input 
            type="checkbox" 
            class="tag-checkbox" 
            data-tag-name="${escapeHtml(tagName)}"
            ${isSelected ? 'checked' : ''}
          />
          <span class="tag-color-dot" style="background-color: ${tagColor};"></span>
          <span class="tag-chip" style="background-color: ${tagColor}; color: #ffffff; border-color: ${tagColor};">
            ${escapeHtml(tagName)}
          </span>
        </label>
      `;
    }).join('');
    
    // Add checkbox listeners
    elements.tagsList.querySelectorAll('.tag-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const tagName = e.target.dataset.tagName;
        if (e.target.checked) {
          selectTag(tagName);
        } else {
          removeTag(tagName);
        }
      });
    });
  }

  // Select tag
  function selectTag(tagName) {
    const tag = state.availableTags.find(t => t.name === tagName);
    if (!tag) return;
    
    // Check if already selected
    const isSelected = state.tags.some(t => {
      const name = typeof t === 'string' ? t : t.name;
      return name === tagName;
    });
    
    if (!isSelected) {
      state.tags.push({
        name: tag.name,
        color: tag.color
      });
      updateTagsList(elements.tagsSearchInput ? elements.tagsSearchInput.value : '');
    }
  }

  // Add tag (simple string tag) - legacy function
  function addTag(tagInput) {
    if (!tagInput || !tagInput.trim()) return;
    
    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    tags.forEach(tagName => {
      if (tagName && !state.tags.find(t => (typeof t === 'string' ? t : t.name) === tagName)) {
        // Add as simple string for backward compatibility
        state.tags.push(tagName);
      }
    });
    
    updateTagsList(elements.tagsSearchInput ? elements.tagsSearchInput.value : '');
  }

  // Remove tag
  function removeTag(tagName) {
    state.tags = state.tags.filter(t => {
      if (typeof t === 'string') {
        return t !== tagName;
      }
      return t.name !== tagName;
    });
    updateTagsList(elements.tagsSearchInput ? elements.tagsSearchInput.value : '');
  }

  // Update tags display (legacy - for simple input tags)
  function updateTagsDisplay() {
    if (!elements.tagsDisplay) return;
    
    if (state.tags.length === 0) {
      elements.tagsDisplay.innerHTML = '';
      return;
    }
    
    elements.tagsDisplay.innerHTML = state.tags.map(tag => {
      const tagName = typeof tag === 'string' ? tag : tag.name;
      const tagColor = typeof tag === 'string' ? '#8b5cf6' : (tag.color || '#8b5cf6');
      
      return `
        <span class="tag-item" style="background-color: ${tagColor}; color: #ffffff; border-color: ${tagColor};">
          <span class="tag-text">${escapeHtml(tagName)}</span>
          <button type="button" class="tag-remove" data-tag="${escapeHtml(tagName)}" aria-label="Remove tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </span>
      `;
    }).join('');
    
    // Add remove listeners
    elements.tagsDisplay.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag-remove').dataset.tag;
        removeTag(tag);
      });
    });
  }


  // Open tag modal
  function openTagModal() {
    if (!elements.tagModalOverlay) return;
    elements.tagModalOverlay.style.display = 'flex';
    if (elements.tagNameInput) {
      elements.tagNameInput.value = '';
      elements.tagNameInput.focus();
    }
    // Reset to default color
    selectTagColor('#8b5cf6');
  }

  // Close tag modal
  function closeTagModal() {
    if (!elements.tagModalOverlay) return;
    elements.tagModalOverlay.style.display = 'none';
    if (elements.tagNameInput) {
      elements.tagNameInput.value = '';
    }
  }

  // Select tag color
  function selectTagColor(color) {
    state.selectedTagColor = color;
    
    // Update color options UI
    if (elements.colorOptions) {
      elements.colorOptions.forEach(option => {
        const optionColor = option.dataset.color;
        const checkmark = option.querySelector('svg');
        
        if (optionColor === color) {
          option.classList.add('selected');
          if (!checkmark) {
            option.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
          }
        } else {
          option.classList.remove('selected');
          if (checkmark && optionColor !== '#8b5cf6') {
            option.innerHTML = '';
          }
        }
      });
    }
  }

  // Save new tag
  function saveNewTag() {
    if (!elements.tagNameInput) return;
    
    const tagName = elements.tagNameInput.value.trim();
    
    if (!tagName) {
      alert('Please enter a tag name');
      return;
    }
    
    // Check if tag already exists in available tags
    const tagExists = state.availableTags.find(t => 
      t.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (tagExists) {
      alert('This tag already exists');
      return;
    }
    
    // Add to available tags
    const newTag = {
      name: tagName,
      color: state.selectedTagColor
    };
    
    state.availableTags.push(newTag);
    saveAvailableTags();
    
    // Also add to selected tags for this post
    state.tags.push(newTag);
    
    updateTagsList(elements.tagsSearchInput ? elements.tagsSearchInput.value : '');
    closeTagModal();
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
    updateToggleButton();
    updateCharCount();
    updateMediaPreview();
    updatePreview();
    updateConnectButton();
    updatePlatformHint();
    updateTagsList();
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
      tags: state.tags.map(tag => {
        // Convert string tags to object format
        if (typeof tag === 'string') {
          return { name: tag, color: '#8b5cf6' };
        }
        return tag;
      }),
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
