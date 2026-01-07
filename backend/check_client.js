
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/Client.js';

dotenv.config();

async function checkClient() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const client = await Client.findOne({ name: /Nidhil/i });
        if (client) {
            console.log('RESULT:' + client._id.toString() + '|' + client.igUserId);
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

checkClient();
