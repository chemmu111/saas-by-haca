import { Router } from 'express';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// Middleware to ensure user is authenticated and is an admin
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/tokens - List all clients with token status
router.get('/tokens', async (req, res) => {
    try {
        const clients = await Client.find({}).select('name platform socialMediaId pageAccessToken tokenStatus tokenExpiresAt lastTokenRefresh');

        const tokenData = clients.map(client => {
            // Determine status and days left
            let status = 'unknown';
            let expiresInDays = null;
            let expiresAt = client.tokenExpiresAt;
            let lastRefreshedAt = client.lastTokenRefresh;

            if (client.platform === 'instagram' && client.pageAccessToken) {
                // If we have a calculated status in DB, use it
                if (client.tokenStatus && client.tokenStatus.state) {
                    status = client.tokenStatus.state;
                    expiresInDays = client.tokenStatus.expiresInDays;
                } else if (client.tokenExpiresAt) {
                    // Fallback calculation if tokenStatus is missing/incomplete
                    const now = new Date();
                    const diffTime = new Date(client.tokenExpiresAt) - now;
                    expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (expiresInDays <= 0) status = 'expired';
                    else if (expiresInDays <= 10) status = 'expiringSoon';
                    else status = 'active';
                } else {
                    status = 'unknown';
                }
            } else {
                status = 'not_connected';
            }

            return {
                _id: client._id,
                clientName: client.name,
                igUsername: client.socialMediaId || 'N/A', // Assuming socialMediaId stores the username or ID
                tokenStatus: status,
                expiresAt: expiresAt,
                expiresInDays: expiresInDays,
                lastRefreshedAt: lastRefreshedAt,
                isConnected: client.platform === 'instagram' && !!client.pageAccessToken
            };
        });

        res.json(tokenData);
    } catch (error) {
        console.error('Error fetching admin token data:', error);
        res.status(500).json({ error: 'Failed to fetch token data' });
    }
});

export default router;
