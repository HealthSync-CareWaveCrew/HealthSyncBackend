import express from 'express';
import reviewController from '../controller/review.controller.js';
import { asyncHandler } from '../util/errorHandling.js';
const router = express.Router();

router.post('/', asyncHandler(reviewController.createReview));
router.get('/', asyncHandler(reviewController.getAllReviews));
export default router;