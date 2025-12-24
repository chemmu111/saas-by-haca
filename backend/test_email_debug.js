
import nodemailer from 'nodemailer';

async function testEmail() {
    const user = 'tech.haca@gmail.com';
    const pass = 'qhhb idgx qkmd mlil'; // The hardcoded password from emailService.js

    console.log(`Testing email with User: ${user}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `Test <${user}>`,
            to: 'nidhiljabbar@gmail.com', // Using the email seen in the screenshot
            subject: 'Test Email from Debug Script',
            text: 'If you receive this, the hardcoded credentials are working.'
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
    }
}

testEmail();
