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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get backend URL helper
  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5001';
    }
    return window.location.origin;
  };

  // Fetch client permissions when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setClientPermissions(null);
      return;
    }

    const fetchClientPermissions = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('auth_token');
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/posts/clients/${selectedClientId}/permissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (result.success) {
          setClientPermissions(result.data);
        } else {
          setError(result.error || 'Failed to fetch client permissions');
          setClientPermissions(null);
        }
      } catch (err) {
        console.error('Error fetching client permissions:', err);
        setError('Failed to check client permissions');
        setClientPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClientPermissions();
  }, [selectedClientId]);

  /**
   * Get available platforms based on client permissions
   * @returns {string[]} - Array of available platform strings
   */
  const getAvailablePlatforms = () => {
    if (!clientPermissions) return ['facebook']; // Default to Facebook only

    const platforms = [];

    // Check Instagram access - requires both igUserId and pageAccessToken
    if (clientPermissions.canAccessInstagram && clientPermissions.hasValidTokens) {
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
        return ['post', 'story', 'reel', 'carousel'];

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
    if (selectedPlatform === 'instagram' && clientPermissions) {
      if (clientPermissions.errors && clientPermissions.errors.length > 0) {
        warnings.push('Some Instagram permissions may be missing. Publishing may fail.');
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
    if (!clientPermissions) return false;

    switch (platform) {
      case 'instagram':
        return clientPermissions.canAccessInstagram && clientPermissions.hasValidTokens;
      case 'facebook':
        return clientPermissions.canAccessPage || clientPermissions.canAccessFacebook;
      case 'both':
        return clientPermissions.canAccessInstagram && clientPermissions.hasValidTokens &&
               (clientPermissions.canAccessPage || clientPermissions.canAccessFacebook);
      default:
        return false;
    }
  };

  return {
    clientPermissions,
    loading,
    error,
    getAvailablePlatforms,
    getAvailablePostTypes,
    validateSelection,
    getRecommendations,
    hasRequiredTokens,
    availablePlatforms: getAvailablePlatforms(),
    availablePostTypes: getAvailablePostTypes()
  };
};

/**
 * Unit test skeleton for useClientCapabilities
 * @jest-environment jsdom
 */
export const testUseClientCapabilities = () => {
  // Mock client permissions response
  const mockPermissions = {
    canAccessInstagram: true,
    canAccessPage: true,
    canAccessFacebook: true,
    hasValidTokens: true,
    errors: [],
    recommendations: []
  };

  // Test available platforms
  // const hook = useClientCapabilities('client123', 'instagram', 'post');
  // expect(hook.availablePlatforms).toContain('instagram');
  // expect(hook.availablePlatforms).toContain('facebook');

  // Test platform validation
  // const validation = hook.validateSelection('instagram', 'reel');
  // expect(validation.isValid).toBe(true);

  // Test invalid platform
  // const invalidValidation = hook.validateSelection('twitter', 'post');
  // expect(invalidValidation.isValid).toBe(false);

  console.log('useClientCapabilities tests would run here');
};
