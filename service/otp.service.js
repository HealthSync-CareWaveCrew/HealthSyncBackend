const otpGenerator = require('otp-generator');
const OTP = require('../models/OTP.model');
const crypto = require('crypto');

class OTPService {
  constructor() {
    this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    this.otpExpireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
  }

  generateOTP() {
    return otpGenerator.generate(this.otpLength, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });
  }

  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  async createOTP(email, type) {
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type, verified: false });

    // Generate new OTP
    const otp = this.generateOTP();
    const hashedOTP = this.hashOTP(otp);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpireMinutes);

    await OTP.create({
      email,
      otp: hashedOTP,
      type,
      expiresAt
    });

    return otp; // Return plain OTP for sending via email
  }

  async verifyOTP(email, otp, type) {
    const hashedOTP = this.hashOTP(otp);
    
    const otpRecord = await OTP.findOne({
      email,
      otp: hashedOTP,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    // Increment attempts
    otpRecord.attempts += 1;
    
    if (otpRecord.attempts > 3) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { success: false, message: 'Too many failed attempts. Please request new OTP.' };
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Delete all OTPs for this email and type
    await OTP.deleteMany({ email, type });

    return { success: true, message: 'OTP verified successfully' };
  }

  async cleanupOTP(email, type) {
    await OTP.deleteMany({ email, type });
  }
}

module.exports = new OTPService();