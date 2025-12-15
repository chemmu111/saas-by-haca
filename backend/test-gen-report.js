
import mongoose from 'mongoose';
import { generateReportWithTemplate, generatePDFFromHTML } from './src/services/reportService.js';
import Client from './src/models/Client.js';
import User from './src/models/User.js';
import fs from 'fs';
import path from 'path';

// Load env
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const client = await Client.findOne();
        if (!client) {
            console.error('No clients found to test report.');
            process.exit(1);
        }
        console.log('Testing with client:', client.name);

        const user = await User.findOne();
        if (!user) {
            console.error('No user found');
            process.exit(1);
        }

        console.log('Generating HTML Report...');
        const reportWithHtml = await generateReportWithTemplate(user._id, [], [client], {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            templateName: 'professional-modern.html',
            format: 'html'
        });

        console.log('Converting HTML to PDF...');
        const pdfBuffer = await generatePDFFromHTML(reportWithHtml.html);

        fs.writeFileSync('test-report-modern.pdf', pdfBuffer);
        console.log('✅ PDF generated successfully: test-report-modern.pdf');

    } catch (err) {
        console.error('❌ Error details:');
        console.error(err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await mongoose.disconnect();
    }
};

run();
