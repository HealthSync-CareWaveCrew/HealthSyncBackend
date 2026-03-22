import express from 'express';
const router = express.Router();
import * as userController from '../controller/user.controller.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { subscribe } from '../controller/subscriber.controller.js';

// All user routes require authentication
router.use(protect);

// User profile routes
router.get('/me', userController.getMe);
router.patch('/update-profile', userController.updateProfile);
router.patch('/change-password', userController.changePassword);
router.delete('/delete-account', userController.deleteAccount);

// Email change routes - Add these new routes
router.post('/send-email-change-otp', userController.sendEmailChangeOTP);
router.post('/verify-email-change-otp', userController.verifyEmailChangeOTP);

// Admin only routes (commented for now)
// router.use(restrictTo('admin'));
// router.get('/', userController.getAllUsers);
// router.get('/:id', userController.getUser);
// router.patch('/:id/role', userController.updateUserRole);
// router.patch('/:id/toggle-status', userController.toggleUserStatus);
// router.delete('/:id', userController.deleteUser);
router.post('/subscribe', subscribe);

export default router;