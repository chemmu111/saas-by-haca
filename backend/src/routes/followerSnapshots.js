import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { manualSnapshot } from '../cron/followerSnapshotCron.js';
import { getSnapshots, calculateGrowth } from '../services/followerSnapshotService.js';
import Client from '../models/Client.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/follower-snapshots/trigger - Manually trigger a snapshot (for testing)
router.post('/trigger', async (req, res) => {
    try {
        console.log('📸 Manual snapshot triggered by user');
        const results = await manualSnapshot();

        res.json({
            success: true,
            message: 'Snapshot completed',
            results
        });
    } catch (error) {
        console.error('Error triggering manual snapshot:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger snapshot'
        });
    }
});

// GET /api/follower-snapshots/:clientId - Get snapshots for a client
router.get('/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { days = 30 } = req.query;

        const snapshots = await getSnapshots(clientId, parseInt(days));

        res.json({
            success: true,
            data: snapshots
        });
    } catch (error) {
        console.error('Error fetching snapshots:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch snapshots'
        });
    }
});

// GET /api/follower-snapshots/:clientId/growth - Get growth metrics for a client
router.get('/:clientId/growth', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { days = 30 } = req.query;

        const metrics = await calculateGrowth(clientId, parseInt(days));

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Error calculating growth:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate growth'
        });
    }
});

export default router;
