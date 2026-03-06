import express from 'express';
const router = express.Router();

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import adminRoutes from './admin.routes.js';
import analysisRoutes from './analysis.routes.js';

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);  // Add admin routes
router.use('/', analysisRoutes);

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

export default router;