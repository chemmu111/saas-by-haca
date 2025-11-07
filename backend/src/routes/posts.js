import express from 'express';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

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
      tags,
      location 
    } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

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
      content: content.trim(),
      platform,
      client,
      status,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      mediaUrls: mediaUrls || [],
      caption: caption ? caption.trim() : '',
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

export default router;

