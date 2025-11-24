import mongoose from 'mongoose';
import Client from './src/models/Client.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyTokenWithFacebook() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const client = await Client.findOne({
            name: 'MUHAMMAD NIDHIL',
            platform: 'instagram'
        }).sort({ _id: -1 });

        if (!client) {
            console.log('❌ Client not found');
            process.exit(1);
        }

        console.log('📊 Client Information:');
        console.log('Name:', client.name);
        console.log('Created:', client.createdAt);
        console.log('Token Expires At (DB):', client.tokenExpiresAt);

        const now = new Date();
        const expiresAt = client.tokenExpiresAt ? new Date(client.tokenExpiresAt) : null;
        if (expiresAt) {
            const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            console.log('Days Left (DB calculation):', daysLeft);
        }

        // Verify token with Facebook Debug Token API
        const appId = process.env.FACEBOOK_CLIENT_ID;
        const appSecret = process.env.FACEBOOK_CLIENT_SECRET;
        const token = client.pageAccessToken;

        if (!token) {
            console.log('\n❌ No page access token found');
            process.exit(1);
        }

        console.log('\n🔍 Verifying token with Facebook API...');
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;

        const response = await fetch(debugUrl);
        const data = await response.json();

        if (data.error) {
            console.log('❌ Facebook API Error:', data.error.message);
        } else if (data.data) {
            console.log('\n✅ Facebook Token Info:');
            console.log('Is Valid:', data.data.is_valid);
            console.log('App ID:', data.data.app_id);
            console.log('User ID:', data.data.user_id);
            console.log('Expires At (Unix):', data.data.expires_at);

            if (data.data.expires_at) {
                const fbExpiresAt = new Date(data.data.expires_at * 1000);
                console.log('Expires At (Date):', fbExpiresAt.toISOString());
                const fbDaysLeft = Math.ceil((fbExpiresAt - now) / (1000 * 60 * 60 * 24));
                console.log('Days Left (Facebook):', fbDaysLeft);

                console.log('\n📊 Comparison:');
                console.log('DB says expires:', expiresAt?.toISOString());
                console.log('Facebook says expires:', fbExpiresAt.toISOString());
                console.log('Match:', expiresAt?.getTime() === fbExpiresAt.getTime() ? '✅ YES' : '❌ NO');
            } else {
                console.log('Token Type:', data.data.type);
                console.log('Note: This might be a never-expiring token or page token');
            }

            if (data.data.error) {
                console.log('\n❌ Token Error:', data.data.error.message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

verifyTokenWithFacebook();
