import mongoose from 'mongoose';
import Client from './src/models/Client.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTokenExpiration() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const client = await Client.findOne({
            name: 'MUHAMMAD NIDHIL',
            platform: 'instagram'
        }).sort({ _id: -1 }); // Get the most recent one

        if (!client) {
            console.log('❌ Client not found');
            process.exit(1);
        }

        console.log('📊 Client Token Information:\n');
        console.log('Client Name:', client.name);
        console.log('Client ID:', client._id);
        console.log('Platform:', client.platform);
        console.log('\n🔑 Token Details:');
        console.log('Token Created At:', client.tokenCreatedAt);
        console.log('Token Expires At:', client.tokenExpiresAt);
        console.log('Token Expires In (seconds):', client.tokenExpiresIn);
        console.log('Token Last Refreshed:', client.tokenLastRefreshed);
        console.log('Token Status:', client.tokenStatus);

        if (client.tokenExpiresAt) {
            const now = new Date();
            const expiresAt = new Date(client.tokenExpiresAt);
            const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));

            console.log('\n⏰ Calculated Expiration:');
            console.log('Current Time:', now.toISOString());
            console.log('Expires At:', expiresAt.toISOString());
            console.log('Days Left:', daysLeft);
            console.log('Hours Left:', hoursLeft);
            console.log('Is Expired:', now > expiresAt ? '🔴 YES' : '🟢 NO');
        }

        console.log('\n📱 Instagram Specific:');
        console.log('Page ID:', client.pageId);
        console.log('IG User ID:', client.igUserId);
        console.log('Page Access Token (first 50 chars):', client.pageAccessToken?.substring(0, 50) + '...');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkTokenExpiration();
