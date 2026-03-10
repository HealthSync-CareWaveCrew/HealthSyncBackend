import { generateOTP, saveOTP, verifyOTP, sendOTPEmail } from '../service/email.service.js';
import User from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import OTP from '../models/OTP.model.js'; 
import { OAuth2Client } from 'google-auth-library';

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// GOOGLE LOGIN
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    
    console.log('🔐 Google login attempt with credential');
    
    if (!credential) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google credential is required'
      });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    
    console.log('✅ Google token verified for:', email);

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      console.log('📝 Creating new user from Google account');
      user = await User.create({
        email,
        name,
        googleId,
        avatar: picture,
        isEmailVerified: true, // Google accounts are pre-verified
        provider: 'google',
        password: null // No password for Google users
      });
      console.log('✅ New user created:', user._id);
    } else {
      // Update existing user with Google info if not already linked
      if (!user.googleId) {
        console.log('🔄 Linking Google account to existing user');
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        user.isEmailVerified = true;
        user.provider = user.provider || 'google';
        await user.save();
      }
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        provider: user.provider
      }
    });

  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(401).json({
      status: 'fail',
      message: 'Google authentication failed: ' + error.message
    });
  }
};

// Send Registration OTP
export const sendRegistrationOTP = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'User already exists with this email'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP temporarily with user data
    await saveOTP(
      email,
      otp,
      'registration',
      { userData: { name, email, password } }
    );
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, 'registration');
    
    if (!emailResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email',
      expiresIn: '5 minutes'
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send OTP'
    });
  }
};

// Verify Registration OTP
export const verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    
    console.log('🔍 VERIFY REGISTRATION - Request:', { email, otp, name, password: password ? 'provided' : 'missing' });
    
    // Verify OTP from database
    const verification = await verifyOTP(email, otp, 'registration');
    console.log('✅ Verification result:', verification);
    
    if (!verification.valid) {
      return res.status(400).json({
        status: 'fail',
        message: verification.message
      });
    }
    
    // Get user data from verification data
    const userData = verification.data?.userData;
    console.log('👤 User data from OTP:', userData);
    
    // Use either the data from OTP or from request body
    const finalName = userData?.name || name;
    const finalPassword = userData?.password || password;
    
    if (!finalName || !finalPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'User data missing. Please register again.'
      });
    }
    
    // Create user in database
    console.log('📝 Creating user with:', { name: finalName, email });
    const user = await User.create({
      name: finalName,
      email: email,
      password: finalPassword,
      isEmailVerified: true,
      provider: 'local'
    });
    console.log('✅ User created:', user._id);
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider
      }
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Verification failed: ' + error.message
    });
  }
};

// Send Login OTP
export const sendLoginOTP = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);
    
    // Check if user exists - IMPORTANT: Need to select password explicitly
    const user = await User.findOne({ email }).select('+password');
    console.log('👤 User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials'
      });
    }

    // Check if user signed up with Google
    if (user.provider === 'google') {
      return res.status(400).json({
        status: 'fail',
        message: 'This account uses Google Sign-In. Please login with Google.'
      });
    }
    
    // Verify password
    console.log('🔑 Comparing passwords...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('✅ Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    console.log('🔢 Generated login OTP:', otp);
    
    // Save OTP
    await saveOTP(
      email,
      otp,
      'login',
      { userId: user._id }
    );
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, 'login');
    
    if (!emailResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email',
      expiresIn: '5 minutes'
    });
    
  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send OTP'
    });
  }
};

// Verify Login OTP
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log('🔍 VERIFY LOGIN - Request:', { email, otp });
    
    const verification = await verifyOTP(email, otp, 'login');
    
    console.log('✅ Verification result:', verification);
    
    if (!verification.valid) {
      return res.status(400).json({
        status: 'fail',
        message: verification.message
      });
    }
    
    // Get user ID from verification data
    const userId = verification.data?.userId;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User data not found. Please login again.'
      });
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider
      }
    });
    
  } catch (error) {
    console.error('❌ Verify login OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Verification failed: ' + error.message
    });
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with this email'
      });
    }

    // Check if user signed up with Google
    if (user.provider === 'google') {
      return res.status(400).json({
        status: 'fail',
        message: 'This account uses Google Sign-In. Password reset is not available.'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP
    await saveOTP(
      email,
      otp,
      'passwordReset',
      { userId: user._id }
    );
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, 'passwordReset');
    
    if (!emailResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset OTP sent to your email'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process request'
    });
  }
};

// Reset Password with OTP
export const resetPassword = async (req, res) => {
  try {
    console.log('🔍 RESET PASSWORD - Full Request Body:', req.body);
    const { email, otp, newPassword } = req.body;
    
    console.log('📧 Email:', email);
    console.log('🔑 OTP:', otp);
    console.log('🔐 New Password:', newPassword ? 'Provided' : 'Missing');

    // Validate required fields
    if (!email || !otp || !newPassword) {
      console.log('❌ Missing fields:', {
        email: !email,
        otp: !otp,
        newPassword: !newPassword
      });
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields: email, otp, and newPassword are required'
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'passwordReset');
    console.log('✅ Verification result:', verification);
    
    if (!verification.valid) {
      return res.status(400).json({
        status: 'fail',
        message: verification.message
      });
    }

    // Get user ID from verification data
    const userId = verification.data?.userId;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID not found in OTP data'
      });
    }

    // Find user and update password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete the OTP after successful reset
    await OTP.deleteOne({ _id: verification.data._id });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password: ' + error.message
    });
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'fail',
        message: 'No token provided'
      });
    }

    // Verify old token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Generate new token
    const newToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      token: newToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired token'
    });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    // In token-based auth, just send success response
    // Client will remove the token
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to logout'
    });
  }
};

// Get Current User Profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user profile'
    });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's a Google account
    if (email && email !== user.email && user.provider === 'google') {
      return res.status(400).json({
        status: 'fail',
        message: 'Email cannot be changed for Google accounts'
      });
    }
    
    if (name) user.name = name;
    if (email && user.provider !== 'google') user.email = email;
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        provider: user.provider
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is using Google auth
    if (user.provider === 'google') {
      return res.status(400).json({
        status: 'fail',
        message: 'Password change is not available for Google accounts'
      });
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
};