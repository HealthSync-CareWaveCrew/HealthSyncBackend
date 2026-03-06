import express from 'express';
const router = express.Router();

import analysisRoutes from './analysis.routes.js';
import diseaseRoutes from './disease.routes.js';

router.use("/", analysisRoutes);
router.use("/diseases", diseaseRoutes);


export default router;
