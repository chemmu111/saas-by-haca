import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// All routes require authentication
router.use(requireAuth);

// POST /api/posts/upload - Upload an image file
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Generate URL for the uploaded file
    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    const fileUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload image'
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
      caption, 
      hashtags, 
      location 
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

    // Determine status based on scheduledTime
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
    }

    // Create new post
    const post = new Post({
      content: postContent.trim(),
      platform,
      client,
      status,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      mediaUrls: mediaUrls || [],
      caption: caption ? caption.trim() : postContent.trim(),
      hashtags: hashtags || [],
      location: location ? location.trim() : '',
      createdBy: req.user.sub
    });

    await post.save();

    // Populate client before returning
    await post.populate('client', 'name email platform');

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
      caption, 
      hashtags, 
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

    if (caption !== undefined) {
      post.caption = caption.trim();
    }

    if (hashtags !== undefined) {
      post.hashtags = hashtags;
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

    // Update post status
    const updateData = {
      status: 'published',
      publishedTime: new Date()
    };

    if (results.instagram) {
      updateData.instagramPostId = results.instagram.postId;
    }

    if (results.facebook) {
      updateData.facebookPostId = results.facebook.postId;
    }

    // If there were errors for all platforms, mark as failed
    if (results.errors.length > 0) {
      if ((post.platform === 'instagram' || post.platform === 'both') && !results.instagram) {
        updateData.status = 'failed';
        updateData.errorMessage = results.errors.map(e => e.error).join('; ');
      } else if ((post.platform === 'facebook' || post.platform === 'both') && !results.facebook) {
        updateData.status = 'failed';
        updateData.errorMessage = results.errors.map(e => e.error).join('; ');
      }
    }

    // Update post
    Object.assign(post, updateData);
    await post.save();

    await post.populate('client', 'name email platform');

    const postData = post.toObject();
    delete postData.createdBy;

    res.json({
      success: true,
      data: postData,
      results
    });
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

