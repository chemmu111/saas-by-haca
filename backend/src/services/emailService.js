import nodemailer from 'nodemailer';

// Gmail configuration - Use environment variables for production
const EMAIL_USER = process.env.EMAIL_USER || 'tech.haca@gmail.com';
const EMAIL_PASS = process.env.EMAIL_APP_PASSWORD || 'qhhb idgx qkmd mlil';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

/**
 * Send OTP email for various purposes
 * @param {string} email - Recipient email
 * @param {string} code - OTP code
 * @param {string} type - Type of OTP (signup, login, reset)
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendOtpEmail(email, code, type = 'login') {
  try {
    let subject = 'Verification Code';
    let title = 'Verification Code';
    let message = 'Please use the verification code below:';

    if (type === 'signup') {
      subject = 'Verify Your Account - Haris&Co.';
      title = 'Verify Your Email';
      message = 'Welcome to Haris&Co.! Please verify your email address to complete your registration:';
    } else if (type === 'reset') {
      subject = 'Password Reset Code - Haris&Co.';
      title = 'Reset Password';
      message = 'You requested to reset your password. Use the code below to proceed:';
    } else if (type === 'login') {
      subject = 'Login Verification Code - Haris&Co.';
      title = 'Login Verification';
      message = 'You requested to login. Please use the verification code below:';
    }

    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5; text-align: center;">${title}</h2>
          <p style="color: #374151; font-size: 16px;">Hello,</p>
          <p style="color: #374151; font-size: 16px;">${message}</p>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
            <h1 style="color: #8b5cf6; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">If you didn't request this code, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">© Haris&Co. - Social Media Management Platform</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent (${type}):`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

// Keep the old function for backward compatibility if needed, but alias it
export const sendVerificationEmail = (email, code) => sendOtpEmail(email, code, 'login');

/**
 * Send monthly report email
 * @param {string} email - User email address
 * @param {string} userName - User name
 * @param {Object} report - Report data
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendMonthlyReportEmail(email, userName, report, templateName = null, format = 'pdf') {
  try {
    const reportDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const periodText = report.period.startDate && report.period.endDate
      ? `${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()}`
      : 'All Time';

    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: `Monthly Social Media Report - ${reportDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Monthly Social Media Report</h2>
          <p>Hello ${userName},</p>
          <p>Here's your monthly social media management report for the period: <strong>${periodText}</strong></p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Posts:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${report.summary.totalPosts}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Published:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${report.summary.publishedPosts}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Scheduled:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${report.summary.scheduledPosts}</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Success Rate:</strong></td>
                <td style="padding: 8px;">${report.summary.successRate}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Platform Breakdown</h3>
            <p>Instagram: ${report.breakdown.byPlatform.instagram} posts</p>
            <p>Facebook: ${report.breakdown.byPlatform.facebook} posts</p>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Top Clients</h3>
            <ul>
              ${report.topClients.map(client =>
        `<li>${client.clientName}: ${client.totalPosts} posts (${client.publishedPosts} published)</li>`
      ).join('')}
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated monthly report. For more details, please visit your dashboard.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Monthly report email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending monthly report email:', error);
    throw new Error('Failed to send monthly report email');
  }
}

/**
 * Send password reset email
 * @param {string} email - User email address
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full URL for password reset
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  try {
    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: 'Reset Your Password - Haris&Co.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
          <p style="color: #374151; line-height: 1.6;">Hello,</p>
          <p style="color: #374151; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
          <p style="color: #6366f1; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${resetUrl}</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated email. Please do not reply.</p>
          <p style="color: #9ca3af; font-size: 12px;">© Haris&Co. - Social Media Management Platform</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send report to client via email
 * @param {string} email - Client email address
 * @param {string} clientName - Client name
 * @param {Object} report - Report data
 * @param {string} templateName - Optional template name
 * @param {string} format - Report format (pdf, html)
 * @param {Buffer} pdfBuffer - Optional PDF buffer (pre-generated)
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendReportToClient(email, clientName, report, templateName = null, format = 'pdf', pdfBuffer = null) {
  try {
    const reportDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const periodText = report.period.startDate && report.period.endDate
      ? `${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()}`
      : 'All Time';

    // Generate PDF attachment
    let attachments = [];
    if (format === 'pdf' && pdfBuffer) {
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

      if (buffer.length > 0) {
        attachments.push({
          filename: `Social-Media-Report-${reportDate.replace(/\s/g, '-')}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        });
      } else {
        console.warn('PDF buffer is empty, skipping attachment');
      }
    }

    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: `Social Media Performance Report - ${reportDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
            <h2 style="color: #000000; font-size: 20px; margin-bottom: 20px;">Performance Report</h2>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 10px 0;">
              <strong>Period:</strong> ${periodText}
            </p>
            <hr style="border: none; border-top: 1px solid #cccccc; margin: 20px 0;">
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 15px 0;">
              Hello <strong>${clientName}</strong>,
            </p>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 15px 0;">
              Your comprehensive social media performance report for <strong>${periodText}</strong> is ready.
            </p>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 15px 0;">
              Please find the detailed PDF report attached to this email. The report includes:
            </p>
            <ul style="color: #000000; font-size: 14px; line-height: 1.8; margin: 15px 0; padding-left: 20px;">
              <li>Complete performance metrics and analytics</li>
              <li>Platform-wise breakdown (Instagram & Facebook)</li>
              <li>Post performance statistics</li>
              <li>Success rate and engagement data</li>
            </ul>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 15px 0;">
              <strong>Attachment:</strong> Social-Media-Report-${reportDate.replace(/\s/g, '-')}.pdf
            </p>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 15px 0;">
              If you have any questions about your report, please don't hesitate to reach out.
            </p>
            <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 25px 0 10px 0;">
              Best regards,<br>
              <strong>Your Social Media Team</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #cccccc; margin: 30px 0 20px 0;">
            <p style="color: #666666; font-size: 12px; line-height: 1.4; margin: 5px 0;">
              This is an automated report generated by your social media management team.
            </p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">
              © ${new Date().getFullYear()} Haris&Co. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Report email sent to client:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending report to client:', error);
    throw new Error('Failed to send report to client');
  }
}

/**
 * Send Instagram aspect ratio error email to user
 * @param {string} email - User email address
 * @param {string} userName - User name
 * @param {string} errorMessage - Detailed error message
 * @param {string} mediaUrl - URL of the media that failed
 * @param {string} postType - Type of post: 'post', 'story', or 'reel'
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendInstagramAspectRatioErrorEmail(email, userName, errorMessage, mediaUrl, postType = 'post') {
  try {
    const postTypeName = postType === 'story' ? 'Story' : postType === 'reel' ? 'Reel' : 'Post';

    // Format error message for email (replace newlines with HTML breaks)
    const formattedErrorMessage = errorMessage.replace(/\n/g, '<br>');

    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: `Instagram ${postTypeName} Rejected - Invalid Aspect Ratio`,
      html: `
    < div style = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;" >
          <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ Instagram ${postTypeName} Rejected</h2>
          <p style="color: #374151; line-height: 1.6;">Hello ${userName || 'User'},</p>
          <p style="color: #374151; line-height: 1.6;">Your Instagram ${postTypeName.toLowerCase()} was rejected due to an invalid aspect ratio.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">Error Details</h3>
            <p style="color: #7f1d1d; line-height: 1.6; white-space: pre-line;">${formattedErrorMessage}</p>
            ${mediaUrl ? `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;"><strong>Media URL:</strong> <a href="${mediaUrl}" style="color: #6366f1; word-break: break-all;">${mediaUrl}</a></p>` : ''}
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Instagram Requirements</h3>
            ${postType === 'story' ? `
              <ul style="color: #374151; line-height: 1.8;">
                <li><strong>Stories:</strong> Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)</li>
                <li>Maximum 15 seconds for video stories</li>
              </ul>
            ` : postType === 'reel' ? `
              <ul style="color: #374151; line-height: 1.8;">
                <li><strong>Reels:</strong> Must be 9:16 aspect ratio (vertical, 1080x1920px recommended)</li>
                <li>Maximum 90 seconds for video reels</li>
                <li>Must be a video file</li>
              </ul>
            ` : `
              <ul style="color: #374151; line-height: 1.8;">
                <li><strong>Regular Posts:</strong> Aspect ratio must be between 0.8 and 1.91</li>
                <li>Examples: 4:5 portrait, 1:1 square, 1.91:1 landscape</li>
                <li>Minimum dimensions: 600x315px for landscape, 600x750px for portrait</li>
              </ul>
            `}
          </div>
          
          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What to do next?</h3>
            <ol style="color: #374151; line-height: 1.8;">
              <li>Use an image editor to crop/resize your image to meet Instagram's requirements</li>
              <li>Check the aspect ratio before uploading</li>
              <li>Re-upload the corrected image and try posting again</li>
            </ol>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated notification. Please do not reply.</p>
          <p style="color: #9ca3af; font-size: 12px;">© Haris&Co. - Social Media Management Platform</p>
        </div>
  `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Instagram aspect ratio error email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending Instagram aspect ratio error email:', error);
    throw new Error('Failed to send Instagram aspect ratio error email');
  }
}

export default {
  sendOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMonthlyReportEmail,
  sendReportToClient,
  sendInstagramAspectRatioErrorEmail
};


