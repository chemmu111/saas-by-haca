import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Email provider configuration
// Default to 'resend' if API key is present, otherwise 'gmail'
const validProviders = ['gmail', 'resend'];
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'gmail');

// Resend configuration
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Gmail configuration (fallback)
const EMAIL_USER = process.env.EMAIL_USER || 'tech.haca@gmail.com';
const EMAIL_PASS = process.env.EMAIL_APP_PASSWORD || 'qhhb idgx qkmd mlil';

// Gmail transporter
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Default from email: Resend requires a verified domain or uses onboarding@resend.dev for testing
// Gmail uses the authenticated user
const FROM_EMAIL = process.env.EMAIL_FROM || (EMAIL_PROVIDER === 'resend' ? 'onboarding@resend.dev' : EMAIL_USER);

/**
 * Universal email sender - supports Gmail and Resend
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  try {
    console.log(`📧 Sending email via ${EMAIL_PROVIDER.toUpperCase()}...`);

    if (EMAIL_PROVIDER === 'resend') {
      if (!resend) throw new Error('Resend API Key is missing');

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content
        }))
      });

      if (error) {
        console.error('❌ Resend Error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Email sent via Resend:', data.id);
      return { success: true, messageId: data.id, provider: 'resend' };
    }

    // Fallback to Gmail
    else {
      const mailOptions = {
        from: `Social X <${FROM_EMAIL}>`, // Enhance from field for Gmail
        to: to,
        subject: subject,
        html: html,
        attachments: attachments
      };

      const info = await gmailTransporter.sendMail(mailOptions);
      console.log('✅ Email sent via Gmail:', info.messageId);
      return { success: true, messageId: info.messageId, provider: 'gmail' };
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

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
      subject = 'Verify Your Account - Social X';
      title = 'Verify Your Email';
      message = 'Welcome to Social X! Please verify your email address to complete your registration:';
    } else if (type === 'reset') {
      subject = 'Password Reset Code - Social X';
      title = 'Reset Password';
      message = 'You requested to reset your password. Use the code below to proceed:';
    } else if (type === 'login') {
      subject = 'Login Verification Code - Social X';
      title = 'Login Verification';
      message = 'You requested to login. Please use the verification code below:';
    }

    const html = `
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
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© Social X - Social Media Management Platform</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html });
    console.log(`OTP email sent (${type}):`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

// Keep the old function for backward compatibility if needed, but alias it
export const sendVerificationEmail = (email, code) => sendOtpEmail(email, code, 'login');

/**
 * Send monthly report email
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

    const html = `
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
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">This is an automated monthly report.</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Monthly Social Media Report - ${reportDate}`,
      html
    });
    console.log('Monthly report email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending monthly report email:', error);
    throw new Error('Failed to send monthly report email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  try {
    const html = `
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
        <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px;">© Social X - Social Media Management Platform</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: 'Reset Your Password - Social X',
      html
    });
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send report to client via email
 */
export async function sendReportToClient(email, clientName, report, templateName = null, format = 'pdf', pdfBuffer = null, additionalRecipients = []) {
  try {
    let reportDate;
    try {
      reportDate = new Date(report.generatedAt || new Date()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    const periodText = report.period.startDate && report.period.endDate
      ? `${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()}`
      : 'All Time';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
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
            Best regards,<br>
            <strong>Your Social Media Team</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #cccccc; margin: 30px 0 20px 0;">
          <p style="color: #666666; font-size: 12px; margin: 5px 0;">
            © ${new Date().getFullYear()} Social X. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    // Generate PDF attachment for Gmail only
    let attachments = [];
    if (EMAIL_PROVIDER === 'gmail' && format === 'pdf' && pdfBuffer) {
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      if (buffer.length > 0) {
        attachments.push({
          filename: `Social-Media-Report-${reportDate.replace(/\s/g, '-')}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        });
      }
    }

    // Combine primary email with additional recipients and filter out falsy values
    const to = [email, ...(additionalRecipients || [])].filter(e => e && e.trim());

    if (to.length === 0) {
      throw new Error('No valid recipients provided');
    }

    const result = await sendEmail({
      to: to,
      subject: `Social Media Performance Report - ${reportDate}`,
      html,
      attachments
    });
    console.log('Report email sent to client:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending report to client:', error);
    throw new Error('Failed to send report to client');
  }
}

/**
 * Send Instagram aspect ratio error email
 */
export async function sendInstagramAspectRatioErrorEmail(email, userName, errorMessage, mediaUrl, postType = 'post') {
  try {
    const postTypeName = postType === 'story' ? 'Story' : postType === 'reel' ? 'Reel' : 'Post';
    const formattedErrorMessage = errorMessage.replace(/\n/g, '<br>');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ Instagram ${postTypeName} Rejected</h2>
        <p style="color: #374151; line-height: 1.6;">Hello ${userName || 'User'},</p>
        <p style="color: #374151; line-height: 1.6;">Your Instagram ${postTypeName.toLowerCase()} was rejected due to an invalid aspect ratio.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #991b1b; margin-top: 0;">Error Details</h3>
          <p style="color: #7f1d1d; line-height: 1.6; white-space: pre-line;">${formattedErrorMessage}</p>
          ${mediaUrl ? `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;"><strong>Media URL:</strong> <a href="${mediaUrl}" style="color: #6366f1; word-break: break-all;">${mediaUrl}</a></p>` : ''}
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px;">© Social X - Social Media Management Platform</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Instagram ${postTypeName} Rejected - Invalid Aspect Ratio`,
      html
    });
    console.log('Instagram aspect ratio error email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
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
