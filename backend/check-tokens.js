import mongoose from 'mongoose';
import Client from './src/models/Client.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTokens() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const clients = await Client.find({
            platform: 'instagram',
            pageAccessToken: { $exists: true, $ne: null }
        }).select('name tokenExpiresAt tokenStatus pageAccessToken');

        console.log('\n📊 Instagram Token Status:\n');

        for (const client of clients) {
            const now = new Date();
            const expiresAt = client.tokenExpiresAt ? new Date(client.tokenExpiresAt) : null;
            const daysLeft = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

            let status = 'unknown';
            if (daysLeft !== null) {
                if (daysLeft <= 0) status = '🔴 EXPIRED';
                else if (daysLeft <= 10) status = '🟠 EXPIRING SOON';
                else status = '🟢 ACTIVE';
            }

            console.log(`Client: ${client.name}`);
            console.log(`  Status: ${status}`);
            console.log(`  Days Left: ${daysLeft !== null ? daysLeft : 'N/A'}`);
            console.log(`  Expires At: ${expiresAt ? expiresAt.toISOString() : 'N/A'}`);
            console.log(`  Has Token: ${client.pageAccessToken ? 'Yes' : 'No'}`);
            console.log('');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTokens();
