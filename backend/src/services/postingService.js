/**
 * Service for posting to Instagram and Facebook
 */

/**
 * Convert image URL to a publicly accessible format
 * Handles ngrok and local server URLs by converting them to use the proxy route
 * @param {string} imageUrl - Original image URL
 * @returns {string} - Publicly accessible image URL
 */
function getPublicImageUrl(imageUrl) {
  if (!imageUrl) return imageUrl;
  
  try {
    const url = new URL(imageUrl);
    
    // Extract filename from URL path
    let filename = null;
    
    // Check if this is a URL pointing to our uploads directory
    if (url.pathname.startsWith('/uploads/')) {
      filename = url.pathname.split('/uploads/')[1];
    } else if (url.pathname.includes('/uploads/')) {
      // Handle cases where path might have additional segments
      const parts = url.pathname.split('/uploads/');
      if (parts.length > 1) {
        filename = parts[1].split('/').pop(); // Get last segment
      }
    } else if (url.pathname.startsWith('/api/images/')) {
      // Already using the proxy route, just ensure HTTPS
      filename = url.pathname.split('/api/images/')[1];
    }
    
    if (filename) {
      // Get the base URL - prefer API_URL env variable, fallback to origin
      // For ngrok, we want to use the same domain
      // IMPORTANT: Instagram requires HTTPS for media URLs
      let baseUrl = process.env.API_URL || url.origin;
      
      // Ensure baseUrl doesn't end with a slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      // Force HTTPS if we're using ngrok or a public domain
      // Instagram REQUIRES HTTPS for all media URLs (especially reels and stories)
      if (!baseUrl.startsWith('https://') && !baseUrl.startsWith('http://localhost')) {
        // If not localhost and not HTTPS, try to use HTTPS
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      
      // If using localhost without HTTPS, warn
      if (baseUrl.includes('localhost') && !baseUrl.startsWith('https://')) {
        console.warn('  ⚠️ WARNING: Instagram requires HTTPS for media URLs.');
        console.warn('    Localhost URLs may not work for reels and stories.');
        console.warn('    Please use ngrok or a public HTTPS URL.');
      }
      
      // Construct public URL using the proxy route
      // This route serves both images and videos with proper headers
      const publicUrl = `${baseUrl}/api/images/${filename}`;
      
      console.log('  🔄 Converting media URL for Instagram:');
      console.log('    Original:', imageUrl);
      console.log('    Filename:', filename);
      console.log('    Base URL:', baseUrl);
      console.log('    Public URL:', publicUrl);
      console.log('    Protocol:', new URL(publicUrl).protocol);
      
      // Verify the URL is accessible (basic check)
      if (!publicUrl.startsWith('https://') && !publicUrl.startsWith('http://localhost')) {
        console.warn('  ⚠️ WARNING: URL does not use HTTPS. Instagram may reject this.');
      }
      
      return publicUrl;
    }
  } catch (error) {
    // If URL parsing fails, return original
    console.warn('  ⚠️ Could not parse media URL, using original:', error.message);
  }
  
  // Return original URL if we couldn't convert it
  console.log('  ℹ️ Using original media URL (not converted)');
  
  // Still check if original URL uses HTTPS
  if (imageUrl && !imageUrl.startsWith('https://') && !imageUrl.startsWith('http://localhost')) {
    console.warn('  ⚠️ WARNING: Original URL does not use HTTPS. Instagram may reject this for reels/stories.');
  }
  
  return imageUrl;
}

/**
 * Post a photo/video to Instagram using Instagram Business API
 * Supports regular posts, stories, and reels
 * @param {string} mediaUrl - URL of the image/video to post
 * @param {string} caption - Caption for the post
 * @param {Object} client - Client object with Instagram credentials
 * @param {string} postType - Type of post: 'post', 'story', or 'reel'
 * @returns {Promise<Object>} - Post ID and status
 */
export async function postToInstagram(mediaUrl, caption, client, postType = 'post') {
  try {
    console.log(`📸 Posting ${postType} to Instagram...`);
    console.log('  Original Media URL:', mediaUrl);
    
    // Convert to publicly accessible URL if needed
    const publicMediaUrl = getPublicImageUrl(mediaUrl);
    console.log('  Using Media URL:', publicMediaUrl);
    console.log('  Caption:', caption ? caption.substring(0, 50) + '...' : 'No caption');
    console.log('  Post Type:', postType);
    console.log('  IG User ID:', client.igUserId);
    console.log('  Page Access Token:', client.pageAccessToken ? 'Yes' : 'No');

    if (!client.igUserId || !client.pageAccessToken) {
      throw new Error('Instagram credentials not found. Client must be connected via OAuth.');
    }

    if (!publicMediaUrl) {
      throw new Error('Media URL is required');
    }

    // Determine if media is image or video based on URL extension
    // Reels must be videos, stories can be images or videos, posts can be either
    const isVideo = /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(publicMediaUrl) || 
                    publicMediaUrl.includes('/video');
    
    // Reels must be videos
    if (postType === 'reel' && !isVideo) {
      throw new Error('Reels must be video files. Please upload a video file for reels.');
    }

    // Verify the media URL is accessible before sending to Instagram
    // This helps catch issues early and ensures Instagram can fetch the file
    try {
      console.log('  Verifying media URL is accessible...');
      
      // Try HEAD first, fallback to GET if HEAD is not supported
      let verifyResponse;
      try {
        verifyResponse = await fetch(publicMediaUrl, { 
          method: 'HEAD', 
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InstagramBot/1.0)'
          }
        });
      } catch (headError) {
        // If HEAD fails, try GET with range request (just first few bytes)
        console.log('  HEAD request failed, trying GET with range...');
        verifyResponse = await fetch(publicMediaUrl, {
          method: 'GET',
          headers: {
            'Range': 'bytes=0-1023', // Just get first 1KB
            'User-Agent': 'Mozilla/5.0 (compatible; InstagramBot/1.0)'
          },
          redirect: 'follow'
        });
      }
      
      if (!verifyResponse.ok && verifyResponse.status !== 206 && verifyResponse.status !== 405) {
        // 206 is Partial Content (OK for range requests), 405 is Method Not Allowed (OK)
        console.warn(`  ⚠️ Warning: Media URL returned status ${verifyResponse.status}.`);
        console.warn(`  Instagram may not be able to access this file.`);
        
        // Check if it's a ngrok browser warning
        if (verifyResponse.status === 403 || verifyResponse.status === 401) {
          console.error(`  ❌ ERROR: The media URL appears to be blocked (possibly by ngrok browser warning).`);
          console.error(`  Instagram requires direct access to media files without authentication or browser warnings.`);
          throw new Error('Media URL is not publicly accessible. If using ngrok, ensure browser warnings are disabled or use a direct public URL.');
        }
      } else {
        console.log('  ✅ Media URL is accessible');
        const contentType = verifyResponse.headers.get('content-type');
        if (contentType) {
          console.log(`  Content-Type: ${contentType}`);
          // Verify content type matches file type
          if (isVideo && !contentType.startsWith('video/')) {
            console.warn(`  ⚠️ Warning: File extension suggests video but Content-Type is ${contentType}`);
          } else if (!isVideo && !contentType.startsWith('image/')) {
            console.warn(`  ⚠️ Warning: File extension suggests image but Content-Type is ${contentType}`);
            console.warn(`  This might cause Instagram to reject the file.`);
          }
        }
        
        // Check Content-Length for images (Instagram has size limits)
        const contentLength = verifyResponse.headers.get('content-length');
        if (contentLength) {
          const sizeInMB = parseInt(contentLength) / (1024 * 1024);
          console.log(`  File size: ${sizeInMB.toFixed(2)}MB`);
          if (!isVideo && sizeInMB > 8) {
            console.warn(`  ⚠️ Warning: Image is larger than 8MB. Instagram recommends images under 8MB.`);
          }
        }
      }
    } catch (verifyError) {
      // If it's our custom error, throw it
      if (verifyError.message.includes('not publicly accessible')) {
        throw verifyError;
      }
      console.warn(`  ⚠️ Warning: Could not verify media URL accessibility: ${verifyError.message}`);
      console.warn(`  This might cause issues if Instagram cannot access the file.`);
      // Don't throw for network errors, as the URL might still work for Instagram
    }

    // Step 1: Create Instagram media container
    console.log(`  Step 1: Creating Instagram ${postType} container...`);
    const containerUrl = `https://graph.facebook.com/v18.0/${client.igUserId}/media`;
    
    const containerParams = new URLSearchParams();
    
    // Set media type and URL based on post type
    // Note: Instagram requires publicly accessible URLs that can be fetched by their servers
    if (postType === 'story') {
      // Stories can be images or videos
      // Stories have specific requirements: max 15 seconds for video, 9:16 aspect ratio
      if (isVideo) {
        containerParams.append('media_type', 'STORIES');
        containerParams.append('video_url', publicMediaUrl);
        // Stories don't support captions in the container creation
      } else {
        containerParams.append('media_type', 'STORIES');
        containerParams.append('image_url', publicMediaUrl);
      }
    } else if (postType === 'reel') {
      // Reels must be videos (max 90 seconds, 9:16 aspect ratio recommended)
      containerParams.append('media_type', 'REELS');
      containerParams.append('video_url', publicMediaUrl);
      if (caption) {
        containerParams.append('caption', caption);
      }
      // Reels can have a cover image (optional but recommended)
      // We'll skip cover_url for now as it requires an additional image
    } else {
      // Regular post
      if (isVideo) {
        containerParams.append('media_type', 'VIDEO');
        containerParams.append('video_url', publicMediaUrl);
        if (caption) {
          containerParams.append('caption', caption);
        }
      } else {
        containerParams.append('image_url', publicMediaUrl);
        if (caption) {
          containerParams.append('caption', caption);
        }
      }
    }
    
    containerParams.append('access_token', client.pageAccessToken);

    // Log the request details for debugging
    console.log('  Container URL:', containerUrl);
    console.log('  Container Params:', Object.fromEntries(containerParams.entries()));
    
    const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!containerResponse.ok) {
      const errorData = await containerResponse.text();
      console.error('  ❌ Failed to create Instagram container:', errorData);
      
      // Parse error to provide better message
      let errorMessage = `Instagram container creation failed: ${errorData}`;
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.error) {
          const error = errorJson.error;
          
          // Check for specific error codes
          if (error.code === 9004 || error.error_subcode === 2207052) {
            errorMessage = `Instagram cannot fetch the media from the provided URL. `;
            errorMessage += `This often happens when the media URL is not publicly accessible. `;
            errorMessage += `Solutions: 1) Ensure the media URL is accessible without authentication, `;
            errorMessage += `2) Check that the URL is publicly accessible (not behind a firewall), `;
            errorMessage += `3) Verify the media file exists and is accessible. `;
            errorMessage += `Original error: ${error.message || errorData}`;
          } else if (error.code === 36003 || error.error_subcode === 2207009 || (error.message && error.message.includes('aspect ratio')) || (error.message && error.message.toLowerCase().includes('aspect ratio')) || (error.error_user_msg && error.error_user_msg.toLowerCase().includes('aspect ratio'))) {
            // Aspect ratio error - create a custom error that includes aspect ratio flag
            errorMessage = `Instagram rejected the image due to invalid aspect ratio. `;
            errorMessage += `\n\nInstagram requirements for ${postType === 'story' ? 'stories' : postType === 'reel' ? 'reels' : 'posts'}: `;
            if (postType === 'story') {
              errorMessage += `\n- Stories: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
            } else if (postType === 'reel') {
              errorMessage += `\n- Reels: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
            } else {
              errorMessage += `\n- Regular Posts: Aspect ratio must be between 0.8 and 1.91 `;
              errorMessage += `\n  (Examples: 4:5 portrait, 1:1 square, 1.91:1 landscape)`;
              errorMessage += `\n  Minimum dimensions: 600x315px for landscape, 600x750px for portrait`;
            }
            errorMessage += `\n\nPlease use an image editor to crop/resize your image to meet these requirements.`;
            errorMessage += `\n\nMedia URL used: ${publicMediaUrl}`;
            errorMessage += `\nOriginal error: ${error.error_user_msg || error.message || 'The submitted image with aspect ratio () cannot be published. Please submit an image with a valid aspect ratio.'}`;
            
            // Create a custom error with aspect ratio flag
            const aspectRatioError = new Error(errorMessage);
            aspectRatioError.isAspectRatioError = true;
            aspectRatioError.mediaUrl = publicMediaUrl;
            aspectRatioError.postType = postType;
            throw aspectRatioError;
          } else if (error.message && error.message.includes('No media') || error.message && error.message.includes('reel')) {
            errorMessage = `Instagram cannot access the media file. `;
            errorMessage += `This usually means the video/image URL is not publicly accessible or Instagram cannot fetch it. `;
            errorMessage += `Please ensure: 1) The media URL is publicly accessible, `;
            errorMessage += `2) The URL uses HTTPS (required for Instagram), `;
            errorMessage += `3) The media file is not too large (max 100MB for videos). `;
            errorMessage += `Media URL used: ${publicMediaUrl} `;
            errorMessage += `Original error: ${error.message}`;
          } else {
            errorMessage = error.error_user_msg || error.message || error.user_msg || errorMessage;
          }
        }
      } catch (parseError) {
        // If parsing fails, check if error message contains key phrases
        if (errorData.toLowerCase().includes('aspect ratio') || errorData.toLowerCase().includes('cannot be published')) {
          // Aspect ratio error detected in raw error text
          errorMessage = `Instagram rejected the image due to invalid aspect ratio. `;
          errorMessage += `\n\nInstagram requirements for ${postType === 'story' ? 'stories' : postType === 'reel' ? 'reels' : 'posts'}: `;
          if (postType === 'story') {
            errorMessage += `\n- Stories: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
          } else if (postType === 'reel') {
            errorMessage += `\n- Reels: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
          } else {
            errorMessage += `\n- Regular Posts: Aspect ratio must be between 0.8 and 1.91 `;
            errorMessage += `\n  (Examples: 4:5 portrait, 1:1 square, 1.91:1 landscape)`;
            errorMessage += `\n  Minimum dimensions: 600x315px for landscape, 600x750px for portrait`;
          }
          errorMessage += `\n\nPlease use an image editor to crop/resize your image to meet these requirements.`;
          errorMessage += `\n\nMedia URL used: ${publicMediaUrl}`;
          errorMessage += `\nOriginal error: ${errorData}`;
          
          // Create a custom error with aspect ratio flag
          const aspectRatioError = new Error(errorMessage);
          aspectRatioError.isAspectRatioError = true;
          aspectRatioError.mediaUrl = publicMediaUrl;
          aspectRatioError.postType = postType;
          throw aspectRatioError;
        } else if (errorData.includes('No media') || errorData.includes('reel')) {
          errorMessage = `Instagram cannot access the media file. `;
          errorMessage += `Please ensure the media URL is publicly accessible and uses HTTPS. `;
          errorMessage += `Media URL: ${publicMediaUrl}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      throw new Error('No creation ID returned from Instagram');
    }

    console.log('  ✅ Container created:', creationId);

    // For videos (including reels and video posts), we need to check status before publishing
    // Stories (both images and videos) also need status checking - Instagram processes them
    // Regular image posts typically don't need status checking, but stories do
    const needsStatusCheck = isVideo || postType === 'story';
    
    if (needsStatusCheck) {
      // Wait for media to finish processing
      const mediaType = isVideo ? 'video' : 'image';
      console.log(`  Step 2: Waiting for ${mediaType} processing...`);
      let status = 'IN_PROGRESS';
      let statusCode = null;
      let statusMessage = null;
      let attempts = 0;
      // For stories, use shorter wait times (stories process faster)
      // For videos, use longer wait times
      const waitTime = postType === 'story' ? 5000 : 10000; // 5 seconds for stories, 10 for videos
      const maxAttempts = postType === 'story' ? 24 : 60; // 2 minutes for stories, 10 minutes for videos
      
      while (attempts < maxAttempts) {
        // Wait before checking
        // For stories, add a small initial delay to give Instagram time to process
        if (attempts === 0 && postType === 'story') {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second initial delay for stories
        } else if (attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const statusUrl = `https://graph.facebook.com/v18.0/${creationId}?fields=status_code,status&access_token=${client.pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.status || statusData.status_code || status;
          statusCode = statusData.status_code || statusCode;
          statusMessage = statusData.status || statusMessage;
          
          // Check for error status
          if (statusCode === 'ERROR' || (status && status.toUpperCase().includes('ERROR'))) {
            const errorMessage = statusData.error_message || statusMessage || 'Unknown error during video processing';
            throw new Error(`Video processing failed: ${errorMessage}`);
          }
          
          // Check if processing is complete
          // Instagram returns different formats: 'FINISHED', 'FINISHED', or status_code: 'FINISHED'
          const isFinished = statusCode === 'FINISHED' || 
                            (status && status.toUpperCase().includes('FINISHED')) ||
                            (statusMessage && statusMessage.toUpperCase().includes('FINISHED'));
          
          if (isFinished) {
            console.log(`  ✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} processing completed (attempt ${attempts + 1})`);
            break;
          }
          
          // Check if still in progress
          const isInProgress = statusCode === 'IN_PROGRESS' || 
                              (status && status.toUpperCase().includes('IN_PROGRESS')) ||
                              (statusMessage && statusMessage.toUpperCase().includes('IN_PROGRESS')) ||
                              (statusMessage && statusMessage.toUpperCase().includes('PROCESSING'));
          
          if (!isInProgress && !isFinished) {
            // Unknown status, log it but continue
            console.warn(`  ⚠️ Unknown status: ${status} / ${statusCode} / ${statusMessage}`);
          }
          
          console.log(`  ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} status: ${statusMessage || status} (${statusCode || 'N/A'}) - attempt ${attempts + 1}/${maxAttempts}`);
        } else {
          const errorText = await statusResponse.text();
          console.warn(`  Warning: Could not check video status (attempt ${attempts + 1}): ${statusResponse.status} - ${errorText}`);
          
          // If we get a 404 or other error, the container might not exist
          if (statusResponse.status === 404) {
            throw new Error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} container not found. The creation ID may be invalid.`);
          }
        }
        
        attempts++;
      }
      
      // Final check - if we exited the loop, verify we're finished
      if (attempts >= maxAttempts) {
        // Get final status one more time
        try {
          const finalStatusUrl = `https://graph.facebook.com/v18.0/${creationId}?fields=status_code,status&access_token=${client.pageAccessToken}`;
          const finalStatusResponse = await fetch(finalStatusUrl);
          if (finalStatusResponse.ok) {
            const finalStatusData = await finalStatusResponse.json();
            const finalStatus = finalStatusData.status_code || finalStatusData.status;
            const finalMessage = finalStatusData.status || finalStatus;
            
            if (finalStatus === 'FINISHED' || (finalMessage && finalMessage.toUpperCase().includes('FINISHED'))) {
              console.log(`  ✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} processing completed (final check)`);
            } else {
              throw new Error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} processing timed out after ${maxAttempts} attempts. Final status: ${finalMessage || finalStatus || 'UNKNOWN'}`);
            }
          } else {
            throw new Error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} processing timed out after ${maxAttempts} attempts. Could not verify final status.`);
          }
        } catch (finalError) {
          throw new Error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} processing timed out after ${maxAttempts} attempts. ${finalError.message}`);
        }
      }
    }

    // Step 2 (or 3 for videos/stories): Publish the container
    const stepNumber = needsStatusCheck ? '3' : '2';
    console.log(`  Step ${stepNumber}: Publishing Instagram ${postType}...`);
    
    // All post types (posts, stories, reels) use the media_publish endpoint
    const publishUrl = `https://graph.facebook.com/v18.0/${client.igUserId}/media_publish`;
    
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', client.pageAccessToken);
    
    console.log('  Publish URL:', publishUrl);
    console.log('  Creation ID:', creationId);

    // Retry logic for publishing (in case media is still processing)
    let publishResponse;
    let publishData = null;
    let publishAttempts = 0;
    const maxPublishAttempts = 5;
    const publishWaitTime = 3000; // 3 seconds between retries
    
    while (publishAttempts < maxPublishAttempts) {
      if (publishAttempts > 0) {
        console.log(`  Retrying publish (attempt ${publishAttempts + 1}/${maxPublishAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, publishWaitTime));
      }
      
      publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (publishResponse.ok) {
        // Success - parse the response
        publishData = await publishResponse.json();
        break; // Success, exit retry loop
      }
      
      // Check if it's the "media not ready" error
      const errorText = await publishResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = null;
      }
      
      const isMediaNotReady = errorJson?.error?.code === 9007 || 
                             errorJson?.error?.error_subcode === 2207027 ||
                             (errorJson?.error?.message && errorJson.error.message.includes('Media ID is not available')) ||
                             (errorJson?.error?.error_user_msg && errorJson.error.error_user_msg.includes('not ready to be published'));
      
      if (isMediaNotReady && publishAttempts < maxPublishAttempts - 1) {
        console.log(`  ⏳ Media not ready yet, waiting before retry...`);
        publishAttempts++;
        continue; // Retry
      } else {
        // Either not a "not ready" error, or we've exhausted retries
        console.error(`  ❌ Failed to publish Instagram ${postType}:`, errorText);
        
        // Check if it's an aspect ratio error in the publish response
        const errorTextLower = errorText.toLowerCase();
        const errorMessage = errorJson?.error?.message?.toLowerCase() || '';
        const errorUserMsg = errorJson?.error?.error_user_msg?.toLowerCase() || '';
        if (errorTextLower.includes('aspect ratio') || 
            errorTextLower.includes('cannot be published') || 
            errorMessage.includes('aspect ratio') ||
            errorUserMsg.includes('aspect ratio') ||
            errorUserMsg.includes('cannot be published') ||
            errorMessage.includes('cannot be published')) {
          // Aspect ratio error detected in publish response
          let aspectRatioErrorMessage = `Instagram rejected the image due to invalid aspect ratio. `;
          aspectRatioErrorMessage += `\n\nInstagram requirements for ${postType === 'story' ? 'stories' : postType === 'reel' ? 'reels' : 'posts'}: `;
          if (postType === 'story') {
            aspectRatioErrorMessage += `\n- Stories: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
          } else if (postType === 'reel') {
            aspectRatioErrorMessage += `\n- Reels: Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)`;
          } else {
            aspectRatioErrorMessage += `\n- Regular Posts: Aspect ratio must be between 0.8 and 1.91 `;
            aspectRatioErrorMessage += `\n  (Examples: 4:5 portrait, 1:1 square, 1.91:1 landscape)`;
            aspectRatioErrorMessage += `\n  Minimum dimensions: 600x315px for landscape, 600x750px for portrait`;
          }
          aspectRatioErrorMessage += `\n\nPlease use an image editor to crop/resize your image to meet these requirements.`;
          aspectRatioErrorMessage += `\n\nMedia URL used: ${publicMediaUrl}`;
          aspectRatioErrorMessage += `\nOriginal error: ${errorJson?.error?.error_user_msg || errorJson?.error?.message || errorText}`;
          
          // Create a custom error with aspect ratio flag
          const aspectRatioError = new Error(aspectRatioErrorMessage);
          aspectRatioError.isAspectRatioError = true;
          aspectRatioError.mediaUrl = publicMediaUrl;
          aspectRatioError.postType = postType;
          throw aspectRatioError;
        }
        
        throw new Error(`Instagram ${postType} publishing failed: ${errorText}`);
      }
    }

    // Verify we have publish data
    if (!publishData) {
      throw new Error(`Failed to publish after ${maxPublishAttempts} attempts`);
    }
    const postId = publishData.id;

    console.log(`  ✅ Instagram ${postType} published!`);
    console.log('  Post ID:', postId);

    // Generate appropriate URL based on post type
    let url;
    if (postType === 'story') {
      url = `https://instagram.com/stories/${client.igUserId}/${postId}`;
    } else if (postType === 'reel') {
      url = `https://instagram.com/reel/${postId}`;
    } else {
      url = `https://instagram.com/p/${postId}`;
    }

    return {
      success: true,
      postId,
      platform: 'instagram',
      postType: postType,
      url: url
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
    console.log('  Original Image URL:', imageUrl);
    
    // Convert to publicly accessible URL if needed
    const publicImageUrl = getPublicImageUrl(imageUrl);
    console.log('  Using Image URL:', publicImageUrl);
    console.log('  Message:', message ? message.substring(0, 50) + '...' : 'No message');
    console.log('  Page ID:', client.pageId || client.socialMediaId);
    console.log('  Access Token:', client.pageAccessToken || client.accessToken ? 'Yes' : 'No');

    if (!client.pageId && !client.socialMediaId) {
      throw new Error('Facebook Page ID or User ID not found. Client must be connected via OAuth.');
    }

    if (!publicImageUrl) {
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
    postParams.append('url', publicImageUrl);
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
          // Get post type from post object (default to 'post')
          const postType = post.postType || 'post';
          results.instagram = await postToInstagram(imageUrl, caption, client, postType);
          console.log(`✅ Instagram ${postType} successful`);
        } catch (error) {
          console.error('❌ Instagram post failed:', error.message);
          // Check if it's an aspect ratio error
          const errorObj = { 
            platform: 'instagram', 
            error: error.message,
            isAspectRatioError: error.isAspectRatioError || false,
            mediaUrl: error.mediaUrl || imageUrl,
            postType: error.postType || postType
          };
          results.errors.push(errorObj);
        }
      } else {
        // Client platform doesn't support Instagram posting
        const errorMsg = `Client platform (${client.platform || 'unknown'}) does not support Instagram posting. Please connect an Instagram account.`;
        console.error('❌ Instagram post skipped:', errorMsg);
        results.errors.push({ platform: 'instagram', error: errorMsg });
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
      } else {
        // Client platform doesn't support Facebook posting
        const errorMsg = `Client platform (${client.platform || 'unknown'}) does not support Facebook posting. Please connect a Facebook account.`;
        console.error('❌ Facebook post skipped:', errorMsg);
        results.errors.push({ platform: 'facebook', error: errorMsg });
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error publishing post:', error.message);
    throw error;
  }
}

