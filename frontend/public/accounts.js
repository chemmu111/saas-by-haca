(function() {
  'use strict';

  // Get auth token from localStorage
  function getAuthToken() {
    try {
      return localStorage.getItem('auth_token');
    } catch (e) {
      return null;
    }
  }

  // Show toast notification
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Load connected accounts
  async function loadAccounts() {
    const accountsList = document.getElementById('accounts-list');
    if (!accountsList) return;

    const token = getAuthToken();
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    try {
      accountsList.innerHTML = '<div class="loading-state">Loading accounts...</div>';

      const response = await fetch('/api/accounts/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load accounts');
      }

      const accounts = data.accounts || [];

      if (accounts.length === 0) {
        accountsList.innerHTML = '<div class="empty-state">No accounts connected yet. Connect your first account above!</div>';
        return;
      }

      accountsList.innerHTML = accounts.map(account => {
        const isExpired = account.isExpired || (account.expiresAt && new Date(account.expiresAt) < new Date());
        const statusClass = isExpired ? 'expired' : 'connected';
        const statusText = isExpired ? 'Token Expired' : 'Connected';
        const lastSync = account.lastSyncAt 
          ? new Date(account.lastSyncAt).toLocaleDateString()
          : 'Never';

        return `
          <div class="account-card">
            <div class="account-info">
              <div class="account-header">
                <span class="provider-badge ${account.provider}">${account.provider.toUpperCase()}</span>
                <span class="account-name">${escapeHtml(account.accountName)}</span>
              </div>
              <div class="account-details">
                <span class="account-detail-item">
                  <strong>ID:</strong> ${escapeHtml(account.providerAccountId)}
                </span>
                <span class="account-detail-item">
                  <span class="status-badge ${statusClass}">${statusText}</span>
                </span>
                <span class="account-detail-item">
                  <strong>Last Sync:</strong> ${lastSync}
                </span>
              </div>
            </div>
            <div class="account-actions">
              <button class="action-btn" onclick="refreshAccount('${account._id}')" ${isExpired ? 'title="Token expired - click to refresh"' : 'title="Refresh token"'}>
                Refresh
              </button>
              <button class="action-btn danger" onclick="disconnectAccount('${account._id}')">
                Disconnect
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading accounts:', error);
      accountsList.innerHTML = `<div class="empty-state">Error loading accounts: ${error.message}</div>`;
    }
  }

  // Connect account handler
  async function connectAccount(provider) {
    const token = getAuthToken();
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    const modal = document.getElementById('oauth-modal');
    const oauthLink = document.getElementById('oauth-link');
    const cancelBtn = document.getElementById('cancel-oauth');

    try {
      // Show modal
      if (modal) modal.style.display = 'flex';

      // Get OAuth URL
      const response = await fetch(`/oauth/connect/${provider}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to connect' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate OAuth URL');
      }

      // Set link
      if (oauthLink) {
        oauthLink.href = data.redirectUrl;
      }

      // Try to open in popup
      const popup = window.open(
        data.redirectUrl,
        'oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup blocked, show link
        if (oauthLink) {
          oauthLink.style.display = 'inline-block';
        }
      } else {
        // Monitor popup for redirect
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            if (modal) modal.style.display = 'none';
            // Reload accounts after OAuth completes
            setTimeout(() => {
              loadAccounts();
              checkURLParams();
            }, 1000);
          }
        }, 500);
      }

      // Cancel handler
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          if (popup && !popup.closed) {
            popup.close();
          }
          if (modal) modal.style.display = 'none';
        };
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      const errorMsg = error.message || 'Failed to connect account';
      showToast(errorMsg, 'error');
      if (modal) modal.style.display = 'none';
      
      // Show detailed error in console for debugging
      console.error('Detailed error:', {
        provider,
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Refresh account token
  async function refreshAccount(accountId) {
    const token = getAuthToken();
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const response = await fetch('/api/accounts/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to refresh token');
      }

      showToast('Token refreshed successfully');
      loadAccounts();
    } catch (error) {
      console.error('Error refreshing token:', error);
      showToast(error.message || 'Failed to refresh token', 'error');
    }
  }

  // Disconnect account
  async function disconnectAccount(accountId) {
    const token = getAuthToken();
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      const response = await fetch('/api/accounts/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });

      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect account');
      }

      showToast('Account disconnected successfully');
      loadAccounts();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      showToast(error.message || 'Failed to disconnect account', 'error');
    }
  }

  // Check URL params for success/error messages
  function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('connected')) {
      const provider = params.get('connected');
      showToast(`Successfully connected ${provider} account!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (params.has('error')) {
      const error = params.get('error');
      let message = 'An error occurred';
      
      switch (error) {
        case 'oauth_denied':
          message = 'OAuth authorization was denied';
          break;
        case 'invalid_state':
          message = 'Invalid state parameter. Please try again.';
          break;
        case 'missing_code':
          message = 'Authorization code missing. Please try again.';
          break;
        case 'connection_failed':
          message = 'Failed to connect account. Please try again.';
          break;
        default:
          message = `Error: ${error}`;
      }
      
      showToast(message, 'error');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Make functions global
  window.refreshAccount = refreshAccount;
  window.disconnectAccount = disconnectAccount;

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Check auth
    if (!getAuthToken()) {
      window.location.href = '/login.html';
      return;
    }

    // Load accounts
    loadAccounts();

    // Check URL params
    checkURLParams();

    // Connect button handlers
    document.querySelectorAll('.connect-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const provider = this.getAttribute('data-provider');
        if (provider) {
          this.disabled = true;
          connectAccount(provider).finally(() => {
            this.disabled = false;
          });
        }
      });
    });
  });
})();

