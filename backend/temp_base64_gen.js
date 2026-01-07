import fs from 'fs';
try {
    const buffer = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/00173b27-8c58-4072-8d8e-d503634198d5/uploaded_image_1764829410683.png');
    fs.writeFileSync('temp_base64.txt', buffer.toString('base64'), 'utf8');
} catch (error) {
    console.error('Error:', error);
}
