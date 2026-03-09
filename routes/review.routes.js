import express from 'express';
import reviewController from '../controller/review.controller.js';
import { asyncHandler } from '../util/errorHandling.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/stats', protect,asyncHandler(reviewController.getReviewStats));
router.post('/',protect, asyncHandler(reviewController.createReview));
router.get('/', protect,asyncHandler(reviewController.getAllReviews));
router.get('/admin/all', protect,asyncHandler(reviewController.getAllReviewsAdmin));
router.get('/user', protect, asyncHandler(reviewController.getReviewsByUser));
router.get('/:id', protect,asyncHandler(reviewController.getReviewById));
router.put('/:id', protect, asyncHandler(reviewController.updateReview));
router.delete('/:id', protect, asyncHandler(reviewController.deleteReview));
router.patch('/:id/visibility', protect, asyncHandler(reviewController.toggleReviewVisibility));
router.patch('/:id/approval', protect, asyncHandler(reviewController.toggleReviewApproval));

export default router;