import { useState } from 'react';
import { getBackendUrl } from '../config/api.js';

export const usePostPublishing = () => {
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState('');

  const publishPost = async (postId) => {
    setPublishing(true);
    setError('');
    setPublishResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setPublishResult(result.data);
        return { success: true, data: result.data };
      } else {
        setError(result.error || 'Failed to publish post');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error publishing post:', err);
      setError(err.message || 'Failed to publish post');
      return { success: false, error: err.message };
    } finally {
      setPublishing(false);
    }
  };

  const getPostInsights = (publishResult) => {
    if (!publishResult) return null;

    const insights = {
      status: publishResult.status,
      publishedAt: publishResult.publishedTime,
      platforms: []
    };

    // Instagram insights
    if (publishResult.instagramPostId) {
      insights.platforms.push({
        platform: 'instagram',
        postId: publishResult.instagramPostId,
        url: publishResult.instagramPostUrl,
        success: true
      });
    }

    // Facebook insights
    if (publishResult.facebookPostId) {
      insights.platforms.push({
        platform: 'facebook',
        postId: publishResult.facebookPostId,
        url: publishResult.facebookPostUrl,
        success: true
      });
    }

    // Handle partial failures
    if (publishResult.publishingErrors) {
      insights.errors = publishResult.publishingErrors;
    }

    return insights;
  };

  const openPostUrl = (platform, url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const clearPublishResult = () => {
    setPublishResult(null);
    setError('');
  };

  return {
    publishing,
    publishResult,
    error,
    publishPost,
    getPostInsights,
    openPostUrl,
    clearPublishResult
  };
};
