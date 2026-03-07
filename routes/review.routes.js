import express from 'express';
import reviewController from '../controller/review.controller.js';
import { asyncHandler } from '../util/errorHandling.js';
const router = express.Router();

router.post("/addReview", asyncHandler(reviewController?.addReview));

export default router;