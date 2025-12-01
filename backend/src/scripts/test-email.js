import { sendOtpEmail } from '../services/emailService.js';

async function testEmail() {
    console.log('Testing email sending...');
    try {
        const result = await sendOtpEmail('tech.haca@gmail.com', '123456', 'login');
        console.log('Email sent successfully:', result);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

testEmail();
