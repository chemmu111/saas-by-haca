import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import { updateClientStats } from '../services/analyticsService.js';

const router = express.Router();

// In-memory cache for live stats (5 minutes TTL)
const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// All routes require authentication
router.use(requireAuth);

// GET /api/live-stats/:id - Get real-time stats from Instagram API
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userIdString = req.user.sub || req.user.id || req.user._id;

        if (!userIdString) {
            return res.status(401).json({ success: false, error: 'Invalid user token' });
        }

        // Convert string ID to ObjectId for MongoDB query
        const userId = mongoose.Types.ObjectId.isValid(userIdString)
            ? new mongoose.Types.ObjectId(userIdString)
            : userIdString;

        // Validate client ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid client ID' });
        }

        // Fetch client from database
        const client = await Client.findOne({
            _id: id,
            createdBy: userId
        });

        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        // For manual clients, return database stats
        if (client.platform !== 'instagram') {
            return res.json({
                success: true,
                data: {
                    followerCount: client.followerCount || 0,
                    totalPosts: client.totalPosts || 0,
                    engagementRate: client.engagementRate || '0%',
                    source: 'database',
                    cached: false
                }
            });
        }

        // Check if client has valid Instagram connection
        const tokenStatus = typeof client.tokenStatus === 'object'
            ? client.tokenStatus.state
            : client.tokenStatus;

        if (tokenStatus !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Instagram token is not active',
                tokenStatus: client.tokenStatus
            });
        }

        // Check cache first (unless refresh is requested)
        const refresh = req.query.refresh === 'true';
        const cacheKey = `stats_${id}`;
        const cached = statsCache.get(cacheKey);

        if (!refresh && cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            console.log(`Returning cached stats for client ${id}`);
            return res.json({
                success: true,
                data: {
                    ...cached.data,
                    source: 'api',
                    cached: true,
                    cachedAt: new Date(cached.timestamp).toISOString()
                }
            });
        }

        // Fetch fresh stats from Instagram API
        console.log(`Fetching live stats from Instagram API for client ${id}`);
        const stats = await updateClientStats(client);

        if (!stats) {
            // Fallback to database stats if API fails
            return res.json({
                success: true,
                data: {
                    followerCount: client.followerCount || 0,
                    totalPosts: client.totalPosts || 0,
                    engagementRate: client.engagementRate || '0%',
                    source: 'database_fallback',
                    cached: false,
                    error: 'Failed to fetch from Instagram API'
                }
            });
        }

        // Cache the results
        statsCache.set(cacheKey, {
            data: stats,
            timestamp: Date.now()
        });

        // Clean up old cache entries periodically
        if (statsCache.size > 100) {
            const now = Date.now();
            for (const [key, value] of statsCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    statsCache.delete(key);
                }
            }
        }

        res.json({
            success: true,
            data: {
                ...stats,
                source: 'api',
                cached: false
            }
        });
    } catch (error) {
        console.error('Error fetching live stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live stats',
            details: error.message
        });
    }
});

export default router;
