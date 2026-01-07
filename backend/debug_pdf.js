
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReportWithTemplate } from './src/services/reportService.js';
import Client from './src/models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testPDF() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const clientId = '691d9b9eed495f6429a167e5';
        const client = await Client.findById(clientId);

        if (!client) {
            console.error('Client not found!');
            return;
        }

        const clients = [client];

        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        console.log('Generating HTML report...');
        const result = await generateReportWithTemplate(null, [], clients, { startDate, endDate });

        if (result.html && result.html.includes('<!DOCTYPE html>')) {
            console.log('HTML Report Generated Successfully');
            console.log('HTML Length:', result.html.length);
        } else {
            console.log('HTML Generation Failed');
        }

    } catch (error) {
        console.error('ERROR GENERATING PDF/HTML:');
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

testPDF();
