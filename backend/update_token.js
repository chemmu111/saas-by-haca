import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/Client.js';

dotenv.config();

const newToken = 'EAAf0p4LmEfQBQO1JH9yFDZCIXBucWf4Cz7kZAZBuanAj6faNkL0LmkZAhNUSJnZB2vZBWiro5rYl283UPDIS0SON5NtFAKFmtoIP2HH0dufWGZB27z9aSZBc5ERsP4qjSUZCIvrcMZB1y2hCTRZCw4nH0YkvOmv5yjqugqZCjC54b0UUZBIfwZABebVxpfxziTjdfMd0tE8uKFJO8kcC8j3tVQMddnBD8IrL2KNYFi2wZDZD';

async function updateToken() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const clients = await Client.find({});
        console.log(`Found ${clients.length} clients`);

        if (clients.length === 0) {
            console.log('No clients found.');
            return;
        }

        if (clients.length === 1) {
            const client = clients[0];
            console.log(`Updating token for client: ${client.name} (${client._id})`);
            client.pageAccessToken = newToken;
            await client.save();
            console.log('Token updated successfully.');
        } else {
            console.log('Multiple clients found:');
            clients.forEach((c, i) => {
                console.log(`${i + 1}. ${c.name} (${c._id}) - Platform: ${c.platform}`);
            });

            // For now, if there are multiple, I'll just update the first Instagram one or ask.
            // But let's see the output first.
            const instagramClients = clients.filter(c => c.platform === 'instagram');
            if (instagramClients.length === 1) {
                const client = instagramClients[0];
                console.log(`Updating token for Instagram client: ${client.name} (${client._id})`);
                client.pageAccessToken = newToken;
                await client.save();
                console.log('Token updated successfully.');
            } else {
                console.log('Please specify which client to update.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateToken();
