
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReportData } from './src/services/reportGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testReport() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const clientId = '691d9b9eed495f6429a167e5'; // Correct ID
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        console.log('Generating report...');
        const data = await generateReportData(clientId, startDate, endDate);
        console.log('Report generated successfully');
        console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
    } catch (error) {
        console.error('ERROR GENERATING REPORT:');
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

testReport();
