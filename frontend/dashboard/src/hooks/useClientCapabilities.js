import { useState, useEffect } from 'react';

/**
 * Custom hook for checking client capabilities and permissions
 * @param {string} selectedClientId - The selected client ID
 * @param {string} platform - The selected platform
 * @param {string} postType - The selected post type
 * @returns {Object} - Client permissions and available options
 */
export const useClientCapabilities = (selectedClientId, platform, postType) => {
  const [clientPermissions, setClientPermissions] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to get backend URL (robust version)
  const getBackendUrl = () => {
    // Force correct backend for custom domain
    if (window.location.hostname.includes('socialhac.com')) {
      return 'https://haca-social-x-backend.onrender.com/api';
    }

    // Development mode
    if (window.location.port === '3000' || window.location.port === '5173') {
      const savedPort = localStorage.getItem('backend_port');
      return savedPort ? `http://localhost:${savedPort}/api` : 'http://localhost:5000/api';
    }

    // Default production fallback
    return 'https://haca-social-x-backend.onrender.com/api';
  };

  // Fetch client data and permissions when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setClientPermissions(null);
      setClientData(null);
      return;
    }

    const fetchClientData = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('auth_token');
        const backendUrl = getBackendUrl();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch client data
        let clientResult;
        try {
          const clientResponse = await fetch(`${backendUrl}/clients/${selectedClientId}`, { headers });

          if (!clientResponse.ok) {
            if (clientResponse.status === 404) {
              throw new Error('Client 404'); // Handle specifically
            }
            throw new Error(`Client fetch failed: ${clientResponse.status}`);
          }
          clientResult = await clientResponse.json();

          if (clientResult.success) {
            setClientData(clientResult.data);
          } else {
            setError(clientResult.error || 'Failed to fetch client data');
            setClientData(null);
          }
        } catch (clientErr) {
          if (clientErr.message === 'Client 404') {
            console.warn(`Client ${selectedClientId} not found`);
            setError('Client not found');
            setClientData(null);
          } else {
            console.error('Error fetching client:', clientErr);
            setError('Failed to fetch client data');
            setClientData(null);
          }
          // Stop here if client fetch failed
          return;
        }

        // Fetch client permissions
        try {
          const permissionsResponse = await fetch(`${backendUrl}/posts/clients/${selectedClientId}/permissions`, { headers });
          if (permissionsResponse.ok) {
            const permissionsResult = await permissionsResponse.json();
            if (permissionsResult.success) {
              setClientPermissions(permissionsResult.data);
            } else {
              setError(permissionsResult.error || 'Failed to fetch client permissions');
              setClientPermissions(null);
            }
          } else {
            console.error('Permissions fetch failed:', permissionsResponse.status);
            setClientPermissions(null);
          }
        } catch (permErr) {
          console.error('Error fetching client permissions:', permErr);
          setError('Failed to fetch client permissions');
          setClientPermissions(null);
        }

      } catch (err) {
        console.error('Error checking client capabilities:', err);
        if (error !== 'Client not found') {
          setError('Failed to check client permissions');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [selectedClientId]);

  /**
   * Get available platforms based on client permissions
   * @returns {string[]} - Array of available platform strings
   */
  const getAvailablePlatforms = () => {
    if (!clientData) return ['facebook']; // Default to Facebook only

    const platforms = [];

    // Check Instagram access - requires both igUserId and pageAccessToken
    const hasInstagram = clientData.igUserId && clientData.pageAccessToken;
    if (hasInstagram && clientPermissions?.canAccessInstagram) {
      platforms.push('instagram');
    }

    // Facebook is always available (we'll check permissions during posting)
    platforms.push('facebook');

    // Both is available if at least Instagram is available
    if (platforms.includes('instagram')) {
      platforms.push('both');
    }

    return platforms;
  };

  /**
   * Get available post types for selected platform
   * @returns {string[]} - Array of available post type strings
   */
  const getAvailablePostTypes = () => {
    if (!platform) return ['post']; // Default to post

    switch (platform) {
      case 'instagram':
        if (!clientPermissions?.canAccessInstagram) return ['post'];
        return ['post', 'story', 'reel', 'carousel', 'video'];

      case 'facebook':
        return ['post', 'carousel'];

      case 'both':
        // Common post types between Instagram and Facebook
        return ['post', 'carousel'];

      default:
        return ['post'];
    }
  };

  /**
   * Validate current selection against client capabilities
   * @param {string} selectedPlatform - The platform to validate
   * @param {string} selectedPostType - The post type to validate
   * @returns {Object} - Validation result with isValid, errors, and warnings
   */
  const validateSelection = (selectedPlatform, selectedPostType) => {
    const errors = [];
    const warnings = [];

    if (!selectedClientId) {
      errors.push('Please select a client account');
      return { isValid: false, errors, warnings };
    }

    if (!selectedPlatform) {
      errors.push('Please select a platform');
      return { isValid: false, errors, warnings };
    }

    // Check if platform is available
    const availablePlatforms = getAvailablePlatforms();
    if (!availablePlatforms.includes(selectedPlatform)) {
      if (selectedPlatform === 'instagram') {
        errors.push('Instagram is not connected for this client. Please check your access tokens.');
        warnings.push('Missing: igUserId or pageAccessToken');
      } else {
        errors.push(`Platform "${selectedPlatform}" is not available for this client`);
      }
      return { isValid: false, errors, warnings };
    }

    if (!selectedPostType) {
      errors.push('Please select a post type');
      return { isValid: false, errors, warnings };
    }

    // Check if post type is available for platform
    const availablePostTypes = getAvailablePostTypes();
    if (!availablePostTypes.includes(selectedPostType)) {
      errors.push(`Post type "${selectedPostType}" is not available for platform "${selectedPlatform}"`);
      return { isValid: false, errors, warnings };
    }

    // Platform-specific warnings
    if (selectedPlatform === 'instagram' && selectedPostType === 'story' && clientPermissions) {
      if (!clientPermissions.canAccessInstagram) {
        warnings.push('Instagram access may be limited. Please check your permissions.');
      }
    }

    // Token validation warnings
    if (selectedPlatform === 'instagram' && clientData) {
      if (!clientData.pageAccessToken) {
        warnings.push('Instagram pageAccessToken is missing. Publishing may fail.');
      }
      if (!clientData.igUserId) {
        warnings.push('Instagram igUserId is missing. Publishing may fail.');
      }
    }

    if (selectedPlatform === 'facebook' && clientData) {
      if (!clientData.pageId && !clientData.pageAccessToken) {
        warnings.push('Facebook page credentials may be missing. Publishing may fail.');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  /**
   * Get platform-specific recommendations
   * @returns {string[]} - Array of recommendation strings
   */
  const getRecommendations = () => {
    if (!clientPermissions) return [];

    const recommendations = [];

    if (clientPermissions.errors) {
      clientPermissions.errors.forEach(error => {
        if (error.type === 'permission_denied') {
          recommendations.push('Request missing permissions from Facebook Developer Console');
        } else if (error.type === 'token_expired') {
          recommendations.push('Re-authenticate your Instagram account');
        }
      });
    }

    if (clientPermissions.recommendations) {
      recommendations.push(...clientPermissions.recommendations);
    }

    return recommendations;
  };

  /**
   * Check if client has required tokens for publishing
   * @param {string} platform - The platform to check
   * @returns {boolean} - Whether tokens are valid
   */
  const hasRequiredTokens = (platform) => {
    if (!clientData) return false;

    switch (platform) {
      case 'instagram':
        return !!(clientData.igUserId && clientData.pageAccessToken) &&
          (clientPermissions?.canAccessInstagram || false);
      case 'facebook':
        return !!(clientData.pageId || clientData.pageAccessToken);
      case 'both':
        return !!(clientData.igUserId && clientData.pageAccessToken) &&
          (clientPermissions?.canAccessInstagram || false) &&
          !!(clientData.pageId || clientData.pageAccessToken);
      default:
        return false;
    }
  };

  /**
   * Get connection status for each platform
   * @returns {Object} - Status for each platform
   */
  const getConnectionStatus = () => {
    if (!clientData) {
      return {
        instagram: { connected: false, message: 'No client data' },
        facebook: { connected: false, message: 'No client data' }
      };
    }

    return {
      instagram: {
        connected: !!(clientData.igUserId && clientData.pageAccessToken),
        hasToken: !!clientData.pageAccessToken,
        hasUserId: !!clientData.igUserId,
        message: !clientData.igUserId
          ? 'Instagram User ID missing'
          : !clientData.pageAccessToken
            ? 'Instagram Access Token missing'
            : clientPermissions?.canAccessInstagram
              ? 'Instagram connected'
              : 'Instagram connected but permissions may be limited'
      },
      facebook: {
        connected: !!(clientData.pageId || clientData.pageAccessToken),
        hasPageId: !!clientData.pageId,
        hasToken: !!clientData.pageAccessToken,
        message: !clientData.pageId && !clientData.pageAccessToken
          ? 'Facebook credentials missing'
          : 'Facebook connected'
      }
    };
  };

  return {
    clientPermissions,
    clientData,
    loading,
    error,
    getAvailablePlatforms,
    getAvailablePostTypes,
    validateSelection,
    getRecommendations,
    hasRequiredTokens,
    getConnectionStatus,
    availablePlatforms: getAvailablePlatforms(),
    availablePostTypes: getAvailablePostTypes()
  };
};