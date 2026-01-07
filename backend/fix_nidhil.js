import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/Client.js';
dotenv.config();

async function fixClient() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const r = await Client.updateOne(
            { name: /Nidhil/i },
            { $set: { totalPosts: 53, followerCount: 83 } }
        );
        console.log('RESULT:Modified:' + r.modifiedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixClient();
