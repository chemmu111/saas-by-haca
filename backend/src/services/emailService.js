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

export default {
  sendVerificationEmail,
  sendPasswordResetEmail
};


