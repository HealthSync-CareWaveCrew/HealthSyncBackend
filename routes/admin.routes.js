import express from 'express';
const router = express.Router();
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus,
  toggleEmailVerification,
  deleteUser,
  bulkDeleteUsers,
  getUserActivity
} from '../controller/admin.controller.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import adminRoutes from './admin.routes.js';

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));
router.use('/admin', adminRoutes);

// Dashboard
router.get('/stats', getDashboardStats);

// User management
router.route('/users')
  .get(getAllUsers)
  .post(createUser);

router.post('/users/bulk-delete', bulkDeleteUsers);

router.route('/users/:id')
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.patch('/users/:id/toggle-verification', toggleEmailVerification);
router.get('/users/:id/activity', getUserActivity);

export default router;