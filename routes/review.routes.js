import express from 'express';
import reviewController from '../controller/review.controller.js';
import { asyncHandler } from '../util/errorHandling.js';

const router = express.Router();
router.get('/stats', asyncHandler(reviewController.getReviewStats));
router.post('/', asyncHandler(reviewController.createReview));
router.get('/', asyncHandler(reviewController.getAllReviews));
router.get('/admin/all', asyncHandler(reviewController.getAllReviewsAdmin));
router.get('/user/:email', asyncHandler(reviewController.getReviewsByUser));
router.get('/:id', asyncHandler(reviewController.getReviewById));
router.put('/:id', asyncHandler(reviewController.updateReview));
router.delete('/:id', asyncHandler(reviewController.deleteReview));
router.patch('/:id/visibility', asyncHandler(reviewController.toggleReviewVisibility));
router.patch('/:id/approval', asyncHandler(reviewController.toggleReviewApproval));

export default router;