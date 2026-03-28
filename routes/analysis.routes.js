import express from 'express';
import multer from 'multer';
import {
    getAnalysisHistory,
    getAnalysisById,
    analyzeImage,
    analyzeClinicalData,
    sendChatMessage,
    deleteAnalysis,
} from '../controller/analysis.controller.js';
import { asyncHandler } from '../util/errorHandling.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { checkSubscription } from '../middleware/checkSubscription.js';

const router = express.Router();

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /analyze-image
 * Analyzes medical images for disease detection
 */
router.post(
  '/analyze-image',
  protect,
  checkSubscription('image'),
  upload.single('image'),
  asyncHandler(analyzeImage)
);

/**
 * POST /analyze-clinical-data
 * Analyzes clinical data for disease prediction
 */
router.post(
  '/analyze-clinical-data',
  protect,
  checkSubscription('text'),
  asyncHandler(analyzeClinicalData)
);

/**
 * POST /chat
 * Handles chat messages with AI assistant
 */
router.post('/chat', protect, checkSubscription('text'), asyncHandler(sendChatMessage));

/**
 * GET /analysis-history
 * Retrieves all analysis records
 */
router.get('/analysis-history', protect, asyncHandler(getAnalysisHistory));

/**
 * GET /analysis/:id
 * Retrieves a specific analysis by ID
 */
router.get('/analysis/:id', protect, asyncHandler(getAnalysisById));

/**
 * DELETE /analysis/:id
 * Soft deletes an analysis record (admin only)
 */
router.delete('/analysis/:id', protect, restrictTo('admin'), asyncHandler(deleteAnalysis));

export default router;
