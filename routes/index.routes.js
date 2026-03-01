import express from 'express';
const router = express.Router();

import analysisRoutes from './analysis.routes.js';

router.use("/", analysisRoutes);


export default router;
