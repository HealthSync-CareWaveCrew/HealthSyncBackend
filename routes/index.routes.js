import express from 'express';
const router = express.Router();

import analysisRoutes from './analysis.routes.js';
import reviewRoutes from './review.routes.js';

router.use("/analysis", analysisRoutes);
router.use("/review", reviewRoutes);

export default router;
