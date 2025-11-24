import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/Client.js';

dotenv.config();

async function verifyToken() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const clients = await Client.find({ platform: 'instagram' });
        console.log(`Found ${clients.length} Instagram clients.`);

        clients.forEach(c => {
            console.log(`Client: ${c.name}`);
            console.log(`Token starts with: ${c.pageAccessToken.substring(0, 20)}...`);
            console.log(`Token ends with: ...${c.pageAccessToken.substring(c.pageAccessToken.length - 20)}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyToken();
