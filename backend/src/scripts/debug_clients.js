import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Client from '../models/Client.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function debugClients() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const clients = await Client.find({});
        const users = await User.find({});

        const output = {
            clients: clients.map(c => ({
                id: c._id.toString(),
                name: c.name,
                createdBy: c.createdBy.toString(),
                createdByType: typeof c.createdBy
            })),
            users: users.map(u => ({
                id: u._id.toString(),
                name: u.name,
                email: u.email
            }))
        };

        console.log(JSON.stringify(output, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugClients();
