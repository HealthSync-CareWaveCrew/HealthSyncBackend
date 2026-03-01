import {
    getAnalysisHistoryService,
    getAnalysisByIdService
} from '../service/analysis.service.js';
import ErrorClass from '../util/errorClass.js';


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
