import express from 'express';
import multer from 'multer';
import {
    getAnalysisHistory,
    getAnalysisById,
    analyzeImage
} from '../controller/analysis.controller.js';
import { asyncHandler } from '../util/errorHandling.js';

const router = express.Router();

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /analyze-image
 * Analyzes medical images for disease detection
 */
router.post('/analyze-image', upload.single('image'), asyncHandler(analyzeImage));


/**
 * GET /analysis-history
 * Retrieves all analysis records
 */
router.get('/analysis-history', asyncHandler(getAnalysisHistory));

/**
 * GET /analysis/:id
 * Retrieves a specific analysis by ID
 */
router.get('/analysis/:id', asyncHandler(getAnalysisById));

export default router;
