
import mongoose from 'mongoose';
import { generateReportWithTemplate, generatePDFFromHTML } from './src/services/reportService.js';
import Client from './src/models/Client.js';
import User from './src/models/User.js';
import fs from 'fs';

// Mocking the route logic to ensure it behaves as expected
// We can't easily curl the local server if auth is complex without getting a token
// So we replicate the route logic: calling service with default template
const testRouteLogic = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find a user who has clients
        const client = await Client.findOne();
        if (!client) throw new Error('No clients in DB');

        const user = await User.findById(client.createdBy);
        if (!user) throw new Error('User for client not found');

        const clients = await Client.find({ createdBy: user._id });

        console.log('Simulating /download route logic...');
        // logic from route: templateName = undefined => 'professional-modern.html'
        const templateName = undefined;
        const templateToUse = templateName || 'professional-modern.html';

        console.log(`Using template: ${templateToUse}`);

        const reportWithHtml = await generateReportWithTemplate(user._id, [], clients, {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            templateName: templateToUse,
            format: 'html'
        });

        const pdfBuffer = await generatePDFFromHTML(reportWithHtml.html);

        fs.writeFileSync('test-download-modern.pdf', pdfBuffer);
        console.log('✅ Download simulation successful: test-download-modern.pdf');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

import dotenv from 'dotenv';
dotenv.config();
testRouteLogic();
