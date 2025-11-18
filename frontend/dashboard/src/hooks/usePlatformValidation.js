import { useState, useEffect } from 'react';
import { getBackendUrl } from '../config/api.js';

export const usePlatformValidation = (selectedClient, platform, postType) => {
  const [clientPermissions, setClientPermissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch client permissions
  useEffect(() => {
    if (!selectedClient) {
      setClientPermissions(null);
      return;
    }

    const fetchClientPermissions = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('auth_token');
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/posts/clients/${selectedClient}/permissions`, {
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
        }
      } catch (err) {
        console.error('Error fetching client permissions:', err);
        setError('Failed to check client permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchClientPermissions();
  }, [selectedClient]);

  // Get available platforms based on client permissions
  const getAvailablePlatforms = () => {
    if (!clientPermissions) return [];

    const platforms = [];

    // Check Instagram access
    if (clientPermissions.canAccessInstagram) {
      platforms.push('instagram');
    }

    // Facebook is always available (we'll check permissions during posting)
    platforms.push('facebook');

    // Both is available if at least one platform is available
    if (platforms.length >= 1) {
      platforms.push('both');
    }

    return platforms;
  };

  // Get available post types for selected platform
  const getAvailablePostTypes = () => {
    if (!platform) return [];

    switch (platform) {
      case 'instagram':
        if (!clientPermissions?.canAccessInstagram) return [];
        return ['post', 'story', 'reel', 'carousel'];

      case 'facebook':
        return ['post', 'carousel'];

      case 'both':
        // Common post types between Instagram and Facebook
        return ['post', 'carousel'];

      default:
        return [];
    }
  };

  // Validate current selection
  const validateSelection = (selectedPlatform, selectedPostType) => {
    const errors = [];
    const warnings = [];

    if (!selectedClient) {
      errors.push('Please select a client account');
    }

    if (!selectedPlatform) {
      errors.push('Please select a platform');
    } else {
      const availablePlatforms = getAvailablePlatforms();
      if (!availablePlatforms.includes(selectedPlatform)) {
        errors.push(`Selected platform is not available for this client`);
      }
    }

    if (!selectedPostType) {
      errors.push('Please select a post type');
    } else {
      const availablePostTypes = getAvailablePostTypes();
      if (!availablePostTypes.includes(selectedPostType)) {
        errors.push(`Post type "${selectedPostType}" is not available for platform "${selectedPlatform}"`);
      }
    }

    // Platform-specific warnings
    if (selectedPlatform === 'instagram' && selectedPostType === 'story' && clientPermissions) {
      if (!clientPermissions.canAccessInstagram) {
        warnings.push('Instagram access may be limited. Please check your permissions.');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  // Get platform-specific recommendations
  const getRecommendations = () => {
    if (!clientPermissions) return [];

    const recommendations = [];

    if (clientPermissions.errors) {
      clientPermissions.errors.forEach(error => {
        if (error.type === 'permission_denied') {
          recommendations.push('Request missing permissions from Facebook Developer Console');
        }
      });
    }

    if (clientPermissions.recommendations) {
      recommendations.push(...clientPermissions.recommendations);
    }

    return recommendations;
  };

  return {
    clientPermissions,
    loading,
    error,
    getAvailablePlatforms,
    getAvailablePostTypes,
    validateSelection,
    getRecommendations
  };
};
