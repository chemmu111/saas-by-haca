import express from 'express';
import Post from '../models/Post.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/tags - Get all unique tags for the authenticated user
router.get('/', async (req, res) => {
  try {
    // Get all posts for the user
    const posts = await Post.find({ createdBy: req.user.sub })
      .select('tags')
      .lean();

    // Extract all unique tags
    const tagMap = new Map();
    
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (tag && tag.name) {
            const tagName = tag.name.trim().toLowerCase();
            if (tagName && !tagMap.has(tagName)) {
              tagMap.set(tagName, {
                name: tag.name.trim(),
                color: tag.color || '#8b5cf6'
              });
            }
          }
        });
      }
    });

    // Convert map to array
    const tags = Array.from(tagMap.values());

    // Sort by name
    tags.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ 
      success: true, 
      data: tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tags' });
  }
});

// GET /api/tags/stats - Get tag usage statistics
router.get('/stats', async (req, res) => {
  try {
    // Get all posts for the user
    const posts = await Post.find({ createdBy: req.user.sub })
      .select('tags')
      .lean();

    // Count tag usage
    const tagCounts = new Map();
    
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (tag && tag.name) {
            const tagName = tag.name.trim().toLowerCase();
            if (tagName) {
              const currentCount = tagCounts.get(tagName) || 0;
              tagCounts.set(tagName, currentCount + 1);
            }
          }
        });
      }
    });

    // Convert to array with counts
    const stats = Array.from(tagCounts.entries()).map(([name, count]) => ({
      name,
      count
    }));

    // Sort by count (descending)
    stats.sort((a, b) => b.count - a.count);

    res.json({ 
      success: true, 
      data: stats,
      count: stats.length
    });
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tag statistics' });
  }
});

// GET /api/tags/:tagName/posts - Get all posts with a specific tag
router.get('/:tagName/posts', async (req, res) => {
  try {
    const { tagName } = req.params;
    const { limit, skip } = req.query;

    // Parse pagination
    const limitNum = limit ? parseInt(limit) : 50;
    const skipNum = skip ? parseInt(skip) : 0;

    // Find posts that contain the tag
    const posts = await Post.find({
      createdBy: req.user.sub,
      tags: { $elemMatch: { name: { $regex: new RegExp(tagName, 'i') } } }
    })
      .populate('client', 'name email platform')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .select('-createdBy')
      .lean();

    const total = await Post.countDocuments({
      createdBy: req.user.sub,
      tags: { $elemMatch: { name: { $regex: new RegExp(tagName, 'i') } } }
    });

    res.json({ 
      success: true, 
      data: posts, 
      count: posts.length,
      total,
      limit: limitNum,
      skip: skipNum
    });
  } catch (error) {
    console.error('Error fetching posts by tag:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts by tag' });
  }
});

export default router;


