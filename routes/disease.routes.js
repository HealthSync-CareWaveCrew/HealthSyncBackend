import express from 'express';
import {
  getAllDiseases,
  getDiseasesByType,
  getDiseaseById,
  createDisease,
  updateDisease,
  deleteDisease,
} from '../controller/disease.controller.js';
import { asyncHandler } from '../util/errorHandling.js';

const router = express.Router();

/**
 * GET /diseases
 * Get all active diseases
 */
router.get('/', asyncHandler(getAllDiseases));

/**
 * GET /diseases/type/:type
 * Get diseases by prediction type (image or text)
 */
router.get('/type/:type', asyncHandler(getDiseasesByType));

/**
 * GET /diseases/:diseaseId
 * Get a specific disease by diseaseId
 */
router.get('/:diseaseId', asyncHandler(getDiseaseById));

/**
 * POST /diseases
 * Create a new disease
 */
router.post('/', asyncHandler(createDisease));

/**
 * PUT /diseases/:diseaseId
 * Update an existing disease
 */
router.put('/:diseaseId', asyncHandler(updateDisease));

/**
 * DELETE /diseases/:diseaseId
 * Delete a disease (soft delete)
 */
router.delete('/:diseaseId', asyncHandler(deleteDisease));

export default router;
