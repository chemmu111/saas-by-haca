/**
 * Posts Controller
 * Handles post creation, validation, and publishing logic
 */

import Post from '../models/Post.js';
import Client from '../models/Client.js';
import { publishPost } from '../services/postingService.js';

/**
 * Validate post data before creation
 * @param {Object} postData - Post data to validate
 * @param {Object} client - Client object
 * @param {boolean} isDraft - Whether this is a draft
 * @returns {Object} - Validation result { isValid, errors }
 */
export const validatePostData = (postData, client, isDraft = false) => {
  const errors = [];

  // Client validation
  if (!client) {
    errors.push('Client is required');
    return { isValid: false, errors };
  }

  // Platform validation
  if (!postData.platform) {
    errors.push('Platform is required');
  } else {
    const validPlatforms = ['instagram', 'facebook', 'both'];
    if (!validPlatforms.includes(postData.platform)) {
      errors.push(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }
  }

  // Post type validation
  if (!postData.postType) {
    errors.push('Post type is required');
  } else {
    const validPostTypes = ['post', 'story', 'reel', 'carousel'];
    if (!validPostTypes.includes(postData.postType)) {
      errors.push(`Invalid post type. Must be one of: ${validPostTypes.join(', ')}`);
    }
  }

  // Platform-specific validations
  if (postData.platform === 'instagram' || postData.platform === 'both') {
    if (!client.igUserId) {
      errors.push('Instagram User ID is missing for this client');
    }
    if (!client.pageAccessToken) {
      errors.push('Instagram Page Access Token is missing for this client');
    }
  }

  if (postData.platform === 'facebook' || postData.platform === 'both') {
    if (!client.pageId && !client.pageAccessToken) {
      errors.push('Facebook Page ID or Access Token is missing for this client');
    }
  }

  // Media validation (only for non-drafts)
  if (!isDraft) {
    if (!postData.mediaUrls || postData.mediaUrls.length === 0) {
      errors.push('At least one media file is required');
    }

    // Post type specific validations
    if (postData.postType === 'reel') {
      // Reels require video - this should be validated on frontend, but check here too
      if (postData.mediaUrls && postData.mediaUrls.length > 1) {
        errors.push('Reels can only have one video file');
      }
    }

    if (postData.postType === 'carousel') {
      if (!postData.mediaUrls || postData.mediaUrls.length < 2) {
        errors.push('Carousels require at least 2 images');
      }
      if (postData.mediaUrls && postData.mediaUrls.length > 10) {
        errors.push('Carousels can have maximum 10 images');
      }
    }

    if (postData.postType === 'story' && postData.platform === 'instagram') {
      // Instagram stories cannot be scheduled
      if (postData.scheduledTime) {
        errors.push('Instagram stories cannot be scheduled');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get client permissions for posting
 * @param {string} clientId - Client ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Permissions object
 */
export const getClientPermissions = async (clientId, userId) => {
  try {
    const client = await Client.findOne({
      _id: clientId,
      createdBy: userId
    });

    if (!client) {
      return {
        success: false,
        error: 'Client not found'
      };
    }

    const permissions = {
      success: true,
      data: {
        canAccessInstagram: !!(client.igUserId && client.pageAccessToken),
        canAccessFacebook: !!(client.pageId || client.pageAccessToken),
        hasInstagramToken: !!client.pageAccessToken,
        hasInstagramUserId: !!client.igUserId,
        hasFacebookPageId: !!client.pageId,
        hasFacebookToken: !!client.pageAccessToken,
        errors: [],
        recommendations: []
      }
    };

    // Add warnings
    if (!client.igUserId) {
      permissions.data.errors.push({
        type: 'missing_field',
        field: 'igUserId',
        message: 'Instagram User ID is missing'
      });
      permissions.data.recommendations.push('Connect Instagram account to enable Instagram posting');
    }

    if (!client.pageAccessToken) {
      permissions.data.errors.push({
        type: 'missing_field',
        field: 'pageAccessToken',
        message: 'Page Access Token is missing'
      });
      permissions.data.recommendations.push('Re-authenticate Instagram account to get access token');
    }

    if (!client.pageId && !client.pageAccessToken) {
      permissions.data.errors.push({
        type: 'missing_field',
        field: 'pageId',
        message: 'Facebook Page ID or Access Token is missing'
      });
      permissions.data.recommendations.push('Connect Facebook page to enable Facebook posting');
    }

    return permissions;
  } catch (error) {
    console.error('Error fetching client permissions:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch client permissions'
    };
  }
};

/**
 * Create a new post (draft or published)
 * @param {Object} postData - Post data
 * @param {string} userId - User ID
 * @param {boolean} isDraft - Whether this is a draft
 * @returns {Promise<Object>} - Result object
 */
export const createPost = async (postData, userId, isDraft = false) => {
  try {
    // Find client
    const client = await Client.findOne({
      _id: postData.client,
      createdBy: userId
    });

    if (!client) {
      return {
        success: false,
        error: 'Client not found'
      };
    }

    // Validate post data
    const validation = validatePostData(postData, client, isDraft);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        errors: validation.errors
      };
    }

    // Create post
    const post = new Post({
      ...postData,
      client: client._id,
      createdBy: userId,
      status: isDraft ? 'draft' : (postData.publishImmediately ? 'pending' : 'scheduled')
    });

    await post.save();

    // If not draft and publish immediately, publish it
    if (!isDraft && postData.publishImmediately) {
      try {
        const publishPromise = publishPost(post.toObject(), client.toObject());
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Publishing timeout')), 10 * 60 * 1000)
        );

        const publishResults = await Promise.race([publishPromise, timeoutPromise]);

        // Update post with results
        if (publishResults.instagram) {
          post.instagramPostId = publishResults.instagram.postId;
          post.instagramPostUrl = publishResults.instagram.url;
        }
        if (publishResults.facebook) {
          post.facebookPostId = publishResults.facebook.postId;
          post.facebookPostUrl = publishResults.facebook.url;
        }

        if (publishResults.errors && publishResults.errors.length > 0) {
          const allFailed = (postData.platform === 'instagram' && !publishResults.instagram) ||
                           (postData.platform === 'facebook' && !publishResults.facebook) ||
                           (postData.platform === 'both' && !publishResults.instagram && !publishResults.facebook);

          post.status = allFailed ? 'failed' : 'published';
          post.publishingErrors = publishResults.errors.map(e => e.error);
        } else {
          post.status = 'published';
        }

        post.publishedTime = new Date();
        await post.save();
      } catch (publishError) {
        console.error('Error publishing post:', publishError);
        post.status = 'failed';
        post.publishingErrors = [publishError.message];
        await post.save();
      }
    }

    const postObj = post.toObject();
    delete postObj.createdBy;

    return {
      success: true,
      data: postObj
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      error: error.message || 'Failed to create post'
    };
  }
};

/**
 * Update an existing post
 * @param {string} postId - Post ID
 * @param {Object} updateData - Update data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result object
 */
export const updatePost = async (postId, updateData, userId) => {
  try {
    const post = await Post.findOne({
      _id: postId,
      createdBy: userId
    });

    if (!post) {
      return {
        success: false,
        error: 'Post not found'
      };
    }

    // Don't allow editing published posts (except metadata)
    if (post.status === 'published') {
      // Only allow updating certain fields for published posts
      const allowedFields = ['tags', 'location'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        return {
          success: false,
          error: 'Published posts can only have metadata updated'
        };
      }

      Object.assign(post, filteredData);
    } else {
      // For drafts and scheduled posts, allow full editing
      Object.assign(post, updateData);
    }

    await post.save();

    const postObj = post.toObject();
    delete postObj.createdBy;

    return {
      success: true,
      data: postObj
    };
  } catch (error) {
    console.error('Error updating post:', error);
    return {
      success: false,
      error: error.message || 'Failed to update post'
    };
  }
};
