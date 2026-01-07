import mongoose from 'mongoose';
import fs from 'fs';
// No local imports to avoid module resolution issues

async function run() {
    const logs = [];
    function log(msg, data) {
        console.log(msg, data || '');
        logs.push({ msg, data });
    }

    try {
        console.log('Connecting to DB...');
        // MONGODB_URI should be provided by --env-file=.env
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Access collection directly to avoid Model import issues
        const collection = mongoose.connection.db.collection('clients');
        const client = await collection.findOne({ name: { $regex: /nidhil/i } });

        if (!client) throw new Error('Client nidhil not found');

        log(`Found client: ${client.name}`);
        // Check fields - raw document might have different naming if schema transforms it?
        // Mongoose schema maps usually match DB unless alias is used.
        // Assuming pageAccessToken is the field name.

        // If field names are camelCase in schema but snake_case in DB, this might fail, 
        // but typically they match.

        const pageAccessToken = client.pageAccessToken;
        const igUserId = client.igUserId;

        if (!pageAccessToken) throw new Error('Missing pageAccessToken');

        // TEST 1: Reach
        const reachUrl = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=reach&period=day&access_token=${pageAccessToken}`;
        log('TEST 1 Request', reachUrl.replace(pageAccessToken, '***'));

        const reachRes = await fetch(reachUrl);
        const reachData = await reachRes.json();
        log('TEST 1 Reach Result', reachData);

        // TEST 2: Account Insights (Impressions, etc)
        const accUrl = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=reach,follower_count&period=day&access_token=${pageAccessToken}`; // impressions removed in v22?
        log('TEST 2 Account Trend Request', accUrl.replace(pageAccessToken, '***'));
        const accRes = await fetch(accUrl);
        const accData = await accRes.json();
        log('TEST 2 Account Trend Result', accData);

        // TEST 3: Media
        const mediaUrl = `https://graph.facebook.com/v22.0/${igUserId}/media?limit=1&access_token=${pageAccessToken}`;
        const mediaRes = await fetch(mediaUrl);
        const mediaData = await mediaRes.json();
        log('TEST 3 Media List', mediaData);

        if (mediaData.data && mediaData.data.length > 0) {
            const mediaId = mediaData.data[0].id;
            const metrics = 'reach,total_interactions,saved,shares,views'; // Try views too
            const insightsUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
            const insightsRes = await fetch(insightsUrl);
            const insightsData = await insightsRes.json();
            log('TEST 4 Media Insights', insightsData);
        }

        fs.writeFileSync('debug_results.json', JSON.stringify(logs, null, 2));
        console.log('Written to debug_results.json');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('debug_results.json', JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
        process.exit(1);
    }
}

run();
