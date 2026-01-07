import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportServicePath = path.join(__dirname, 'src/services/reportService.js');
const base64Path = path.join(__dirname, 'temp_base64.txt');

try {
    const base64String = fs.readFileSync(base64Path, 'utf8').trim();
    let reportServiceContent = fs.readFileSync(reportServicePath, 'utf8');

    const oldUrl = 'https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png';
    const newSrc = `data:image/png;base64,${base64String}`;

    if (reportServiceContent.includes(oldUrl)) {
        reportServiceContent = reportServiceContent.replace(oldUrl, newSrc);
        fs.writeFileSync(reportServicePath, reportServiceContent, 'utf8');
        console.log('Successfully updated logo in reportService.js');
    } else {
        console.error('Target URL not found in reportService.js');
    }
} catch (error) {
    console.error('Error updating logo:', error);
}
