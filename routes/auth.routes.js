import express from 'express';
const router = express.Router();
import { 
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendLoginOTP,
  verifyLoginOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} from '../controller/auth.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';

// Validation rules
const validateEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
];

const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
];

const validatePasswordReset = [
  body('newPassword')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Registration flow with OTP
router.post('/send-registration-otp', validateRegistration, sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Login flow with OTP
router.post('/send-login-otp', validateLogin, sendLoginOTP);
router.post('/verify-login-otp', verifyLoginOTP);

// Password reset with OTP
router.post('/forgot-password', validateEmail, forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);

// Token management
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;