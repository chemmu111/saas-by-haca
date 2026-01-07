import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Client from '../src/models/Client.js';
import { updateClientStats } from '../src/services/analyticsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function forceSync() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const clientName = "Muhammed Midlaj M P";
        const client = await Client.findOne({ name: clientName });

        if (!client) {
            console.error(`Client "${clientName}" not found.`);
            process.exit(1);
        }

        console.log(`Found client: ${client.name} (${client._id})`);
        console.log(`Current stats: Followers=${client.followerCount}, Posts=${client.totalPosts}`);

        console.log('Force updating stats...');
        const stats = await updateClientStats(client);

        if (stats) {
            console.log('Stats updated successfully:');
            console.log(stats);

            // Update client in DB
            client.followerCount = stats.followerCount;
            client.totalPosts = stats.totalPosts;
            client.engagementRate = stats.engagementRate;
            client.statsLastUpdated = stats.statsLastUpdated;
            await client.save();
            console.log('Client saved with new stats.');
        } else {
            console.error('Failed to update stats (returned null).');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

forceSync();
