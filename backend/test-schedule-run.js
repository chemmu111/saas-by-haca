
import mongoose from 'mongoose';
import { processSchedule } from './src/cron/reportCron.js';
import Client from './src/models/Client.js';
import User from './src/models/User.js';

// Load env
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const client = await Client.findOne();
        if (!client) throw new Error('No clients found');

        const user = await User.findById(client.createdBy);
        if (!user) throw new Error('User not found');

        console.log('Simulating Schedule Run (templateId=null)...');

        // Mock Schedule Object
        const mockSchedule = {
            _id: 'test_schedule_123',
            client: client,
            createdBy: user,
            interval: 'monthly',
            templateId: null, // intentionally null to trigger default
            format: 'pdf',
            emailRecipients: ['test@example.com'],
            sendToClient: false,
            isActive: true,
            nextRun: new Date(),
            save: async () => { console.log('Mock Schedule Saved'); }
        };

        await processSchedule(mockSchedule);

        console.log('✅ Simulation completed. Check logs for PDF generation messages.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
