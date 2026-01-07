import FollowerSnapshot from '../models/FollowerSnapshot.js';

/**
 * Create or update a follower snapshot for a client
 * @param {String} clientId - Client ObjectId
 * @param {Number} followerCount - Current follower count
 * @param {String} source - 'instagram' or 'facebook'
 * @returns {Object} Created/updated snapshot
 */
export const createSnapshot = async (clientId, followerCount, source = 'instagram') => {
    try {
        // Get today's date at midnight UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Check if snapshot exists for today
        let snapshot = await FollowerSnapshot.findOne({ client: clientId, date: today, source });

        if (snapshot) {
            // Snapshot exists: calculate difference from last recorded count today
            const diff = followerCount - snapshot.followerCount;

            // Accumulate gains/losses
            if (diff > 0) {
                snapshot.gained = (snapshot.gained || 0) + diff;
            } else if (diff < 0) {
                snapshot.lost = (snapshot.lost || 0) + Math.abs(diff);
            }

            snapshot.followerCount = followerCount;
            snapshot.updatedAt = new Date(); // Ensure we track update time if needed
            await snapshot.save();
        } else {
            // No snapshot for today: calculate difference from last known snapshot (yesterday or earlier)
            const lastSnapshot = await FollowerSnapshot.findOne({ client: clientId, source })
                .sort({ date: -1 });

            let gained = 0;
            let lost = 0;

            if (lastSnapshot) {
                const diff = followerCount - lastSnapshot.followerCount;
                if (diff > 0) {
                    gained = diff;
                } else if (diff < 0) {
                    lost = Math.abs(diff);
                }
            }

            snapshot = await FollowerSnapshot.create({
                client: clientId,
                date: today,
                source,
                followerCount,
                gained,
                lost,
                createdAt: new Date()
            });
        }

        console.log(`📸 Snapshot saved: ${followerCount} followers for client ${clientId} (G: +${snapshot.gained}, L: -${snapshot.lost})`);
        return snapshot;
    } catch (error) {
        console.error('❌ Error creating snapshot:', error);
        throw error;
    }
};

/**
 * Get follower snapshots for a client over a period
 * @param {String} clientId - Client ObjectId
 * @param {Number} days - Number of days to look back
 * @returns {Array} Array of snapshots
 */
export const getSnapshots = async (clientId, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setUTCHours(0, 0, 0, 0);

        const snapshots = await FollowerSnapshot.find({
            client: clientId,
            date: { $gte: startDate }
        }).sort({ date: 1 });

        return snapshots;
    } catch (error) {
        console.error('❌ Error fetching snapshots:', error);
        throw error;
    }
};

/**
 * Calculate follower growth metrics from snapshots
 * @param {String} clientId - Client ObjectId
 * @param {Number} days - Period to calculate over
 * @returns {Object} Growth metrics
 */
export const calculateGrowth = async (clientId, days = 30) => {
    try {
        const snapshots = await getSnapshots(clientId, days);

        if (snapshots.length < 2) {
            // Not enough data for comparison
            return {
                current: snapshots[0]?.followerCount || 0,
                gained: 0,
                lost: 0,
                netGrowth: 0,
                period: `${days}days`,
                hasData: false
            };
        }

        const first = snapshots[0].followerCount;
        const last = snapshots[snapshots.length - 1].followerCount;
        const netGrowth = last - first;

        // Calculate daily changes to get total gained and lost
        let totalGained = 0;
        let totalLost = 0;

        for (let i = 1; i < snapshots.length; i++) {
            const current = snapshots[i];
            const prev = snapshots[i - 1];

            // If we have recorded gained/lost data (new logic), use it
            if ((current.gained && current.gained > 0) || (current.lost && current.lost > 0)) {
                totalGained += current.gained || 0;
                totalLost += current.lost || 0;
            } else {
                // Fallback for legacy data: calculate from daily difference
                const change = current.followerCount - prev.followerCount;
                if (change > 0) {
                    totalGained += change;
                } else if (change < 0) {
                    totalLost += Math.abs(change);
                }
            }
        }

        return {
            current: last,
            gained: totalGained,
            lost: totalLost,
            netGrowth,
            period: `${days}days`,
            hasData: true,
            snapshotCount: snapshots.length
        };
    } catch (error) {
        console.error('❌ Error calculating growth:', error);
        return {
            current: 0,
            gained: 0,
            lost: 0,
            netGrowth: 0,
            period: `${days}days`,
            hasData: false
        };
    }
};

/**
 * Get the latest snapshot for a client
 * @param {String} clientId - Client ObjectId
 * @returns {Object} Latest snapshot or null
 */
export const getLatestSnapshot = async (clientId) => {
    try {
        const snapshot = await FollowerSnapshot.findOne({ client: clientId })
            .sort({ createdAt: -1 })
            .limit(1);

        return snapshot;
    } catch (error) {
        console.error('❌ Error fetching latest snapshot:', error);
        return null;
    }
};
