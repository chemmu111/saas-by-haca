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
    musicFile: null, // Music file
    musicUrl: null, // Uploaded music URL
    musicTitle: '', // Music title
    musicArtist: '', // Music artist
    caption: '',
    postType: 'post',
    tags: [], // Selected tags for this post
    availableTags: [], // All available tags
    isCreatingTag: false, // Whether create tag input is visible
    selectedStickers: [], // Selected stickers for this post
    clients: [], // Available clients
    selectedClient: null, // Selected client for posting
    scheduledTime: null // Scheduled time for post
  };

  // Load available tags from localStorage
  function loadAvailableTags() {
    try {
      const savedTags = localStorage.getItem('available_tags');
      if (savedTags) {
        state.availableTags = JSON.parse(savedTags);
      } else {
        // Initialize with some default tags
        state.availableTags = [
          { name: 'Marketing', color: '#ec4899' },
          { name: 'Design', color: '#3b82f6' },
          { name: 'Development', color: '#14b8a6' },
          { name: 'AI', color: '#8b5cf6' }
        ];
        saveAvailableTags();
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

  // Generate random color for new tags
  function getRandomColor() {
    const colors = [
      '#ec4899', '#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b',
      '#ef4444', '#a855f7', '#1e40af', '#10b981', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
    integrationsBtn: null,
    stickerBtn: null,
    stickerModalOverlay: null,
    stickerModal: null,
    stickerModalClose: null,
    stickerCategories: null,
    stickerSearchInput: null,
    stickerGrid: null,
    imageUploadBtn: null,
    clientModalOverlay: null,
    clientModal: null,
    clientList: null,
    clientModalClose: null,
    errorMessage: null,
    clientSelect: null,
    clientSelectionHint: null,
    scheduleCheckbox: null,
    scheduleInputsWrapper: null,
    scheduleDate: null,
    scheduleTime: null
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
    elements.createTagInputWrapper = document.getElementById('create-tag-input-wrapper');
    elements.createTagInput = document.getElementById('create-tag-input');
    elements.createTagSaveBtn = document.getElementById('create-tag-save-btn');
    elements.createTagCancelBtn = document.getElementById('create-tag-cancel-btn');
    elements.stickerBtn = document.getElementById('sticker-btn');
    elements.stickerModalOverlay = document.getElementById('sticker-modal-overlay');
    elements.stickerModal = document.getElementById('sticker-modal');
    elements.stickerModalClose = document.getElementById('sticker-modal-close');
    elements.stickerCategories = document.getElementById('sticker-categories');
    elements.stickerSearchInput = document.getElementById('sticker-search-input');
    elements.stickerGrid = document.getElementById('sticker-grid');
    elements.imageUploadBtn = document.getElementById('image-upload-btn');
    elements.musicUploadBtn = document.getElementById('music-upload-btn');
    elements.musicInput = document.getElementById('music-input');
    elements.musicPreview = document.getElementById('music-preview');
    elements.errorMessage = null;
    elements.clientSelect = document.getElementById('client-select');
    elements.clientSelectionHint = document.getElementById('client-selection-hint');
    elements.scheduleCheckbox = document.getElementById('schedule-post-checkbox');
    elements.scheduleInputsWrapper = document.getElementById('schedule-inputs-wrapper');
    elements.scheduleDate = document.getElementById('schedule-date');
    elements.scheduleTime = document.getElementById('schedule-time');
    
    // Set minimum date to today
    if (elements.scheduleDate) {
      const today = new Date().toISOString().split('T')[0];
      elements.scheduleDate.min = today;
    }
    
    // Load available tags
    loadAvailableTags();
    
    setupEventListeners();
    updateUI();
    checkAuth();
    fetchClients();
    createClientModal();
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
    if (elements.selectFileBtn) {
      elements.selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (elements.mediaInput) {
          elements.mediaInput.click();
        }
      });
    }

    // Image upload button in action icons row
    if (elements.imageUploadBtn) {
      elements.imageUploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Trigger file input for images only (JPG, PNG, GIF)
        if (elements.mediaInput) {
          elements.mediaInput.accept = 'image/jpeg,image/jpg,image/png,image/gif';
          elements.mediaInput.click();
        }
      });
    }

    // Music upload button
    if (elements.musicUploadBtn) {
      elements.musicUploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (elements.musicInput) {
          elements.musicInput.click();
        }
      });
    }

    // Music input change
    if (elements.musicInput) {
      elements.musicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleMusicFile(file);
        }
      });
    }

    // Upload area click
    if (elements.uploadArea) {
      elements.uploadArea.addEventListener('click', () => {
        if (elements.mediaInput) {
          elements.mediaInput.click();
        }
      });
    }

    // File input change
    if (elements.mediaInput) {
      elements.mediaInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
      });
    }

    // Simplified drag and drop
    if (elements.uploadArea) {
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
        // Separate audio files from media files
        const audioFiles = files.filter(f => f.type.startsWith('audio/'));
        const mediaFiles = files.filter(f => !f.type.startsWith('audio/'));
        
        if (audioFiles.length > 0) {
          handleMusicFile(audioFiles[0]); // Handle first audio file
        }
        if (mediaFiles.length > 0) {
          handleFiles(mediaFiles);
        }
      });
    }

    // Integrations button (if it exists)
    if (elements.integrationsBtn) {
      elements.integrationsBtn.addEventListener('click', () => {
        alert('Select media from integrations feature coming soon!');
      });
    }

    // Schedule checkbox
    if (elements.scheduleCheckbox) {
      elements.scheduleCheckbox.addEventListener('change', (e) => {
        if (elements.scheduleInputsWrapper) {
          elements.scheduleInputsWrapper.style.display = e.target.checked ? 'flex' : 'none';
          if (!e.target.checked) {
            // Clear scheduled time when unchecked
            state.scheduledTime = null;
            if (elements.scheduleDate) elements.scheduleDate.value = '';
            if (elements.scheduleTime) elements.scheduleTime.value = '';
          }
        }
        // Update button text when schedule checkbox changes
        updateConnectButton();
      });
    }

    // Schedule date and time inputs
    if (elements.scheduleDate) {
      elements.scheduleDate.addEventListener('change', updateScheduledTime);
    }
    if (elements.scheduleTime) {
      elements.scheduleTime.addEventListener('change', updateScheduledTime);
    }

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


    // Connect button
    elements.connectBtn.addEventListener('click', handleConnect);

    // Tags button - toggle dropdown
    if (elements.tagsBtn) {
      elements.tagsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTagsDropdown();
      });
      
      // Prevent clicks on button SVG/icons from bubbling
      elements.tagsBtn.querySelectorAll('svg, span').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });
    }

    // Tags search input - filter tags in real time
    if (elements.tagsSearchInput) {
      elements.tagsSearchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        const searchTerm = e.target.value || '';
        updateTagsList(searchTerm);
      });
      
      elements.tagsSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      elements.tagsSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    // Create Tag button - show input
    if (elements.createTagBtn) {
      elements.createTagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Keep dropdown open when clicking create tag button
        showCreateTagInput();
      });
    }

    // Create Tag Save button
    if (elements.createTagSaveBtn) {
      elements.createTagSaveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        saveNewTag();
      });
    }

    // Create Tag Cancel button
    if (elements.createTagCancelBtn) {
      elements.createTagCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideCreateTagInput();
      });
    }

    // Create Tag Input - handle Enter key
    if (elements.createTagInput) {
      elements.createTagInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      elements.createTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          saveNewTag();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          hideCreateTagInput();
        }
      });
    }

    // Prevent dropdown from closing when clicking on save/cancel buttons
    if (elements.createTagSaveBtn) {
      elements.createTagSaveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (elements.createTagCancelBtn) {
      elements.createTagCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!isDropdownOpen) return;
      
      if (elements.tagsDropdown && elements.tagsBtn) {
        // Check if click is inside dropdown or button
        const isClickInsideDropdown = elements.tagsDropdown.contains(e.target);
        const isClickOnButton = elements.tagsBtn.contains(e.target);
        
        // Don't close if clicking inside dropdown (tags, search, create options, etc.)
        if (!isClickInsideDropdown && !isClickOnButton) {
          closeTagsDropdown();
        }
      }
    }, true);

    // Sticker button - open sticker modal
    if (elements.stickerBtn) {
      elements.stickerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openStickerModal();
      });
      
      // Also add pointer events to ensure it's clickable
      elements.stickerBtn.style.cursor = 'pointer';
      elements.stickerBtn.style.pointerEvents = 'auto';
    }

    // Sticker modal close button
    if (elements.stickerModalClose) {
      elements.stickerModalClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeStickerModal();
      });
    }

    // Close sticker modal when clicking overlay
    if (elements.stickerModalOverlay) {
      elements.stickerModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.stickerModalOverlay) {
          closeStickerModal();
        }
      });
    }

    // Sticker category buttons
    if (elements.stickerCategories) {
      elements.stickerCategories.addEventListener('click', (e) => {
        if (e.target.classList.contains('sticker-category-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const category = e.target.dataset.category;
          selectStickerCategory(category);
        }
      });
    }

    // Sticker search input
    if (elements.stickerSearchInput) {
      elements.stickerSearchInput.addEventListener('input', (e) => {
        e.stopPropagation();
        const searchTerm = e.target.value || '';
        filterStickers(searchTerm);
      });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isStickerModalOpen) {
        closeStickerModal();
      }
    });
  }

  // Dropdown state
  let isDropdownOpen = false;
  let isStickerModalOpen = false;
  let currentStickerCategory = 'all';
  
  // Sticker/Emoji data - Expanded with more emojis
  const stickerData = {
    all: [
      // Happy faces (10)
      { id: 'happy1', emoji: '😊', name: 'Smiling Face', category: 'happy' },
      { id: 'happy2', emoji: '😄', name: 'Grinning Face', category: 'happy' },
      { id: 'happy3', emoji: '😃', name: 'Grinning Face with Big Eyes', category: 'happy' },
      { id: 'happy4', emoji: '😁', name: 'Beaming Face', category: 'happy' },
      { id: 'happy5', emoji: '😆', name: 'Grinning Squinting Face', category: 'happy' },
      { id: 'happy6', emoji: '😍', name: 'Smiling Face with Heart Eyes', category: 'happy' },
      { id: 'happy7', emoji: '🤩', name: 'Star-Struck', category: 'happy' },
      { id: 'happy8', emoji: '😎', name: 'Smiling Face with Sunglasses', category: 'happy' },
      { id: 'happy9', emoji: '🤗', name: 'Hugging Face', category: 'happy' },
      { id: 'happy10', emoji: '😉', name: 'Winking Face', category: 'happy' },
      // Love (10)
      { id: 'love1', emoji: '❤️', name: 'Red Heart', category: 'love' },
      { id: 'love2', emoji: '💕', name: 'Two Hearts', category: 'love' },
      { id: 'love3', emoji: '💖', name: 'Sparkling Heart', category: 'love' },
      { id: 'love4', emoji: '💗', name: 'Growing Heart', category: 'love' },
      { id: 'love5', emoji: '💙', name: 'Blue Heart', category: 'love' },
      { id: 'love6', emoji: '💚', name: 'Green Heart', category: 'love' },
      { id: 'love7', emoji: '🧡', name: 'Orange Heart', category: 'love' },
      { id: 'love8', emoji: '💜', name: 'Purple Heart', category: 'love' },
      { id: 'love9', emoji: '💛', name: 'Yellow Heart', category: 'love' },
      { id: 'love10', emoji: '🤍', name: 'White Heart', category: 'love' },
      // Celebration (8)
      { id: 'celeb1', emoji: '🎉', name: 'Party Popper', category: 'celebration' },
      { id: 'celeb2', emoji: '🎊', name: 'Confetti Ball', category: 'celebration' },
      { id: 'celeb3', emoji: '🎈', name: 'Balloon', category: 'celebration' },
      { id: 'celeb4', emoji: '🎁', name: 'Wrapped Gift', category: 'celebration' },
      { id: 'celeb5', emoji: '🎂', name: 'Birthday Cake', category: 'celebration' },
      { id: 'celeb6', emoji: '🥳', name: 'Partying Face', category: 'celebration' },
      { id: 'celeb7', emoji: '🎆', name: 'Fireworks', category: 'celebration' },
      { id: 'celeb8', emoji: '🎇', name: 'Sparkler', category: 'celebration' },
      // Animals (10)
      { id: 'animal1', emoji: '🐶', name: 'Dog Face', category: 'animals' },
      { id: 'animal2', emoji: '🐱', name: 'Cat Face', category: 'animals' },
      { id: 'animal3', emoji: '🐼', name: 'Panda', category: 'animals' },
      { id: 'animal4', emoji: '🐨', name: 'Koala', category: 'animals' },
      { id: 'animal5', emoji: '🐯', name: 'Tiger Face', category: 'animals' },
      { id: 'animal6', emoji: '🦁', name: 'Lion', category: 'animals' },
      { id: 'animal7', emoji: '🐰', name: 'Rabbit Face', category: 'animals' },
      { id: 'animal8', emoji: '🐸', name: 'Frog', category: 'animals' },
      { id: 'animal9', emoji: '🐵', name: 'Monkey Face', category: 'animals' },
      { id: 'animal10', emoji: '🐧', name: 'Penguin', category: 'animals' },
      // Food (10)
      { id: 'food1', emoji: '🍕', name: 'Pizza', category: 'food' },
      { id: 'food2', emoji: '🍔', name: 'Hamburger', category: 'food' },
      { id: 'food3', emoji: '🍰', name: 'Cake', category: 'food' },
      { id: 'food4', emoji: '🍩', name: 'Doughnut', category: 'food' },
      { id: 'food5', emoji: '🍎', name: 'Apple', category: 'food' },
      { id: 'food6', emoji: '🍌', name: 'Banana', category: 'food' },
      { id: 'food7', emoji: '🍇', name: 'Grapes', category: 'food' },
      { id: 'food8', emoji: '🍓', name: 'Strawberry', category: 'food' },
      { id: 'food9', emoji: '🥑', name: 'Avocado', category: 'food' },
      { id: 'food10', emoji: '🍉', name: 'Watermelon', category: 'food' }
    ]
  };
  
  // Initialize sticker data for each category
  stickerData.happy = stickerData.all.filter(s => s.category === 'happy');
  stickerData.love = stickerData.all.filter(s => s.category === 'love');
  stickerData.celebration = stickerData.all.filter(s => s.category === 'celebration');
  stickerData.animals = stickerData.all.filter(s => s.category === 'animals');
  stickerData.food = stickerData.all.filter(s => s.category === 'food');

  // Toggle platform selection
  function togglePlatform(platform) {
    state.selectedPlatforms[platform] = !state.selectedPlatforms[platform];
    updatePlatformUI();
    updatePostTypeSelection();
    updateToggleButton();
    updatePreview();
    updateClientDropdown(); // Update dropdown when platform changes
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
    updateClientDropdown(); // Update dropdown when platform changes
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

  // Handle file selection (simplified)
  function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    // Filter for valid image/video files
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      alert('Please select image or video files.');
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

    // Reset input after processing
    if (elements.mediaInput) {
      elements.mediaInput.value = '';
    }
  }

  // Handle music file
  function handleMusicFile(file) {
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    state.musicFile = file;
    
    // Try to extract title and artist from filename
    const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const parts = filename.split(' - ');
    if (parts.length >= 2) {
      state.musicArtist = parts[0].trim();
      state.musicTitle = parts.slice(1).join(' - ').trim();
    } else {
      state.musicTitle = filename;
      state.musicArtist = '';
    }
    
    updateMusicPreview();
    updateConnectButton();
  }

  // Update music preview
  function updateMusicPreview() {
    if (!elements.musicPreview) return;
    
    if (!state.musicFile && !state.musicUrl) {
      elements.musicPreview.style.display = 'none';
      return;
    }

    elements.musicPreview.style.display = 'block';
    elements.musicPreview.innerHTML = `
      <div class="music-preview-item">
        <div class="music-preview-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div class="music-preview-info">
          <div class="music-preview-title">${escapeHtml(state.musicTitle || 'Unknown Title')}</div>
          <div class="music-preview-artist">${escapeHtml(state.musicArtist || 'Unknown Artist')}</div>
        </div>
        <button type="button" class="music-preview-remove" onclick="removeMusic()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }

  // Remove music
  window.removeMusic = function() {
    state.musicFile = null;
    state.musicUrl = null;
    state.musicTitle = '';
    state.musicArtist = '';
    if (elements.musicInput) {
      elements.musicInput.value = '';
    }
    updateMusicPreview();
    updateConnectButton();
  };

  // Update media preview
  function updateMediaPreview() {
    if (!elements.mediaPreview) return;
    
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
    // Update button text based on whether scheduling is enabled
    if (elements.connectBtn) {
      const isScheduled = elements.scheduleCheckbox && elements.scheduleCheckbox.checked;
      const hasClient = state.selectedClient !== null;
      const hasPlatform = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;
      
      if (!hasClient || !hasPlatform) {
        elements.connectBtn.textContent = 'Connect a Channel to Post';
        elements.connectBtn.disabled = true;
      } else if (isScheduled) {
        elements.connectBtn.textContent = 'Schedule Post';
        elements.connectBtn.disabled = false;
      } else {
        elements.connectBtn.textContent = 'Publish Now';
        elements.connectBtn.disabled = false;
      }
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
    updateMusicPreview();
    updatePreview();
    updateClientDropdown();
    updateConnectButton();
    updatePlatformHint();
  }

  // Get backend URL
  function getBackendUrl() {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5001';
    }
    return window.location.origin;
  }

  // Fetch available clients
  async function fetchClients() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, cannot fetch clients');
        return;
      }

      const backendUrl = getBackendUrl();
      console.log('Fetching clients from:', `${backendUrl}/api/clients`);
      
      const response = await fetch(`${backendUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch clients:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return;
      }

      const result = await response.json();
      console.log('API response:', result);
      
      if (result.success) {
        console.log('All clients fetched:', result.data); // Debug log
        console.log('Total clients count:', result.data?.length || 0);
        
        // Filter clients that have OAuth connected (Instagram or Facebook)
        // A client is considered connected if:
        // 1. Platform is instagram or facebook (not manual)
        // Note: We show all clients with platform instagram/facebook since tokens might be hidden for security
        const connectedClients = (result.data || []).filter(client => {
          const hasPlatform = client.platform === 'instagram' || client.platform === 'facebook';
          
          // Check for OAuth connection indicators (for debugging)
          const hasOAuthConnection = !!(
            client.pageAccessToken || 
            client.longLivedUserToken || 
            client.pageId || 
            client.igUserId || 
            client.socialMediaId
          );
          
          // Show all clients with instagram/facebook platform
          // (tokens might be excluded from API response for security)
          const isConnected = hasPlatform;
          
          console.log(`Client ${client.name || client.email}:`, {
            platform: client.platform,
            hasPlatform: hasPlatform,
            hasOAuthConnection: hasOAuthConnection,
            pageAccessToken: !!client.pageAccessToken,
            longLivedUserToken: !!client.longLivedUserToken,
            pageId: client.pageId,
            igUserId: client.igUserId,
            socialMediaId: client.socialMediaId,
            isConnected: isConnected,
            fullClient: client // Log full client object for debugging
          }); // Debug log
          
          return isConnected;
        });
        
        console.log('Connected clients after filtering:', connectedClients); // Debug log
        console.log('Connected clients count:', connectedClients.length);
        
        state.clients = connectedClients;
        updateClientDropdown();
        updateClientModal();
        
        // Show a message if no connected clients found
        if (connectedClients.length === 0 && result.data && result.data.length > 0) {
          console.warn('No connected clients found, but there are clients in the database. Check platform field.');
          console.warn('All clients:', result.data.map(c => ({ name: c.name, platform: c.platform })));
        }
      } else {
        console.error('Failed to fetch clients:', result.error);
        if (result.error) {
          showError(result.error);
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      showError('Failed to load client accounts. Please refresh the page.');
    }
  }

  // Update client dropdown
  function updateClientDropdown() {
    if (!elements.clientSelect) return;
    
    // Clear existing options except the first one
    const firstOption = elements.clientSelect.querySelector('option[value=""]');
    elements.clientSelect.innerHTML = '';
    if (firstOption) {
      elements.clientSelect.appendChild(firstOption);
    }
    
    if (state.clients.length === 0) {
      elements.clientSelect.style.display = 'none';
      if (elements.clientSelectionHint) {
        elements.clientSelectionHint.style.display = 'block';
      }
      return;
    }
    
    // Filter clients based on selected platform
    // Show all clients initially, filter only when a specific platform is selected
    let filteredClients = state.clients;
    const hasInstagram = state.selectedPlatforms.instagram;
    const hasFacebook = state.selectedPlatforms.facebook;
    const hasTwitter = state.selectedPlatforms.twitter;
    
    // Only filter if exactly one platform is selected
    // This allows users to see all their connected accounts initially
    const selectedPlatformCount = [hasInstagram, hasFacebook, hasTwitter].filter(Boolean).length;
    
    if (selectedPlatformCount === 1) {
      // If only one platform is selected, filter to that platform
      if (hasInstagram && !hasFacebook && !hasTwitter) {
        filteredClients = state.clients.filter(client => client.platform === 'instagram');
      } else if (hasFacebook && !hasInstagram && !hasTwitter) {
        filteredClients = state.clients.filter(client => client.platform === 'facebook');
      } else if (hasTwitter && !hasInstagram && !hasFacebook) {
        // Twitter not supported yet, show all
        filteredClients = state.clients;
      }
    }
    // If no platform selected or multiple platforms selected, show all compatible clients
    
    if (filteredClients.length === 0) {
      elements.clientSelect.style.display = 'none';
      if (elements.clientSelectionHint) {
        const platform = hasInstagram ? 'Instagram' : hasFacebook ? 'Facebook' : 'selected platform';
        elements.clientSelectionHint.innerHTML = `No ${platform} accounts found. <a href="/dashboard/clients" class="client-selection-link">Connect an ${platform} account first</a>`;
        elements.clientSelectionHint.style.display = 'block';
      }
      // Clear selected client if it's not in filtered list
      state.selectedClient = null;
      updateConnectButton();
      return;
    }
    
    // Show dropdown and hide hint
    elements.clientSelect.style.display = 'block';
    if (elements.clientSelectionHint) {
      elements.clientSelectionHint.style.display = 'none';
    }
    
    // Add client options
    filteredClients.forEach(client => {
      const option = document.createElement('option');
      option.value = client._id;
      const platformIcon = client.platform === 'instagram' ? '📷' : '👤';
      option.textContent = `${platformIcon} ${client.name || client.email || 'Unknown'} - ${client.platform === 'instagram' ? 'Instagram' : 'Facebook'}`;
      elements.clientSelect.appendChild(option);
    });
    
    // If current selected client is not in filtered list, clear it
    if (state.selectedClient && !filteredClients.find(c => c._id === state.selectedClient)) {
      state.selectedClient = null;
      elements.clientSelect.value = '';
    }
    
    // Add change listener if not already added
    if (!elements.clientSelect.hasAttribute('data-listener-added')) {
      elements.clientSelect.addEventListener('change', (e) => {
        state.selectedClient = e.target.value || null;
        updateConnectButton();
      });
      elements.clientSelect.setAttribute('data-listener-added', 'true');
    }
  }

  // Create client selection modal
  function createClientModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'client-modal-overlay';
    overlay.id = 'client-modal-overlay';
    overlay.style.display = 'none';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'client-modal';
    modal.id = 'client-modal';
    
    modal.innerHTML = `
      <div class="client-modal-header">
        <h3 class="client-modal-title">Select Account</h3>
        <button type="button" class="client-modal-close" id="client-modal-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="client-modal-body">
        <div id="client-list" class="client-list"></div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div class="client-modal-footer">
          <button type="button" class="client-modal-cancel-btn" id="client-modal-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Store references
    elements.clientModalOverlay = overlay;
    elements.clientModal = modal;
    elements.clientList = document.getElementById('client-list');
    elements.clientModalClose = document.getElementById('client-modal-close');
    elements.errorMessage = document.getElementById('error-message');
    
    // Add event listeners
    elements.clientModalClose.addEventListener('click', closeClientModal);
    document.getElementById('client-modal-cancel-btn').addEventListener('click', closeClientModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeClientModal();
      }
    });
  }

  // Update client modal
  function updateClientModal() {
    if (!elements.clientList) return;
    
    if (state.clients.length === 0) {
      elements.clientList.innerHTML = `
        <div class="client-empty">
          <p class="client-empty-text">No connected accounts found.</p>
          <p class="client-empty-hint">Please connect an Instagram or Facebook account first.</p>
          <a href="/dashboard/clients" class="client-empty-link">Go to Accounts</a>
        </div>
      `;
      return;
    }
    
    elements.clientList.innerHTML = state.clients.map(client => `
      <button type="button" class="client-item" data-client-id="${client._id}">
        <div class="client-item-icon">
          ${client.platform === 'instagram' 
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
          }
        </div>
        <div class="client-item-info">
          <div class="client-item-name">${escapeHtml(client.name || client.email || 'Unknown')}</div>
          <div class="client-item-platform">${client.platform === 'instagram' ? 'Instagram' : 'Facebook'}</div>
        </div>
      </button>
    `).join('');
    
    // Add click listeners
    elements.clientList.querySelectorAll('.client-item').forEach(item => {
      item.addEventListener('click', () => {
        const clientId = item.dataset.clientId;
        selectClient(clientId);
      });
    });
  }

  // Open client modal
  function openClientModal() {
    if (!elements.clientModalOverlay) return;
    elements.clientModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    updateClientModal();
  }

  // Close client modal
  function closeClientModal() {
    if (!elements.clientModalOverlay) return;
    elements.clientModalOverlay.style.display = 'none';
    document.body.style.overflow = '';
    hideError();
  }

  // Select client and create post (for modal - keeping for backward compatibility)
  async function selectClient(clientId) {
    state.selectedClient = clientId;
    // Update dropdown if it exists
    if (elements.clientSelect) {
      elements.clientSelect.value = clientId;
    }
    closeClientModal();
    await createPost();
  }

  // Show error message
  function showError(message) {
    // Show in modal if open, otherwise show in main area
    const mainError = document.getElementById('main-error-message');
    if (elements.errorMessage && elements.clientModalOverlay && elements.clientModalOverlay.style.display === 'flex') {
      elements.errorMessage.textContent = message;
      elements.errorMessage.style.display = 'block';
    } else if (mainError) {
      mainError.textContent = message;
      mainError.style.display = 'block';
      // Scroll to error
      mainError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert(message);
    }
  }

  // Hide error message
  function hideError() {
    if (elements.errorMessage) {
      elements.errorMessage.style.display = 'none';
    }
    const mainError = document.getElementById('main-error-message');
    if (mainError) {
      mainError.style.display = 'none';
    }
  }

  // Show aspect ratio error popup
  function showAspectRatioErrorPopup(errorData) {
    const modal = document.getElementById('aspect-ratio-error-modal');
    const messageEl = document.getElementById('aspect-ratio-error-message');
    const requirementsEl = document.getElementById('aspect-ratio-error-requirements');
    const closeBtn = document.getElementById('aspect-ratio-error-close');
    const okBtn = document.getElementById('aspect-ratio-error-ok');

    if (!modal || !messageEl || !requirementsEl) {
      // Fallback to regular error if modal elements not found
      showError(errorData.error || 'Instagram rejected the image due to invalid aspect ratio.');
      return;
    }

    // Set error message
    messageEl.textContent = errorData.error || 'Instagram rejected the image due to invalid aspect ratio.';

    // Set requirements based on post type
    const postType = errorData.postType || 'post';
    let requirementsHTML = '<h3>Instagram Requirements</h3><ul>';
    
    if (postType === 'story') {
      requirementsHTML += '<li><strong>Stories:</strong> Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)</li>';
      requirementsHTML += '<li>Maximum 15 seconds for video stories</li>';
    } else if (postType === 'reel') {
      requirementsHTML += '<li><strong>Reels:</strong> Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)</li>';
      requirementsHTML += '<li>Maximum 90 seconds for video reels</li>';
      requirementsHTML += '<li>Must be a video file</li>';
    } else {
      requirementsHTML += '<li><strong>Regular Posts:</strong> Aspect ratio must be between 0.8 and 1.91</li>';
      requirementsHTML += '<li>Examples: 4:5 portrait, 1:1 square, 1.91:1 landscape</li>';
      requirementsHTML += '<li>Minimum dimensions: 600x315px for landscape, 600x750px for portrait</li>';
    }
    
    requirementsHTML += '</ul>';
    requirementsEl.innerHTML = requirementsHTML;

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Close handlers
    function closeModal() {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }

    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }

    if (okBtn) {
      okBtn.onclick = closeModal;
    }

    // Close on overlay click
    modal.onclick = function(e) {
      if (e.target === modal) {
        closeModal();
      }
    };

    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    });
  }

  // Show upload progress modal
  function showUploadProgress(fileName, progress) {
    // Ensure progress is within valid range
    progress = Math.max(0, Math.min(100, progress));
    
    // Remove existing modal if any
    let modal = document.getElementById('upload-progress-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'upload-progress-modal';
      modal.className = 'upload-progress-modal';
      modal.innerHTML = `
        <div class="upload-progress-overlay"></div>
        <div class="upload-progress-content">
          <div class="upload-progress-icon-container">
            <div class="upload-progress-ring-outer"></div>
            <div class="upload-progress-ring-spinner"></div>
            <svg class="upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h3 class="upload-progress-title">Uploading Media</h3>
          <p class="upload-progress-subtitle">Please wait while we upload your file</p>
          <div class="upload-progress-bar-container">
            <div class="upload-progress-bar" id="upload-progress-bar"></div>
          </div>
          <div class="upload-progress-percentage" id="upload-progress-percentage">0%</div>
          <p class="upload-progress-filename" id="upload-progress-filename">${escapeHtml(fileName)}</p>
        </div>
      `;
      document.body.appendChild(modal);
      // Force initial render
      requestAnimationFrame(() => {
        updateProgressElements(progress);
      });
    } else {
      // Update immediately
      updateProgressElements(progress);
    }
  }
  
  // Helper function to update progress elements with immediate updates
  function updateProgressElements(progress) {
    const progressBar = document.getElementById('upload-progress-bar');
    const progressPercentage = document.getElementById('upload-progress-percentage');
    
    if (progressBar) {
      // Update immediately without any delay
      progressBar.style.width = progress + '%';
      progressBar.style.transition = 'width 0.03s linear';
    }
    
    if (progressPercentage) {
      // Update percentage immediately
      progressPercentage.textContent = progress + '%';
    }
  }

  // Hide upload progress modal
  function hideUploadProgress() {
    const modal = document.getElementById('upload-progress-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  // Upload music file
  async function uploadMusicFile() {
    if (!state.musicFile) return null;
    
    try {
      showUploadProgress(state.musicFile.name, 0);
      
      const formData = new FormData();
      formData.append('image', state.musicFile); // Using 'image' field name for compatibility
      
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const xhr = new XMLHttpRequest();
      let lastProgress = -1;
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            if (percentComplete !== lastProgress) {
              lastProgress = percentComplete;
              showUploadProgress(state.musicFile.name, percentComplete);
            }
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success) {
                showUploadProgress(state.musicFile.name, 100);
                setTimeout(() => {
                  hideUploadProgress();
                }, 500);
                resolve(result.data.url);
              } else {
                reject(new Error(result.error || 'Upload failed'));
              }
            } catch (parseError) {
              reject(new Error('Failed to parse server response'));
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              reject(new Error(errorResult.error || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        xhr.open('POST', `${backendUrl}/api/posts/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error uploading music:', error);
      hideUploadProgress();
      throw new Error(`Failed to upload music: ${error.message}`);
    }
  }

  // Upload media files with progress tracking
  async function uploadMediaFiles() {
    const uploadedUrls = [];
    
    for (let i = 0; i < state.mediaFiles.length; i++) {
      const media = state.mediaFiles[i];
      try {
        showUploadProgress(media.file.name, 0);
        
        const formData = new FormData();
        formData.append('image', media.file);
        
        const token = localStorage.getItem('auth_token');
        const backendUrl = getBackendUrl();
        
        // Use XMLHttpRequest for progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          let lastProgress = -1;
          
          // Track upload progress - update immediately for real-time feedback
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && e.total > 0) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              
              // Update immediately on every progress event for real-time updates
              if (percentComplete !== lastProgress) {
                lastProgress = percentComplete;
                // Update immediately without delay
                showUploadProgress(media.file.name, percentComplete);
              }
            }
          });
          
          // Handle completion
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                  uploadedUrls.push(result.data.url);
                  showUploadProgress(media.file.name, 100);
                  setTimeout(() => {
                    if (i === state.mediaFiles.length - 1) {
                      hideUploadProgress();
                    }
                  }, 500);
                  resolve();
                } else {
                  reject(new Error(result.error || 'Upload failed'));
                }
              } catch (parseError) {
                reject(new Error('Failed to parse server response'));
              }
            } else {
              try {
                const errorResult = JSON.parse(xhr.responseText);
                reject(new Error(errorResult.error || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });
          
          // Handle errors
          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });
          
          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });
          
          // Open and send request
          xhr.open('POST', `${backendUrl}/api/posts/upload`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (error) {
        console.error('Error uploading media:', error);
        hideUploadProgress();
        throw new Error(`Failed to upload ${media.file.name}: ${error.message}`);
      }
    }
    
    return uploadedUrls;
  }

  // Create post
  async function createPost() {
    if (!state.selectedClient) {
      showError('Please select a client account');
      return;
    }

    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;
    if (!hasSelection) {
      showError('Please select at least one platform');
      return;
    }

    // Determine platform
    let platform = 'instagram';
    if (state.selectedPlatforms.facebook && state.selectedPlatforms.instagram) {
      platform = 'both';
    } else if (state.selectedPlatforms.facebook) {
      platform = 'facebook';
    } else if (state.selectedPlatforms.instagram) {
      platform = 'instagram';
    }

    // Show loading state
    const originalText = elements.connectBtn.textContent;
    elements.connectBtn.disabled = true;
    elements.connectBtn.textContent = 'Creating post...';
    hideError();

    try {
      // Upload media files if any
      let mediaUrls = [];
      if (state.mediaFiles.length > 0) {
        elements.connectBtn.textContent = 'Uploading media...';
        mediaUrls = await uploadMediaFiles();
      }

      // Upload music file if any
      let musicUrl = null;
      if (state.musicFile) {
        elements.connectBtn.textContent = 'Uploading music...';
        musicUrl = await uploadMusicFile();
      }

      // Update scheduled time if schedule checkbox is checked
      if (elements.scheduleCheckbox && elements.scheduleCheckbox.checked) {
        updateScheduledTime();
        
        // Validate scheduled time
        if (!state.scheduledTime) {
          showError('Please select a valid date and time in the future');
          elements.connectBtn.textContent = originalText;
          elements.connectBtn.disabled = false;
          return;
        }
      } else {
        state.scheduledTime = null;
      }

      // Prepare post data
      const postData = {
        client: state.selectedClient,
        platform: platform,
        caption: state.caption || '',
        content: state.caption || '',
        mediaUrls: mediaUrls,
        musicUrl: musicUrl || state.musicUrl,
        musicTitle: state.musicTitle,
        musicArtist: state.musicArtist,
        hashtags: extractHashtags(state.caption),
        tags: state.tags,
        postType: state.postType
      };

      // Add scheduled time if set, otherwise publish immediately
      if (state.scheduledTime) {
        postData.scheduledTime = state.scheduledTime;
        postData.status = 'scheduled';
        postData.publishImmediately = false;
      } else {
        // Publish immediately if not scheduled
        postData.publishImmediately = true;
      }

      // Create post
      elements.connectBtn.textContent = 'Creating post...';
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (result.success) {
        // Check if there's an aspect ratio error
        if (result.aspectRatioError && result.aspectRatioError.isAspectRatioError) {
          // Show aspect ratio error popup
          showAspectRatioErrorPopup(result.aspectRatioError);
          elements.connectBtn.textContent = originalText;
          elements.connectBtn.disabled = false;
          return;
        }
        
        // If publishing immediately, show publishing status
        if (postData.publishImmediately) {
          elements.connectBtn.textContent = 'Publishing...';
          // Wait a bit for the backend to publish, then redirect
          setTimeout(() => {
            elements.connectBtn.textContent = 'Success! Redirecting...';
            setTimeout(() => {
              window.location.href = '/dashboard/posts';
            }, 1000);
          }, 2000);
        } else {
          // Scheduled - redirect immediately
          elements.connectBtn.textContent = 'Success! Redirecting...';
          setTimeout(() => {
            window.location.href = '/dashboard/posts';
          }, 1000);
        }
      } else {
        throw new Error(result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showError(error.message || 'Failed to create post. Please try again.');
      elements.connectBtn.textContent = originalText;
      elements.connectBtn.disabled = false;
    }
  }

  // Update scheduled time from date and time inputs
  function updateScheduledTime() {
    if (!elements.scheduleDate || !elements.scheduleTime) {
      state.scheduledTime = null;
      return;
    }

    const date = elements.scheduleDate.value;
    const time = elements.scheduleTime.value;

    if (date && time) {
      // Combine date and time into a Date object
      const dateTimeString = `${date}T${time}`;
      const scheduledDate = new Date(dateTimeString);
      
      // Validate that scheduled time is in the future
      if (scheduledDate > new Date()) {
        state.scheduledTime = scheduledDate.toISOString();
      } else {
        showError('Scheduled time must be in the future');
        state.scheduledTime = null;
        if (elements.scheduleDate) elements.scheduleDate.value = '';
        if (elements.scheduleTime) elements.scheduleTime.value = '';
      }
    } else {
      state.scheduledTime = null;
    }
  }

  // Extract hashtags from caption
  function extractHashtags(text) {
    if (!text) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Handle connect button click
  function handleConnect() {
    if (elements.connectBtn.disabled) {
      return;
    }

    const hasSelection = state.selectedPlatforms.facebook || state.selectedPlatforms.instagram || state.selectedPlatforms.twitter;

    if (!hasSelection) {
      showError('Please select at least one platform to continue.');
      return;
    }

    if (!state.selectedClient) {
      showError('Please select a client account first.');
      if (elements.clientSelect) {
        elements.clientSelect.focus();
        elements.clientSelect.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if (state.clients.length === 0) {
      showError('No connected accounts found. Please connect an account first.');
      setTimeout(() => {
        window.location.href = '/dashboard/clients';
      }, 2000);
      return;
    }

    // Create post directly with selected client
    createPost();
  }

  // Toggle tags dropdown
  function toggleTagsDropdown() {
    if (!elements.tagsDropdown || !elements.tagsBtn) return;
    
    if (isDropdownOpen) {
      closeTagsDropdown();
    } else {
      openTagsDropdown();
    }
  }

  // Open tags dropdown
  function openTagsDropdown() {
    if (!elements.tagsDropdown || !elements.tagsBtn) return;
    
    isDropdownOpen = true;
    elements.tagsDropdown.style.display = 'flex';
    elements.tagsBtn.classList.add('tags-btn-active');
    elements.tagsBtn.setAttribute('aria-expanded', 'true');
    
    // Update tags list
    const searchTerm = elements.tagsSearchInput ? elements.tagsSearchInput.value : '';
    updateTagsList(searchTerm);
    
    // Focus search input after a short delay
    setTimeout(() => {
      if (elements.tagsSearchInput) {
        elements.tagsSearchInput.focus();
      }
    }, 100);
  }

  // Close tags dropdown
  function closeTagsDropdown() {
    if (!elements.tagsDropdown || !elements.tagsBtn) return;
    
    isDropdownOpen = false;
    elements.tagsDropdown.style.display = 'none';
    elements.tagsBtn.classList.remove('tags-btn-active');
    elements.tagsBtn.setAttribute('aria-expanded', 'false');
    
    // Hide create tag input if visible
    hideCreateTagInput();
  }

  // Update tags list in dropdown
  function updateTagsList(searchTerm = '') {
    if (!elements.tagsList) return;
    
    let filteredTags = state.availableTags;
    
    // Filter tags based on search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredTags = state.availableTags.filter(tag => 
        tag.name.toLowerCase().includes(search)
      );
    }
    
    // Render tags
    if (filteredTags.length === 0) {
      elements.tagsList.innerHTML = `
        <div class="tags-empty">
          <p class="tags-empty-text">No tags found${searchTerm.trim() ? ` matching "${escapeHtml(searchTerm)}"` : ''}</p>
        </div>
      `;
      return;
    }
    
    elements.tagsList.innerHTML = filteredTags.map(tag => {
      const tagName = tag.name;
      const tagColor = tag.color || '#8b5cf6';
      const isSelected = state.tags.some(t => t.name === tagName);
      
      return `
        <label class="tag-list-item ${isSelected ? 'tag-item-selected' : ''}" data-tag-name="${escapeHtml(tagName)}">
          <input 
            type="checkbox" 
            class="tag-checkbox" 
            data-tag-name="${escapeHtml(tagName)}"
            ${isSelected ? 'checked' : ''}
            aria-label="Select ${escapeHtml(tagName)} tag"
          />
          <span class="tag-chip" style="background-color: ${tagColor};">
            ${escapeHtml(tagName)}
          </span>
        </label>
      `;
    }).join('');
    
    // Attach event listeners to checkboxes
    elements.tagsList.querySelectorAll('.tag-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const tagName = e.target.dataset.tagName;
        const isChecked = e.target.checked;
        
        if (isChecked) {
          selectTag(tagName);
        } else {
          deselectTag(tagName);
        }
      });
    });

    // Attach click listeners to tag items (click anywhere to toggle)
    elements.tagsList.querySelectorAll('.tag-list-item').forEach(item => {
      // Prevent dropdown from closing when clicking on tag items
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // If clicking directly on checkbox, let the change event handle it
        if (e.target.type === 'checkbox') {
          return;
        }
        
        // Prevent default label behavior
        e.preventDefault();
        
        const checkbox = item.querySelector('.tag-checkbox');
        if (checkbox) {
          // Toggle checkbox programmatically
          checkbox.checked = !checkbox.checked;
          
          // Manually trigger change event or call functions directly
          const tagName = checkbox.dataset.tagName;
          if (checkbox.checked) {
            selectTag(tagName);
          } else {
            deselectTag(tagName);
          }
        }
      });
      
      // Also prevent clicks on tag chips
      const tagChip = item.querySelector('.tag-chip');
      if (tagChip) {
        tagChip.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });
  }

  // Select a tag
  function selectTag(tagName) {
    const tag = state.availableTags.find(t => t.name === tagName);
    if (!tag) return;
    
    // Check if already selected
    if (!state.tags.some(t => t.name === tagName)) {
      state.tags.push({
        name: tag.name,
        color: tag.color
      });
      
      // Update UI
      const searchTerm = elements.tagsSearchInput ? elements.tagsSearchInput.value : '';
      updateTagsList(searchTerm);
      updatePreviewTags();
    }
  }

  // Deselect a tag
  function deselectTag(tagName) {
    state.tags = state.tags.filter(t => t.name !== tagName);
    
    // Update UI
    const searchTerm = elements.tagsSearchInput ? elements.tagsSearchInput.value : '';
    updateTagsList(searchTerm);
    updatePreviewTags();
  }

  // Show create tag input
  function showCreateTagInput() {
    if (!elements.createTagInputWrapper || !elements.createTagInput) return;
    
    state.isCreatingTag = true;
    elements.createTagBtn.style.display = 'none';
    elements.createTagInputWrapper.style.display = 'flex';
    
    // Focus input after a short delay
    setTimeout(() => {
      if (elements.createTagInput) {
        elements.createTagInput.focus();
      }
    }, 50);
  }

  // Hide create tag input
  function hideCreateTagInput() {
    if (!elements.createTagInputWrapper || !elements.createTagInput) return;
    
    state.isCreatingTag = false;
    elements.createTagBtn.style.display = 'flex';
    elements.createTagInputWrapper.style.display = 'none';
    
    // Clear input
    if (elements.createTagInput) {
      elements.createTagInput.value = '';
    }
  }

  // Save new tag
  function saveNewTag() {
    if (!elements.createTagInput) return;
    
    const tagName = elements.createTagInput.value.trim();
    
    if (!tagName) {
      alert('Please enter a tag name');
      return;
    }
    
    // Check if tag already exists
    const tagExists = state.availableTags.some(t => 
      t.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (tagExists) {
      alert('This tag already exists');
      return;
    }
    
    // Create new tag with random color
    const newTag = {
      name: tagName,
      color: getRandomColor()
    };
    
    // Add to available tags
    state.availableTags.push(newTag);
    saveAvailableTags();
    
    // Auto-select the new tag
    state.tags.push(newTag);
    
    // Clear search input if exists
    if (elements.tagsSearchInput) {
      elements.tagsSearchInput.value = '';
    }
    
    // Hide create input and update list
    hideCreateTagInput();
    updateTagsList('');
    updatePreviewTags();
  }

  // Update preview tags display
  function updatePreviewTags() {
    // This would update tags in preview panel if needed
    // For now, we'll keep it simple
  }

  // Open sticker modal
  function openStickerModal() {
    if (!elements.stickerModalOverlay) {
      return;
    }
    
    isStickerModalOpen = true;
    elements.stickerModalOverlay.style.display = 'flex';
    elements.stickerModalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Load stickers
    renderStickers();
    
    // Focus search input
    setTimeout(() => {
      if (elements.stickerSearchInput) {
        elements.stickerSearchInput.focus();
      }
    }, 100);
  }

  // Close sticker modal
  function closeStickerModal() {
    if (!elements.stickerModalOverlay) return;
    
    isStickerModalOpen = false;
    elements.stickerModalOverlay.style.display = 'none';
    elements.stickerModalOverlay.classList.remove('show');
    document.body.style.overflow = '';
    
    // Clear search
    if (elements.stickerSearchInput) {
      elements.stickerSearchInput.value = '';
    }
  }

  // Select sticker category
  function selectStickerCategory(category) {
    currentStickerCategory = category;
    
    // Update active button
    if (elements.stickerCategories) {
      elements.stickerCategories.querySelectorAll('.sticker-category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
          btn.classList.add('active');
        }
      });
    }
    
    // Render stickers for selected category
    renderStickers();
  }

  // Render stickers
  function renderStickers() {
    if (!elements.stickerGrid) return;
    
    let stickers = stickerData.all;
    
    // Filter by category
    if (currentStickerCategory !== 'all') {
      stickers = stickerData[currentStickerCategory] || [];
    }
    
    // Filter by search term
    const searchTerm = elements.stickerSearchInput ? elements.stickerSearchInput.value.toLowerCase() : '';
    if (searchTerm) {
      stickers = stickers.filter(sticker => 
        sticker.name.toLowerCase().includes(searchTerm) ||
        sticker.emoji.includes(searchTerm)
      );
    }
    
    // Render sticker grid
    if (stickers.length === 0) {
      elements.stickerGrid.innerHTML = `
        <div class="sticker-empty">
          <p class="sticker-empty-text">No stickers found</p>
        </div>
      `;
      return;
    }
    
    elements.stickerGrid.innerHTML = stickers.map(sticker => `
      <button 
        type="button" 
        class="sticker-item" 
        data-sticker-id="${sticker.id}"
        title="${escapeHtml(sticker.name)}"
        aria-label="${escapeHtml(sticker.name)} sticker"
      >
        <span class="sticker-emoji">${sticker.emoji}</span>
      </button>
    `).join('');
    
    // Attach click listeners
    elements.stickerGrid.querySelectorAll('.sticker-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stickerId = item.dataset.stickerId;
        selectSticker(stickerId);
      });
    });
  }

  // Filter stickers by search term
  function filterStickers(searchTerm) {
    renderStickers();
  }

  // Select a sticker
  function selectSticker(stickerId) {
    const sticker = stickerData.all.find(s => s.id === stickerId);
    if (!sticker) return;
    
    // Add sticker to caption
    if (elements.captionInput) {
      const cursorPos = elements.captionInput.selectionStart;
      const textBefore = elements.captionInput.value.substring(0, cursorPos);
      const textAfter = elements.captionInput.value.substring(cursorPos);
      
      elements.captionInput.value = textBefore + sticker.emoji + textAfter;
      elements.captionInput.focus();
      
      // Set cursor position after the inserted sticker
      const newCursorPos = cursorPos + sticker.emoji.length;
      elements.captionInput.setSelectionRange(newCursorPos, newCursorPos);
      
      // Update state
      state.caption = elements.captionInput.value;
      
      // Update character count using existing function
      updateCharCount();
      
      // Update preview
      updatePreview();
    }
    
    // Add to selected stickers
    if (!state.selectedStickers.find(s => s.id === stickerId)) {
      state.selectedStickers.push(sticker);
    }
    
    // Close modal after selection (optional - you can remove this if you want to keep it open)
    // closeStickerModal();
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

