import nodemailer from 'nodemailer';

// Gmail configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tech.haca@gmail.com',
    pass: 'qhhb idgx qkmd mlil' // Gmail App Password
  }
});

/**
 * Send verification code email to admin
 * @param {string} email - Admin email address
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendVerificationEmail(email, verificationCode) {
  try {
    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: 'Admin Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Admin Login Verification</h2>
          <p>Hello Admin,</p>
          <p>You have requested to login to the admin panel. Please use the verification code below:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #8b5cf6; font-size: 32px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

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
    
    // Generate PDF attachment if template is provided
    let attachments = [];
    if (format === 'pdf') {
      if (pdfBuffer) {
        // Use pre-generated PDF buffer
        attachments.push({
          filename: `report-${clientName}-${reportDate}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      } else if (templateName) {
        // Try to generate PDF from template
        try {
          const { generatePDFFromTemplate } = await import('./reportService.js');
          // Note: This requires userId, posts, clients which we don't have here
          // So we'll skip PDF generation if pdfBuffer is not provided
          console.log('PDF buffer not provided, skipping PDF attachment');
        } catch (error) {
          console.error('Error generating PDF attachment:', error);
        }
      }
    } else if (report.html) {
      // Attach HTML report
      attachments.push({
        filename: `report-${clientName}-${reportDate}.html`,
        content: report.html,
        contentType: 'text/html'
      });
    }
    
    const mailOptions = {
      from: 'tech.haca@gmail.com',
      to: email,
      subject: `Social Media Report - ${reportDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Social Media Report</h2>
          <p>Hello ${clientName},</p>
          <p>Here's your social media management report for the period: <strong>${periodText}</strong></p>
          
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
          
          ${report.topClients && report.topClients.length > 0 ? `
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Top Clients</h3>
            <ul>
              ${report.topClients.map(client => 
                `<li>${client.clientName}: ${client.totalPosts} posts (${client.publishedPosts} published)</li>`
              ).join('')}
            </ul>
          </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">This is an automated report. For more details, please contact your social media manager.</p>
        </div>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMonthlyReportEmail,
  sendReportToClient,
  sendInstagramAspectRatioErrorEmail
};


