import mongoose from 'mongoose';
import Client from './src/models/Client.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupDuplicateClients() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all MUHAMMAD NIDHIL Instagram clients
        const clients = await Client.find({
            name: 'MUHAMMAD NIDHIL',
            platform: 'instagram'
        }).sort({ _id: -1 }); // Sort by newest first

        console.log(`Found ${clients.length} client(s) with name "MUHAMMAD NIDHIL"\n`);

        if (clients.length <= 1) {
            console.log('No duplicates found. Exiting...');
            process.exit(0);
        }

        // Keep the newest one, delete the rest
        const newestClient = clients[0];
        const oldClients = clients.slice(1);

        console.log('📌 KEEPING (Newest):');
        console.log(`  ID: ${newestClient._id}`);
        console.log(`  Created: ${newestClient.createdAt}`);
        console.log(`  Token Expires: ${newestClient.tokenExpiresAt}`);
        console.log(`  IG User ID: ${newestClient.igUserId}\n`);

        console.log(`🗑️  DELETING ${oldClients.length} old client(s):\n`);

        for (const oldClient of oldClients) {
            console.log(`  - ID: ${oldClient._id}`);
            console.log(`    Created: ${oldClient.createdAt}`);
            console.log(`    Token Expires: ${oldClient.tokenExpiresAt}`);
            await Client.deleteOne({ _id: oldClient._id });
            console.log(`    ✅ Deleted\n`);
        }

        console.log('✅ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanupDuplicateClients();
