import {
    getAnalysisHistoryService,
    getAnalysisByIdService,
    analyzeImageService,
    analyzeClinicalDataService
} from '../service/analysis.service.js';
import ErrorClass from '../util/errorClass.js';

/**
 * Controller: Analyze medical image
 */
export const analyzeImage = async (req, res) => {
  if (!req.file) {
    throw new ErrorClass("No image file uploaded.", 400);
  }

  const { diseaseType } = req.body;

  if (!diseaseType) {
    throw new ErrorClass("diseaseType is required.", 400);
  }

  const result = await analyzeImageService(req.file, diseaseType);

  res.status(200).json({
    success: true,
    data: result,
  });
};

/**
 * Controller: Analyze clinical data
 */
export const analyzeClinicalData = async (req, res) => {
  const { diseaseType, formData } = req.body;

  if (!diseaseType || !formData) {
    throw new ErrorClass("Missing diseaseType or formData.", 400);
  }

  const result = await analyzeClinicalDataService(diseaseType, formData);

  res.status(200).json({
    success: true,
    data: result,
  });
};

/**
 * Controller: Get analysis history
 */
export const getAnalysisHistory = async (req, res) => {
  const analyses = await getAnalysisHistoryService();

  if (!analyses || analyses.length === 0) {
    throw new ErrorClass("No analysis history found.", 404);
  }

  res.status(200).json({
    success: true,
    count: analyses.length,
    data: analyses,
  });
};

/**
 * Controller: Get analysis by ID
 */
export const getAnalysisById = async (req, res) => {
  const { id } = req.params;

  const analysis = await getAnalysisByIdService(id);

  if (!analysis) {
    throw new ErrorClass("Analysis not found.", 404);
  }

  res.status(200).json({
    success: true,
    data: analysis,
  });
};
