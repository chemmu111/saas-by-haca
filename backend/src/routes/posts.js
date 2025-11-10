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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit (for videos)
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

// POST /api/posts - Create a new post
router.post('/', async (req, res) => {
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
      postType,
      publishImmediately
    } = req.body;

    // Validation - content or caption is required
    if ((!content || content.trim().length === 0) && (!caption || caption.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Content or caption is required'
      });
    }
    
    // Use caption if content is not provided
    const postContent = content || caption || '';

    if (!platform || !['instagram', 'facebook', 'both'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Platform must be instagram, facebook, or both'
      });
    }

    if (!client) {
      return res.status(400).json({
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
      return res.status(404).json({
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
        return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        error: `Invalid postType. Must be one of: ${validPostTypes.join(', ')}`
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
      createdBy: req.user.sub
    });

    await post.save();

    // Populate client before returning
    await post.populate('client', 'name email platform');

    // If publishImmediately is true, publish the post now
    if (publishImmediately && !scheduledTime) {
      try {
        const { publishPost } = await import('../services/postingService.js');
        const clientDoc = await Client.findById(client);
        
        if (clientDoc) {
          const publishResults = await publishPost(post.toObject(), clientDoc.toObject());
          
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
            return res.status(201).json({ 
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
          return res.status(201).json({ 
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

    res.status(201).json({ success: true, data: postData });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to create post' });
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
      status 
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

    // Only allow updating draft or scheduled posts
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update published posts'
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

    await post.save();
    await post.populate('client', 'name email platform');

    // Return post without createdBy field
    const postData = post.toObject();
    delete postData.createdBy;

    res.json({ success: true, data: postData });
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

    // Only allow deleting draft or scheduled posts
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete published posts'
      });
    }

    await Post.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Post deleted successfully' });
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

    console.log('🚀 Publishing post:', post._id);
    console.log('  Platform:', post.platform);
    console.log('  Client:', client.name);

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

export default router;

