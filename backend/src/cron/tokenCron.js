import cron from 'node-cron';
import Client from '../models/Client.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';

// Gmail configuration (reuse from emailService)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tech.haca@gmail.com',
        pass: 'qhhb idgx qkmd mlil' // Gmail App Password
    }
});

/**
 * Send token expiry alert email
 * @param {string} email - User email
 * @param {string} userName - User name
 * @param {string} clientName - Client name
 * @param {number} daysLeft - Days until expiration
 * @param {string} reconnectUrl - URL to reconnect Instagram
 */
async function sendTokenExpiryAlert(email, userName, clientName, daysLeft, reconnectUrl) {
    try {
        const subject = daysLeft <= 0
            ? `⚠️ Instagram Token EXPIRED – ${clientName}`
            : `⚠️ Instagram Token Expiry Alert – ${clientName}`;

        const bodyMessage = daysLeft <= 0
            ? `Your Instagram token for <strong>${clientName}</strong> has <strong>EXPIRED</strong>.`
            : `Your Instagram token for <strong>${clientName}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.`;

        const mailOptions = {
            from: 'tech.haca@gmail.com',
            to: email,
            subject: subject,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ Instagram Token ${daysLeft <= 0 ? 'Expired' : 'Expiring Soon'}</h2>
          <p style="color: #374151; line-height: 1.6;">Hello ${userName},</p>
          <p style="color: #374151; line-height: 1.6;">${bodyMessage}</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">Action Required</h3>
            <p style="color: #7f1d1d; line-height: 1.6;">
              ${daysLeft <= 0
                    ? 'Your token has expired. You must reconnect your Instagram account to continue posting.'
                    : 'Please reconnect your Instagram account before the token expires to avoid service interruption.'}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reconnectUrl}" style="display: inline-block; background: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reconnect Instagram
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
          <p style="color: #6366f1; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${reconnectUrl}</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated alert. Please do not reply.</p>
          <p style="color: #9ca3af; font-size: 12px;">© Haris&Co. - Social Media Management Platform</p>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Token expiry alert sent for ${clientName}:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending token expiry alert:', error);
        throw error;
    }
}

/**
 * Check all Instagram tokens and send alerts
 */
async function checkTokensAndSendAlerts() {
    try {
        console.log('🔍 Starting token expiry check...');

        // Find all Instagram clients with tokens
        const clients = await Client.find({
            platform: 'instagram',
            pageAccessToken: { $exists: true, $ne: null }
        }).populate('createdBy', 'email name');

        console.log(`📊 Found ${clients.length} Instagram clients to check`);

        for (const client of clients) {
            try {
                // Skip if no expiration date
                if (!client.tokenExpiresAt) {
                    console.log(`⚠️ Skipping ${client.name} - no expiration date`);
                    continue;
                }

                // Calculate days until expiration
                const now = new Date();
                const expiresAt = new Date(client.tokenExpiresAt);
                const diffTime = expiresAt - now;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`📅 ${client.name}: ${daysLeft} days left`);

                // Check if we should send an alert
                const shouldAlert = daysLeft === 7 || daysLeft === 3 || daysLeft === 1 || daysLeft <= 0;

                if (shouldAlert) {
                    // Get user email
                    const userEmail = client.createdBy?.email;
                    const userName = client.createdBy?.name || 'User';

                    if (!userEmail) {
                        console.log(`⚠️ No email found for client ${client.name}`);
                        continue;
                    }

                    // Generate reconnect URL
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
                    const reconnectUrl = `${frontendUrl}/dashboard/clients`;

                    // Send alert
                    await sendTokenExpiryAlert(userEmail, userName, client.name, daysLeft, reconnectUrl);
                    console.log(`✅ Alert sent for ${client.name} (${daysLeft} days left)`);
                }
            } catch (error) {
                console.error(`❌ Error processing client ${client.name}:`, error);
                // Continue with next client
            }
        }

        console.log('✅ Token expiry check completed');
    } catch (error) {
        console.error('❌ Error in token expiry check:', error);
    }
}

/**
 * Initialize the token monitoring cron job
 * Runs every day at 12:00 AM
 */
export function initTokenMonitoringCron() {
    // Schedule: Run at 12:00 AM every day
    // Format: second minute hour day month weekday
    cron.schedule('0 0 0 * * *', async () => {
        console.log('⏰ Token monitoring cron job triggered');
        await checkTokensAndSendAlerts();
    }, {
        timezone: "Asia/Kolkata" // Adjust to your timezone
    });

    console.log('✅ Token monitoring cron job initialized (runs daily at 12:00 AM)');
}

// Export for manual testing
export { checkTokensAndSendAlerts };
