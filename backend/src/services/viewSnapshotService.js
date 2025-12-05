import ViewSnapshot from '../models/ViewSnapshot.js';

/**
 * Create or update a view snapshot for a client
 * @param {String} clientId - Client ObjectId
 * @param {Object} viewData - { totalViews, reelViews, videoViews, postCount }
 * @returns {Object} Created/updated snapshot
 */
export const createViewSnapshot = async (clientId, viewData) => {
    try {
        const { totalViews = 0, reelViews = 0, videoViews = 0, postCount = 0 } = viewData;

        // Get today's date at midnight UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Check if snapshot exists for today
        let snapshot = await ViewSnapshot.findOne({ client: clientId, date: today });

        if (snapshot) {
            // Calculate views gained since last update
            const viewsGained = totalViews - snapshot.totalViews;

            // Update existing snapshot
            snapshot.totalViews = totalViews;
            snapshot.reelViews = reelViews;
            snapshot.videoViews = videoViews;
            snapshot.postCount = postCount;

            // Accumulate views gained (only positive)
            if (viewsGained > 0) {
                snapshot.viewsGained = (snapshot.viewsGained || 0) + viewsGained;
            }

            await snapshot.save();
        } else {
            // Get yesterday's snapshot to calculate views gained
            const lastSnapshot = await ViewSnapshot.findOne({ client: clientId })
                .sort({ date: -1 });

            let viewsGained = 0;
            if (lastSnapshot) {
                viewsGained = Math.max(0, totalViews - lastSnapshot.totalViews);
            }

            // Create new snapshot
            snapshot = await ViewSnapshot.create({
                client: clientId,
                date: today,
                totalViews,
                reelViews,
                videoViews,
                postCount,
                viewsGained,
                createdAt: new Date()
            });
        }

        console.log(`📊 View snapshot saved: ${totalViews} views for client ${clientId} (gained: +${snapshot.viewsGained})`);
        return snapshot;
    } catch (error) {
        // Handle duplicate key error gracefully
        if (error.code === 11000) {
            console.log(`📊 View snapshot already exists for today, updating...`);
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            return await ViewSnapshot.findOneAndUpdate(
                { client: clientId, date: today },
                {
                    totalViews: viewData.totalViews,
                    reelViews: viewData.reelViews,
                    videoViews: viewData.videoViews,
                    postCount: viewData.postCount
                },
                { new: true }
            );
        }
        console.error('❌ Error creating view snapshot:', error);
        throw error;
    }
};

/**
 * Get view snapshots for a client over a period
 * @param {String} clientId - Client ObjectId
 * @param {Number} days - Number of days to look back
 * @returns {Array} Array of snapshots
 */
export const getViewSnapshots = async (clientId, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setUTCHours(0, 0, 0, 0);

        const snapshots = await ViewSnapshot.find({
            client: clientId,
            date: { $gte: startDate }
        }).sort({ date: 1 });

        return snapshots;
    } catch (error) {
        console.error('❌ Error fetching view snapshots:', error);
        return [];
    }
};

/**
 * Get all view snapshots for all clients over a period
 * @param {Array} clientIds - Array of Client ObjectIds
 * @param {Number} days - Number of days to look back
 * @returns {Array} Array of daily aggregated view data
 */
export const getAggregatedViewSnapshots = async (clientIds, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setUTCHours(0, 0, 0, 0);

        const snapshots = await ViewSnapshot.find({
            client: { $in: clientIds },
            date: { $gte: startDate }
        }).sort({ date: 1 });

        // Aggregate by date
        const dailyData = {};
        snapshots.forEach(snapshot => {
            const dateStr = snapshot.date.toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: dateStr,
                    totalViews: 0,
                    reelViews: 0,
                    videoViews: 0,
                    viewsGained: 0
                };
            }
            dailyData[dateStr].totalViews += snapshot.totalViews;
            dailyData[dateStr].reelViews += snapshot.reelViews;
            dailyData[dateStr].videoViews += snapshot.videoViews;
            dailyData[dateStr].viewsGained += snapshot.viewsGained;
        });

        return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
        console.error('❌ Error fetching aggregated view snapshots:', error);
        return [];
    }
};

/**
 * Calculate view growth metrics from snapshots
 * @param {String} clientId - Client ObjectId
 * @param {Number} days - Period to calculate over
 * @returns {Object} Growth metrics
 */
export const calculateViewGrowth = async (clientId, days = 30) => {
    try {
        const snapshots = await getViewSnapshots(clientId, days);

        if (snapshots.length < 1) {
            return {
                currentViews: 0,
                viewsGained: 0,
                period: `${days}days`,
                hasData: false
            };
        }

        const totalViewsGained = snapshots.reduce((sum, s) => sum + (s.viewsGained || 0), 0);
        const latestSnapshot = snapshots[snapshots.length - 1];

        return {
            currentViews: latestSnapshot.totalViews,
            reelViews: latestSnapshot.reelViews,
            videoViews: latestSnapshot.videoViews,
            viewsGained: totalViewsGained,
            period: `${days}days`,
            hasData: true,
            snapshotCount: snapshots.length
        };
    } catch (error) {
        console.error('❌ Error calculating view growth:', error);
        return {
            currentViews: 0,
            viewsGained: 0,
            period: `${days}days`,
            hasData: false
        };
    }
};

/**
 * Get the latest view snapshot for a client
 * @param {String} clientId - Client ObjectId
 * @returns {Object} Latest snapshot or null
 */
export const getLatestViewSnapshot = async (clientId) => {
    try {
        const snapshot = await ViewSnapshot.findOne({ client: clientId })
            .sort({ createdAt: -1 })
            .limit(1);

        return snapshot;
    } catch (error) {
        console.error('❌ Error fetching latest view snapshot:', error);
        return null;
    }
};
