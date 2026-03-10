import nodemailer from 'nodemailer';
import OTP from '../models/OTP.model.js';

// Create transporter with explicit SMTP settings
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',     // Gmail SMTP server [citation:1][citation:2]
  port: 587,                   // TLS port (recommended) [citation:1][citation:5]
  secure: false,               // false for port 587, true for port 465
  auth: {
    user: process.env.EMAIL_USER,  // Your Gmail address (poojaofficial2121@gmail.com)
    pass: process.env.EMAIL_PASS,  // Your 16-character app password
  },
  tls: {
    rejectUnauthorized: false, // Only for development - helps with connection issues
  },
  // Optional: Add connection timeout
  connectionTimeout: 10000,    // 10 seconds
});

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
    console.log('Please check:');
    console.log('1. EMAIL_USER is set to:', process.env.EMAIL_USER);
    console.log('2. EMAIL_PASS is set (should be 16 chars)');
    console.log('3. App password is correct (no spaces)');
    console.log('4. 2-Step Verification is enabled on your Google account');
  } else {
    console.log('✅ SMTP server ready to send emails');
  }
});

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to database with expiry (5 minutes)
// Save OTP to database with expiry (5 minutes)
// Save OTP to database with expiry (5 minutes)
export const saveOTP = async (email, otp, type, data = {}) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  console.log('💾 Saving OTP with data:', { email, otp, type, data });
  
  // Delete any existing OTPs for this email and type
  await OTP.deleteMany({ email, type, verified: false });
  
  // Create new OTP - IMPORTANT: Store userData directly in the document
  const otpRecord = await OTP.create({
    email,
    otp,
    type,
    expiresAt,
    // Store userData as a field in the document
    userData: data.userData || null,  // Add this line!
    userId: data.userId || null       // Add this for login OTPs
  });
  
  console.log('✅ OTP saved:', otpRecord);
  return otpRecord;
};

// Verify OTP from database
export const verifyOTP = async (email, enteredOtp, type) => {
  console.log('🔎 VERIFY OTP - Input:', { email, enteredOtp, type });
  
  // Find valid OTP
  const otpRecord = await OTP.findOne({
    email,
    otp: enteredOtp,
    type,
    verified: false,
    expiresAt: { $gt: new Date() }
  });
  
  console.log('📊 Found OTP record:', otpRecord);
  
  if (!otpRecord) {
    // Check if OTP exists but expired
    const expiredOTP = await OTP.findOne({
      email,
      otp: enteredOtp,
      type,
      verified: false
    });
    
    if (expiredOTP) {
      return { valid: false, message: 'OTP has expired' };
    }
    
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // Check attempts
  if (otpRecord.attempts >= 3) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return { valid: false, message: 'Too many failed attempts. Please request new OTP.' };
  }
  
  // Mark as verified
  otpRecord.verified = true;
  await otpRecord.save();
  
  return { 
    valid: true, 
    message: 'OTP verified successfully',
    data: {
      userData: otpRecord.userData,  // This will now be available!
      userId: otpRecord.userId,
      email: otpRecord.email,
      type: otpRecord.type
    }
  };
};

// Send OTP email
// Send OTP email - add data parameter
export const sendOTPEmail = async (email, otp, type = 'verification', data = {}) => {
  let subject, html;
  
  const appName = 'HealthSync';
  const currentYear = new Date().getFullYear();
  
  // Create email template based on type
  switch(type) {
    case 'registration':
      subject = `Welcome to ${appName} - Verify Your Email`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f8;">
          <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email Verification</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Hello!</h2>
              <p style="color: #666; line-height: 1.6;">Thank you for registering with ${appName}. Please use the following verification code to complete your registration:</p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
                <h1 style="font-size: 48px; letter-spacing: 8px; color: white; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
              
              <p style="color: #666; line-height: 1.6;">This code will expire in <strong>5 minutes</strong>.</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #4f46e5; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #666; margin: 0; font-size: 14px;">
                  <strong>⚠️ Security Tip:</strong> Never share this OTP with anyone. Our team will never ask for your verification code.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">© ${currentYear} ${appName}. All rights reserved.</p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
      
    case 'login':
      subject = `${appName} - Login Verification Code`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f8;">
          <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Login Verification</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Login Request</h2>
              <p style="color: #666; line-height: 1.6;">We received a login request for your ${appName} account. Use this code to complete your login:</p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
                <h1 style="font-size: 48px; letter-spacing: 8px; color: white; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
              
              <p style="color: #666; line-height: 1.6;">This code will expire in <strong>5 minutes</strong>.</p>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>⚠️ Didn't request this?</strong> If you didn't attempt to login, please secure your account immediately.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">© ${currentYear} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
      
    case 'passwordReset':
      subject = `${appName} - Password Reset Request`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f8;">
          <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Reset Your Password</h2>
              <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Use this code to proceed:</p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
                <h1 style="font-size: 48px; letter-spacing: 8px; color: white; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
              
              <p style="color: #666; line-height: 1.6;">This code will expire in <strong>5 minutes</strong>.</p>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #0a58ca; margin: 0; font-size: 14px;">
                  <strong>🔐 Secure Reset:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">© ${currentYear} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'email-change':
      subject = `${appName} - Verify Your New Email`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Change Verification</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f8;">
          <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email Change Verification</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Verify Your New Email</h2>
              <p style="color: #666; line-height: 1.6;">You requested to change your email address to this one. Use the following verification code to confirm:</p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
                <h1 style="font-size: 48px; letter-spacing: 8px; color: white; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
              
              <p style="color: #666; line-height: 1.6;">This code will expire in <strong>5 minutes</strong>.</p>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #0a58ca; margin: 0; font-size: 14px;">
                  <strong>🔐 Important:</strong> If you didn't request this email change, please secure your account immediately.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 14px; margin: 5px 0;">© ${currentYear} ${appName}. All rights reserved.</p>
              <p style="color: #999; font-size: 12px; margin: 5px 0;">Your old email: ${data?.oldEmail || 'Not provided'}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      break;
      
    default:
      subject = `${appName} - Verification Code`;
      html = `Your verification code is: ${otp}`;
  }
  
  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};