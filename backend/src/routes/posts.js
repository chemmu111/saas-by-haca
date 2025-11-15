import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { processScheduledPosts } from '../services/postScheduler.js';
import { sendInstagramAspectRatioErrorEmail } from '../services/emailService.js';
import { getClientPermissions, createPost, updatePost, validatePostData } from '../controllers/postsController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Preserve original filename extension
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Define allowed file types
const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
const allowedVideoTypes = /mp4|mov|avi|mkv|webm|m4v/;
const allowedAudioTypes = /mp3|wav|ogg|m4a|aac|flac/;
const allowedMimeTypes = {
  // Images
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  // Videos
  'video/mp4': true,
  'video/quicktime': true,
  'video/x-msvideo': true,
  'video/x-matroska': true,
  'video/webm': true,
  'video/x-m4v': true,
  // Audio
  'audio/mpeg': true,
  'audio/mp3': true,
  'audio/wav': true,
  'audio/ogg': true,
  'audio/m4a': true,
  'audio/aac': true,
  'audio/flac': true,
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (for videos)
    // Add timeout for large file uploads (10 minutes)
    timeout: 10 * 60 * 1000
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const isImage = allowedImageTypes.test(ext);
    const isVideo = allowedVideoTypes.test(ext);
    const isAudio = allowedAudioTypes.test(ext);
    const isValidMimeType = allowedMimeTypes[file.mimetype];
    
    if ((isImage || isVideo || isAudio) && isValidMimeType) {
      return cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Supported: Images (jpeg, jpg, png, gif, webp), Videos (mp4, mov, avi, mkv, webm, m4v), and Audio (mp3, wav, ogg, m4a, aac, flac)`));
    }
  }
});

// All routes require authentication
router.use(requireAuth);

// POST /api/posts/upload - Upload an image or video file
// Accept files from 'image', 'video', or 'media' field names
router.post('/upload', (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 100MB. File size should be between 1MB and 100MB.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
      } else {
        // Handle file filter errors and other errors
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }
    }
    next();
  });
}, async (req, res) => {
  try {
    // Check if file was uploaded (could be from 'image', 'video', or 'media' field)
    // With upload.any(), files are in req.files array
    const file = req.files && req.files.length > 0 ? req.files[0] : req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Please upload an image or video file.'
      });
    }

    // Determine file type
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');
    const fileType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

    // Validate file size based on file type
    const fileSizeInMB = file.size / (1024 * 1024);
    const maxSizeMB = 100; // Maximum size for all files
    
    // For video files: must be between 1MB and 100MB
    if (isVideo) {
      const minVideoSizeMB = 1;
      if (fileSizeInMB < minVideoSizeMB) {
        return res.status(400).json({
          success: false,
          error: `Video file too small. Video files must be between ${minVideoSizeMB}MB and ${maxSizeMB}MB. Current file size: ${fileSizeInMB.toFixed(2)}MB.`
        });
      }
    }
    
    // Maximum size check for all files
    if (fileSizeInMB > maxSizeMB) {
      const fileTypeName = isVideo ? 'Video' : isImage ? 'Image' : 'File';
      return res.status(400).json({
        success: false,
        error: `${fileTypeName} file too large. Maximum size is ${maxSizeMB}MB. Current file size: ${fileSizeInMB.toFixed(2)}MB.`
      });
    }

    // Generate URL for the uploaded file
    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/${file.filename}`;

    console.log(`✅ File uploaded: ${file.originalname} (${fileType}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        type: fileType
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

// GET /api/posts - Get all posts for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { status, clientId, limit, skip } = req.query;
    
    // Build query
    const query = { createdBy: req.user.sub };
    
    if (status) {
      query.status = status;
    }
    
    if (clientId) {
      query.client = clientId;
    }

    // Parse pagination
    const limitNum = limit ? parseInt(limit) : 50;
    const skipNum = skip ? parseInt(skip) : 0;

    const posts = await Post.find(query)
      .populate('client', 'name email platform')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .select('-createdBy');

    const total = await Post.countDocuments(query);

    res.json({ 
      success: true, 
      data: posts, 
      count: posts.length,
      total,
      limit: limitNum,
      skip: skipNum
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/:id - Get a single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      createdBy: req.user.sub
    })
      .populate('client', 'name email platform')
      .select('-createdBy');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Error fetching post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// POST /api/posts - Create a new post or save as draft
router.post('/', async (req, res) => {
  let responseSent = false;

  // Helper function to send response only once
  const sendResponse = (statusCode, data) => {
    if (responseSent) return;
    responseSent = true;
    res.status(statusCode).json(data);
  };

  try {
    const { draft } = req.query;
    const isDraft = draft === 'true';

    const {
      content,
      platform,
      client,
      scheduledTime,
      mediaUrls,
      musicUrl,
      musicTitle,
      musicArtist,
      caption,
      hashtags,
      tags,
      location,
      postType,
      format,
      publishImmediately
    } = req.body;

    // Handle draft saving (simplified validation)
    if (isDraft) {
      // Validation for drafts (more lenient than published posts)
      if (!client) {
        return sendResponse(400, {
          success: false,
          error: 'Client is required for drafts'
        });
      }

      // Verify client belongs to the user
      const clientDoc = await Client.findOne({
        _id: client,
        createdBy: req.user.sub
      });

      if (!clientDoc) {
        return sendResponse(404, {
          success: false,
          error: 'Client not found'
        });
      }

      // Validate platform
      if (!platform || !['instagram', 'facebook', 'both'].includes(platform)) {
        return sendResponse(400, {
          success: false,
          error: 'Platform must be instagram, facebook, or both'
        });
      }

      // Create draft post
      const post = new Post({
        content: caption || content || '',
        platform,
        client,
        status: 'draft',
        mediaUrls: mediaUrls || [],
        musicUrl: musicUrl ? musicUrl.trim() : undefined,
        musicTitle: musicTitle ? musicTitle.trim() : undefined,
        musicArtist: musicArtist ? musicArtist.trim() : undefined,
        caption: caption ? caption.trim() : content ? content.trim() : '',
        hashtags: hashtags || [],
        tags: Array.isArray(tags) ? tags.map(tag => {
          if (typeof tag === 'string') {
            return { name: tag.trim(), color: '#8b5cf6' };
          }
          return {
            name: tag.name ? tag.name.trim() : '',
            color: tag.color || '#8b5cf6'
          };
        }).filter(tag => tag.name) : [],
        location: location ? location.trim() : '',
        postType: postType || 'post',
        format: format || 'square',
        createdBy: req.user.sub
      });

      await post.save();

      // Populate client before returning
      await post.populate('client', 'name email platform');

      // Return draft post without createdBy field
      const postData = post.toObject();
      delete postData.createdBy;

      return sendResponse(201, { success: true, data: postData, message: 'Draft saved successfully' });
    }

    // Continue with normal post creation logic

    // Validation - content or caption is required
    if ((!content || content.trim().length === 0) && (!caption || caption.trim().length === 0)) {
      return sendResponse(400, {
        success: false,
        error: 'Content or caption is required'
      });
    }
    
    // Use caption if content is not provided
    const postContent = content || caption || '';

    if (!platform || !['instagram', 'facebook', 'both'].includes(platform)) {
      return sendResponse(400, {
        success: false,
        error: 'Platform must be instagram, facebook, or both'
      });
    }

    if (!client) {
      return sendResponse(400, {
        success: false,
        error: 'Client is required'
      });
    }

    // Verify client belongs to the user
    const clientDoc = await Client.findOne({
      _id: client,
      createdBy: req.user.sub
    });

    if (!clientDoc) {
      return sendResponse(404, {
        success: false,
        error: 'Client not found'
      });
    }

    // Determine status based on scheduledTime and publishImmediately
    let status = 'draft';
    if (scheduledTime) {
      const scheduled = new Date(scheduledTime);
      if (scheduled > new Date()) {
        status = 'scheduled';
      } else {
        return sendResponse(400, {
          success: false,
          error: 'Scheduled time must be in the future'
        });
      }
    } else if (publishImmediately) {
      // If publishImmediately is true, set status to 'published' initially
      // The actual publishing will happen below
      status = 'draft'; // Set as draft first, will be published below
    }

    // Validate postType if provided
    const validPostTypes = ['post', 'story', 'reel'];
    if (postType && !validPostTypes.includes(postType)) {
      return sendResponse(400, {
        success: false,
        error: `Invalid postType. Must be one of: ${validPostTypes.join(', ')}`
      });
    }

    // Validate format if provided
    const validFormats = ['square', 'portrait', 'landscape', 'reel', 'story', 'carousel-square', 'carousel-vertical'];
    let finalFormat = format || 'square';
    
    // Auto-set format based on postType if not provided or invalid
    if (postType === 'reel') {
      finalFormat = 'reel';
    } else if (postType === 'story') {
      finalFormat = 'story';
    } else if (format && !validFormats.includes(format)) {
      return sendResponse(400, {
        success: false,
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    // Create new post
    const post = new Post({
      content: postContent.trim(),
      platform,
      client,
      status,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      mediaUrls: mediaUrls || [],
      musicUrl: musicUrl ? musicUrl.trim() : undefined,
      musicTitle: musicTitle ? musicTitle.trim() : undefined,
      musicArtist: musicArtist ? musicArtist.trim() : undefined,
      caption: caption ? caption.trim() : postContent.trim(),
      hashtags: hashtags || [],
      tags: Array.isArray(tags) ? tags.map(tag => {
        // Handle both string tags (backward compatibility) and object tags
        if (typeof tag === 'string') {
          return { name: tag.trim(), color: '#8b5cf6' };
        }
        return {
          name: tag.name ? tag.name.trim() : '',
          color: tag.color || '#8b5cf6'
        };
      }).filter(tag => tag.name) : [],
      location: location ? location.trim() : '',
      postType: postType || 'post',
      format: finalFormat,
      createdBy: req.user.sub
    });

    await post.save();

    // Populate client before returning
    await post.populate('client', 'name email platform');

    // If publishImmediately is true, publish the post now
    if (publishImmediately && !scheduledTime) {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 PUBLISH IMMEDIATELY: Post created, publishing now');
      console.log('='.repeat(60));
      console.log('  Post ID:', post._id);
      console.log('  Post Type:', post.postType || 'post');
      console.log('  Platform:', post.platform);
      console.log('  Media URLs:', post.mediaUrls);
      console.log('');
      
      try {
        const { publishPost } = await import('../services/postingService.js');
        const clientDoc = await Client.findById(client);

        if (clientDoc) {
          // Add timeout for publishing to prevent hanging (10 minutes)
          const publishPromise = publishPost(post.toObject(), clientDoc.toObject());
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Publishing timeout')), 10 * 60 * 1000)
          );

          const publishResults = await Promise.race([publishPromise, timeoutPromise]);
          
          // Update post status based on publishing results
          let finalStatus = 'published';
          const errors = [];
          
          if (publishResults.errors && publishResults.errors.length > 0) {
            // Some platforms failed
            const allFailed = (post.platform === 'instagram' && !publishResults.instagram) ||
                             (post.platform === 'facebook' && !publishResults.facebook) ||
                             (post.platform === 'both' && !publishResults.instagram && !publishResults.facebook);
            
            if (allFailed) {
              finalStatus = 'failed';
              errors.push(...publishResults.errors.map(e => e.error));
            } else {
              finalStatus = 'published'; // Partial success
            }
            
            // Check for aspect ratio errors and send email
            const aspectRatioError = publishResults.errors.find(e => e.isAspectRatioError && e.platform === 'instagram');
            if (aspectRatioError) {
              try {
                // Get user information
                const user = await User.findById(req.user.sub);
                if (user && user.email) {
                  // Send email about aspect ratio error
                  await sendInstagramAspectRatioErrorEmail(
                    user.email,
                    user.name || 'User',
                    aspectRatioError.error,
                    aspectRatioError.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
                    aspectRatioError.postType || post.postType || 'post'
                  );
                  console.log('📧 Aspect ratio error email sent to:', user.email);
                }
              } catch (emailError) {
                console.error('❌ Error sending aspect ratio error email:', emailError);
                // Don't fail the request if email fails
              }
            }
          }
          
          // Update post with publishing results
          post.status = finalStatus;
          post.publishedTime = new Date();
          if (publishResults.instagram) {
            post.instagramPostId = publishResults.instagram.postId;
            post.instagramPostUrl = publishResults.instagram.url;
          }
          if (publishResults.facebook) {
            post.facebookPostId = publishResults.facebook.postId;
            post.facebookPostUrl = publishResults.facebook.url;
          }
          if (errors.length > 0) {
            post.publishingErrors = errors;
          }
          
          await post.save();
          
          // Check if there's an aspect ratio error to return to frontend
          const aspectRatioError = publishResults.errors?.find(e => e.isAspectRatioError && e.platform === 'instagram');
          if (aspectRatioError) {
            const postData = post.toObject();
            delete postData.createdBy;
            return sendResponse(201, {
              success: true,
              data: postData,
              aspectRatioError: {
                isAspectRatioError: true,
                error: aspectRatioError.error,
                mediaUrl: aspectRatioError.mediaUrl,
                postType: aspectRatioError.postType
              }
            });
          }
        }
      } catch (publishError) {
        console.error('Error publishing post immediately:', publishError);
        // Don't fail the request, just log the error
        post.status = 'failed';
        post.publishingErrors = [publishError.message];
        await post.save();
        
        // Check if it's an aspect ratio error
        if (publishError.isAspectRatioError) {
          const postData = post.toObject();
          delete postData.createdBy;
          return sendResponse(201, {
            success: true,
            data: postData,
            aspectRatioError: {
              isAspectRatioError: true,
              error: publishError.message,
              mediaUrl: publishError.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
              postType: publishError.postType || post.postType || 'post'
            }
          });
        }
      }
    }

    // Return post without createdBy field
    const postData = post.toObject();
    delete postData.createdBy;

    sendResponse(201, { success: true, data: postData });
  } catch (error) {
    console.error('Error creating post:', error);
    if (!responseSent) {
      if (error.name === 'CastError') {
        return sendResponse(400, {
          success: false,
          error: 'Invalid client ID'
        });
      }
      sendResponse(500, { success: false, error: error.message || 'Failed to create post' });
    }
  }

  // Final safety check - ensure response is always sent
  if (!responseSent) {
    console.error('Response was never sent in create post route - sending fallback error');
    sendResponse(500, { success: false, error: 'Internal server error - response not sent' });
  }
});

// PUT /api/posts/:id - Update a post
router.put('/:id', async (req, res) => {
  try {
    const { 
      content, 
      platform, 
      client, 
      scheduledTime, 
      mediaUrls,
      musicUrl,
      musicTitle,
      musicArtist,
      caption, 
      hashtags, 
      tags,
      location,
      status,
      postType,
      format 
    } = req.body;

    // Find post
    const post = await Post.findOne({
      _id: req.params.id,
      createdBy: req.user.sub
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Log edit attempt
    console.log(`✏️ Editing post ${post._id} (status: ${post.status})`);

    // For published posts, only allow editing caption, hashtags, and tags (metadata)
    if (post.status === 'published') {
      console.log('  ⚠️ Post is published - limited editing allowed');
      
      // Only update metadata fields for published posts
      if (caption !== undefined) {
        post.caption = caption.trim();
      }
      if (hashtags !== undefined) {
        post.hashtags = hashtags;
      }
      if (tags !== undefined) {
        post.tags = Array.isArray(tags) ? tags.map(tag => {
          if (typeof tag === 'string') {
            return { name: tag.trim(), color: '#8b5cf6' };
          }
          return {
            name: tag.name ? tag.name.trim() : '',
            color: tag.color || '#8b5cf6'
          };
        }).filter(tag => tag.name) : [];
      }
      
      await post.save();
      await post.populate('client', 'name email platform');
      
      const postData = post.toObject();
      delete postData.createdBy;
      
      return res.json({ 
        success: true, 
        data: postData,
        message: 'Published post metadata updated (Instagram does not allow editing media after publish)' 
      });
    }

    // Update fields
    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Content cannot be empty'
        });
      }
      post.content = content.trim();
    }

    if (platform !== undefined) {
      if (!['instagram', 'facebook', 'both'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: 'Platform must be instagram, facebook, or both'
        });
      }
      post.platform = platform;
    }

    if (client !== undefined) {
      // Verify client belongs to the user
      const clientDoc = await Client.findOne({
        _id: client,
        createdBy: req.user.sub
      });

      if (!clientDoc) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      post.client = client;
    }

    if (scheduledTime !== undefined) {
      if (scheduledTime === null) {
        // Remove scheduled time
        post.scheduledTime = undefined;
        if (post.status === 'scheduled') {
          post.status = 'draft';
        }
      } else {
        const scheduled = new Date(scheduledTime);
        if (scheduled > new Date()) {
          post.scheduledTime = scheduled;
          post.status = 'scheduled';
        } else {
          return res.status(400).json({
            success: false,
            error: 'Scheduled time must be in the future'
          });
        }
      }
    }

    if (mediaUrls !== undefined) {
      post.mediaUrls = mediaUrls;
    }

    if (musicUrl !== undefined) {
      post.musicUrl = musicUrl.trim() || undefined;
    }

    if (musicTitle !== undefined) {
      post.musicTitle = musicTitle.trim() || undefined;
    }

    if (musicArtist !== undefined) {
      post.musicArtist = musicArtist.trim() || undefined;
    }

    if (caption !== undefined) {
      post.caption = caption.trim();
    }

    if (hashtags !== undefined) {
      post.hashtags = hashtags;
    }

    if (tags !== undefined) {
      // Handle both string tags (backward compatibility) and object tags
      post.tags = Array.isArray(tags) ? tags.map(tag => {
        if (typeof tag === 'string') {
          return { name: tag.trim(), color: '#8b5cf6' };
        }
        return {
          name: tag.name ? tag.name.trim() : '',
          color: tag.color || '#8b5cf6'
        };
      }).filter(tag => tag.name) : [];
    }

    if (location !== undefined) {
      post.location = location.trim();
    }

    if (status !== undefined && ['draft', 'scheduled'].includes(status)) {
      post.status = status;
    }

    // Update postType (post/story/reel)
    if (postType !== undefined) {
      if (!['post', 'story', 'reel'].includes(postType)) {
        return res.status(400).json({
          success: false,
          error: 'Post type must be post, story, or reel'
        });
      }
      post.postType = postType;
      console.log(`  📝 Post type updated to: ${postType}`);
    }

    // Update format (square/portrait/landscape/reel/story/carousel-square/carousel-vertical)
    if (format !== undefined) {
      const validFormats = ['square', 'portrait', 'landscape', 'reel', 'story', 'carousel-square', 'carousel-vertical'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: `Format must be one of: ${validFormats.join(', ')}`
        });
      }
      post.format = format;
      console.log(`  📐 Format updated to: ${format}`);
    }

    await post.save();
    await post.populate('client', 'name email platform');

    console.log(`  ✅ Post ${post._id} updated successfully`);

    // Return post without createdBy field
    const postData = post.toObject();
    delete postData.createdBy;

    res.json({ 
      success: true, 
      data: postData,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid post or client ID'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id - Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      createdBy: req.user.sub
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    console.log(`🗑️ Deleting post ${post._id} (status: ${post.status})`);

    // Delete the post from database
    // Note: If the post is scheduled, the scheduler will simply skip it (post no longer exists)
    // If published, we remove it from our database (Instagram post remains on their platform)
    await Post.deleteOne({ _id: req.params.id });

    const statusMessage = post.status === 'published' 
      ? 'Post deleted from database (Instagram post remains on platform)'
      : post.status === 'scheduled'
      ? 'Scheduled post deleted and will not be published'
      : 'Draft post deleted';

    console.log(`  ✅ ${statusMessage}`);

    res.json({ 
      success: true, 
      message: 'Post deleted successfully',
      info: statusMessage
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// GET /api/posts/stats/count - Get post statistics for dashboard
router.get('/stats/count', async (req, res) => {
  try {
    const userId = req.user.sub;

    const [totalPosts, scheduledPosts, publishedPosts, draftPosts] = await Promise.all([
      Post.countDocuments({ createdBy: userId }),
      Post.countDocuments({ createdBy: userId, status: 'scheduled' }),
      Post.countDocuments({ createdBy: userId, status: 'published' }),
      Post.countDocuments({ createdBy: userId, status: 'draft' })
    ]);

    res.json({
      success: true,
      stats: {
        totalPosts,
        scheduledPosts,
        publishedPosts,
        draftPosts
      }
    });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post statistics' });
  }
});

// POST /api/posts/scheduler/trigger - Manually trigger the scheduler (for testing)
router.post('/scheduler/trigger', async (req, res) => {
  try {
    console.log('🔧 Manual scheduler trigger requested');
    await processScheduledPosts();
    res.json({
      success: true,
      message: 'Scheduler triggered successfully. Check server logs for details.'
    });
  } catch (error) {
    console.error('Error triggering scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger scheduler'
    });
  }
});

// POST /api/posts/:id/publish - Publish a post immediately
router.post('/:id/publish', async (req, res) => {
  try {
    // Find post
    const post = await Post.findOne({
      _id: req.params.id,
      createdBy: req.user.sub
    }).populate('client');

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if post can be published
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Post is already published'
      });
    }

    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Post must have at least one image to publish'
      });
    }

    const client = post.client;
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found for this post'
      });
    }

    // Import posting service
    const { publishPost } = await import('../services/postingService.js');

    console.log('');
    console.log('='.repeat(60));
    console.log('🚀 POST NOW: Publishing post immediately');
    console.log('='.repeat(60));
    console.log('  Post ID:', post._id);
    console.log('  Post Type:', post.postType || 'post');
    console.log('  Platform:', post.platform);
    console.log('  Client:', client.name);
    console.log('  Media URLs:', post.mediaUrls);
    console.log('  Caption:', post.caption ? post.caption.substring(0, 50) + '...' : 'None');
    console.log('');

    // Publish the post
    const results = await publishPost(post, client);

    // Determine if posting succeeded based on platform requirements
    let postingSucceeded = false;
    let postingFailed = false;
    const errorMessages = [];

    // Check Instagram posting status
    if (post.platform === 'instagram' || post.platform === 'both') {
      if (results.instagram && results.instagram.success) {
        postingSucceeded = true;
      } else {
        postingFailed = true;
        const instagramError = results.errors.find(e => e.platform === 'instagram');
        if (instagramError) {
          errorMessages.push(`Instagram: ${instagramError.error}`);
          
          // Check if it's an aspect ratio error and send email
          if (instagramError.isAspectRatioError) {
            try {
              // Get user information
              const user = await User.findById(req.user.sub);
              if (user && user.email) {
                // Send email about aspect ratio error
                await sendInstagramAspectRatioErrorEmail(
                  user.email,
                  user.name || 'User',
                  instagramError.error,
                  instagramError.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
                  instagramError.postType || post.postType || 'post'
                );
                console.log('📧 Aspect ratio error email sent to:', user.email);
              }
            } catch (emailError) {
              console.error('❌ Error sending aspect ratio error email:', emailError);
              // Don't fail the request if email fails
            }
          }
        } else {
          errorMessages.push('Instagram: Posting failed');
        }
      }
    }

    // Check Facebook posting status
    if (post.platform === 'facebook' || post.platform === 'both') {
      if (results.facebook && results.facebook.success) {
        postingSucceeded = true;
      } else {
        // Only mark as failed if Instagram also failed (for 'both' platform)
        // or if Facebook is the only platform
        if (post.platform === 'facebook' || (post.platform === 'both' && !results.instagram)) {
          postingFailed = true;
        }
        const facebookError = results.errors.find(e => e.platform === 'facebook');
        if (facebookError) {
          errorMessages.push(`Facebook: ${facebookError.error}`);
        } else if (post.platform === 'facebook') {
          errorMessages.push('Facebook: Posting failed');
        }
      }
    }

    // Update post status based on posting results
    const updateData = {};

    if (postingSucceeded) {
      // At least one platform succeeded
      updateData.status = 'published';
      updateData.publishedTime = new Date();
      
      if (results.instagram) {
        updateData.instagramPostId = results.instagram.postId;
      }
      if (results.facebook) {
        updateData.facebookPostId = results.facebook.postId;
      }
      
      // If there were partial failures (e.g., 'both' platform but one failed)
      // Store error message but still mark as published
      if (errorMessages.length > 0) {
        updateData.errorMessage = `Partial success. Errors: ${errorMessages.join('; ')}`;
        console.log(`  ⚠️ Post published with partial failures: ${updateData.errorMessage}`);
      } else {
        // Clear any previous error messages on success
        updateData.errorMessage = null;
      }
    } else if (postingFailed) {
      // All required platforms failed
      updateData.status = 'failed';
      updateData.errorMessage = errorMessages.join('; ');
      console.error(`  ❌ Post failed: ${updateData.errorMessage}`);
    } else {
      // This shouldn't happen, but handle it
      updateData.status = 'failed';
      updateData.errorMessage = 'Unknown error during posting';
      console.error(`  ❌ Post failed: Unknown error`);
    }

    // Update post
    Object.assign(post, updateData);
    await post.save();

    await post.populate('client', 'name email platform');

    const postData = post.toObject();
    delete postData.createdBy;

    // Check if there's an aspect ratio error to return to frontend
    const aspectRatioError = results.errors?.find(e => e.isAspectRatioError && e.platform === 'instagram');
    const responseData = {
      success: true,
      data: postData,
      results
    };
    
    // Add aspect ratio error info if present
    if (aspectRatioError) {
      responseData.aspectRatioError = {
        isAspectRatioError: true,
        error: aspectRatioError.error,
        mediaUrl: aspectRatioError.mediaUrl,
        postType: aspectRatioError.postType
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error publishing post:', error);
    
    // Update post status to failed
    try {
      const post = await Post.findById(req.params.id);
      if (post) {
        post.status = 'failed';
        post.errorMessage = error.message;
        await post.save();
      }
    } catch (updateError) {
      console.error('Error updating post status:', updateError);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish post'
    });
  }
});

// GET /api/posts/clients/:clientId/permissions - Check client permissions for posting
router.get('/clients/:clientId/permissions', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await getClientPermissions(clientId, req.user.sub);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error fetching client permissions:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch client permissions'
    });
  }
});

// OLD PERMISSIONS ENDPOINT (keeping for backward compatibility)
router.get('/clients/:clientId/permissions-old', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verify client belongs to the user
    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.user.sub
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    if (client.platform !== 'instagram' && client.platform !== 'manual') {
      return res.status(400).json({
        success: false,
        error: 'Client is not an Instagram account'
      });
    }

    if (!client.igUserId || !client.pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram credentials not found. Please reconnect the account.',
        needsReauth: true
      });
    }

    // Check permissions by trying to access Instagram Business Account
    const diagnostics = {
      hasCredentials: true,
      canAccessInstagram: null,
      canAccessPage: null,
      errors: [],
      recommendations: []
    };

    try {
      // Test Instagram Business Account access
      const igTestUrl = `https://graph.facebook.com/v22.0/${client.igUserId}?fields=id,username&access_token=${client.pageAccessToken}`;
      const igTestResponse = await fetch(igTestUrl);
      
      if (igTestResponse.ok) {
        const igData = await igTestResponse.json();
        diagnostics.canAccessInstagram = true;
        diagnostics.instagramUsername = igData.username;
      } else {
        diagnostics.canAccessInstagram = false;
        const errorData = await igTestResponse.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorData);
        } catch (e) {
          errorJson = null;
        }
        
        if (errorJson?.error?.code === 10) {
          diagnostics.errors.push({
            type: 'permission_denied',
            message: 'Cannot access Instagram Business Account. Permission denied.',
            code: 10
          });
          diagnostics.recommendations.push('The app may be in Development Mode. Add yourself as a test user or request permission review.');
          diagnostics.recommendations.push('Request review for pages_manage_posts and instagram_content_publish permissions.');
          diagnostics.recommendations.push('Re-authenticate the Instagram account after permissions are approved.');
        } else {
          diagnostics.errors.push({
            type: 'api_error',
            message: errorJson?.error?.message || 'Unknown error',
            code: errorJson?.error?.code
          });
        }
      }

      // Test Page access if pageId is available
      if (client.pageId) {
        const pageTestUrl = `https://graph.facebook.com/v22.0/${client.pageId}?fields=id,name&access_token=${client.pageAccessToken}`;
        const pageTestResponse = await fetch(pageTestUrl);
        
        if (pageTestResponse.ok) {
          const pageData = await pageTestResponse.json();
          diagnostics.canAccessPage = true;
          diagnostics.pageName = pageData.name;
        } else {
          diagnostics.canAccessPage = false;
          const errorData = await pageTestResponse.text();
          let errorJson;
          try {
            errorJson = JSON.parse(errorData);
          } catch (e) {
            errorJson = null;
          }
          
          if (errorJson?.error?.code === 10) {
            diagnostics.errors.push({
              type: 'permission_denied',
              message: 'Cannot access Facebook Page. Permission denied.',
              code: 10
            });
          }
        }
      }
    } catch (error) {
      diagnostics.errors.push({
        type: 'network_error',
        message: error.message
      });
    }

    // Determine overall status
    if (diagnostics.canAccessInstagram === true && (diagnostics.canAccessPage === true || !client.pageId)) {
      diagnostics.status = 'ok';
      diagnostics.message = 'All permissions verified successfully';
    } else if (diagnostics.canAccessInstagram === false) {
      diagnostics.status = 'error';
      diagnostics.message = 'Permission error detected. Please check Facebook App settings.';
    } else {
      diagnostics.status = 'warning';
      diagnostics.message = 'Could not verify all permissions';
    }

    // Add Facebook App Dashboard link
    const appId = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || 'YOUR_APP_ID';
    diagnostics.appDashboardUrl = `https://developers.facebook.com/apps/${appId}/app-review/permissions/`;
    diagnostics.appId = appId;

    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check permissions'
    });
  }
});

export default router;

