/**
 * Service for posting to Instagram and Facebook
 */

/**
 * Post a photo to Instagram using Instagram Business API
 * @param {string} imageUrl - URL of the image to post
 * @param {string} caption - Caption for the post
 * @param {Object} client - Client object with Instagram credentials
 * @returns {Promise<Object>} - Post ID and status
 */
export async function postToInstagram(imageUrl, caption, client) {
  try {
    console.log('📸 Posting to Instagram...');
    console.log('  Image URL:', imageUrl);
    console.log('  Caption:', caption ? caption.substring(0, 50) + '...' : 'No caption');
    console.log('  IG User ID:', client.igUserId);
    console.log('  Page Access Token:', client.pageAccessToken ? 'Yes' : 'No');

    if (!client.igUserId || !client.pageAccessToken) {
      throw new Error('Instagram credentials not found. Client must be connected via OAuth.');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    // Step 1: Upload photo to Instagram (Container Creation)
    console.log('  Step 1: Creating Instagram media container...');
    const containerUrl = `https://graph.facebook.com/v18.0/${client.igUserId}/media`;
    
    const containerParams = new URLSearchParams();
    containerParams.append('image_url', imageUrl);
    containerParams.append('caption', caption || '');
    containerParams.append('access_token', client.pageAccessToken);

    const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!containerResponse.ok) {
      const errorData = await containerResponse.text();
      console.error('  ❌ Failed to create Instagram container:', errorData);
      throw new Error(`Instagram container creation failed: ${errorData}`);
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      throw new Error('No creation ID returned from Instagram');
    }

    console.log('  ✅ Container created:', creationId);

    // Step 2: Publish the container
    console.log('  Step 2: Publishing Instagram post...');
    const publishUrl = `https://graph.facebook.com/v18.0/${client.igUserId}/media_publish`;
    
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', client.pageAccessToken);

    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error('  ❌ Failed to publish Instagram post:', errorData);
      throw new Error(`Instagram publishing failed: ${errorData}`);
    }

    const publishData = await publishResponse.json();
    const postId = publishData.id;

    console.log('  ✅ Instagram post published!');
    console.log('  Post ID:', postId);

    return {
      success: true,
      postId,
      platform: 'instagram',
      url: `https://instagram.com/p/${postId}`
    };
  } catch (error) {
    console.error('❌ Error posting to Instagram:', error.message);
    throw error;
  }
}

/**
 * Post a photo to Facebook
 * @param {string} imageUrl - URL of the image to post
 * @param {string} message - Message/caption for the post
 * @param {Object} client - Client object with Facebook credentials
 * @returns {Promise<Object>} - Post ID and status
 */
export async function postToFacebook(imageUrl, message, client) {
  try {
    console.log('📘 Posting to Facebook...');
    console.log('  Image URL:', imageUrl);
    console.log('  Message:', message ? message.substring(0, 50) + '...' : 'No message');
    console.log('  Page ID:', client.pageId || client.socialMediaId);
    console.log('  Access Token:', client.pageAccessToken || client.accessToken ? 'Yes' : 'No');

    if (!client.pageId && !client.socialMediaId) {
      throw new Error('Facebook Page ID or User ID not found. Client must be connected via OAuth.');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const pageId = client.pageId || client.socialMediaId;
    const accessToken = client.pageAccessToken || client.accessToken;

    if (!accessToken) {
      throw new Error('Facebook access token not found');
    }

    // Post photo to Facebook Page
    const postUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`;
    
    const postParams = new URLSearchParams();
    postParams.append('url', imageUrl);
    if (message) {
      postParams.append('message', message);
    }
    postParams.append('access_token', accessToken);

    const postResponse = await fetch(`${postUrl}?${postParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      console.error('  ❌ Failed to post to Facebook:', errorData);
      throw new Error(`Facebook posting failed: ${errorData}`);
    }

    const postData = await postResponse.json();
    const postId = postData.post_id || postData.id;

    console.log('  ✅ Facebook post published!');
    console.log('  Post ID:', postId);

    return {
      success: true,
      postId,
      platform: 'facebook',
      url: `https://facebook.com/${postId}`
    };
  } catch (error) {
    console.error('❌ Error posting to Facebook:', error.message);
    throw error;
  }
}

/**
 * Publish a post to the specified platform(s)
 * @param {Object} post - Post document from database
 * @param {Object} client - Client document with credentials
 * @returns {Promise<Object>} - Publishing results
 */
export async function publishPost(post, client) {
  const results = {
    instagram: null,
    facebook: null,
    errors: []
  };

  try {
    // Prepare caption/message
    let caption = post.caption || post.content || '';
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagsStr = post.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      caption = `${caption}\n\n${hashtagsStr}`;
    }

    // Get first media URL (for now, single image support)
    const imageUrl = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : null;

    if (!imageUrl) {
      throw new Error('No image URL found in post');
    }

    // Post to Instagram if platform includes instagram
    if (post.platform === 'instagram' || post.platform === 'both') {
      if (client.platform === 'instagram' || client.platform === 'manual') {
        try {
          results.instagram = await postToInstagram(imageUrl, caption, client);
          console.log('✅ Instagram post successful');
        } catch (error) {
          console.error('❌ Instagram post failed:', error.message);
          results.errors.push({ platform: 'instagram', error: error.message });
        }
      }
    }

    // Post to Facebook if platform includes facebook
    if (post.platform === 'facebook' || post.platform === 'both') {
      if (client.platform === 'facebook' || client.platform === 'manual') {
        try {
          results.facebook = await postToFacebook(imageUrl, caption, client);
          console.log('✅ Facebook post successful');
        } catch (error) {
          console.error('❌ Facebook post failed:', error.message);
          results.errors.push({ platform: 'facebook', error: error.message });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error publishing post:', error.message);
    throw error;
  }
}

