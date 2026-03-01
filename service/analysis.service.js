import Analysis from '../models/Analysis.model.js';
import ErrorClass from '../util/errorClass.js';

/**
 * Service: Get analysis history from database
 */
export const getAnalysisHistoryService = async () => {
  try {
    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return analyses;

  } catch (error) {
    console.error("Database error in getAnalysisHistoryService:", error);

    throw new ErrorClass("Failed to fetch analysis history.", 500);
  }
};

/**
 * Service: Get analysis by ID from database
 */
export const getAnalysisByIdService = async (id) => {
  try {
    const analysis = await Analysis.findById(id);
    return analysis;
  } catch (error) {
    console.error("Database error in getAnalysisByIdService:", error);
    throw new ErrorClass("Failed to fetch analysis.", 500);
  }
};
