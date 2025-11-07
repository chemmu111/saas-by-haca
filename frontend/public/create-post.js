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
    availableTags: [], // All available tags
    isCreatingTag: false, // Whether create tag input is visible
    selectedStickers: [] // Selected stickers for this post
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
    imageUploadBtn: null
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
    if (!files || files.length === 0) return;
    
    // Filter for valid image/video files
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      // If accept attribute is set to images only, filter to images only
      if (elements.mediaInput && elements.mediaInput.accept && 
          elements.mediaInput.accept.includes('image/') && 
          !elements.mediaInput.accept.includes('video/')) {
        return isImage && (file.type === 'image/jpeg' || file.type === 'image/jpg' || 
                          file.type === 'image/png' || file.type === 'image/gif');
      }
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      alert('Please select only image (JPG, PNG, GIF) or video files.');
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
    setTimeout(() => {
      if (elements.mediaInput) {
        elements.mediaInput.value = '';
        // Reset accept attribute if it was changed
        if (elements.imageUploadBtn) {
          // Keep the accept as is, it will be reset when needed
        }
      }
    }, 100);
  }

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
      postType: state.postType,
      tags: state.tags
    };

    // TODO: Send to backend API
    // For now, just show a success message
    setTimeout(() => {
      alert('Post created successfully! (This is a demo - backend integration pending)');
      elements.connectBtn.textContent = originalText;
      elements.connectBtn.disabled = false;
      updateConnectButton();
    }, 1500);
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

