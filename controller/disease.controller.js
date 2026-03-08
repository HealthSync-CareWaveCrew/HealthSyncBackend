import {
  getAllDiseasesService,
  getDiseasesByTypeService,
  getDiseaseByIdService,
  createDiseaseService,
  updateDiseaseService,
  deleteDiseaseService,
} from '../service/disease.service.js';
import ErrorClass from '../util/errorClass.js';

/**
 * Controller: Get all diseases
 */
export const getAllDiseases = async (req, res) => {
  try {
    const diseases = await getAllDiseasesService();
    
    res.status(200).json({
      success: true,
      message: 'Diseases retrieved successfully',
      count: diseases.length,
      data: diseases,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Controller: Get diseases by prediction type
 */
export const getDiseasesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      throw new ErrorClass('Prediction type is required in URL parameters', 400);
    }

    const diseases = await getDiseasesByTypeService(type);
    
    res.status(200).json({
      success: true,
      message: `${type} diseases retrieved successfully`,
      count: diseases.length,
      data: diseases,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Controller: Get a single disease by diseaseId
 */
export const getDiseaseById = async (req, res) => {
  try {
    const { diseaseId } = req.params;

    if (!diseaseId) {
      throw new ErrorClass('Disease ID is required in URL parameters', 400);
    }

    const disease = await getDiseaseByIdService(diseaseId);
    
    res.status(200).json({
      success: true,
      message: 'Disease retrieved successfully',
      data: disease,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Controller: Create a new disease
 */
export const createDisease = async (req, res) => {
  try {
    const { diseaseId, name, predictionType, description, fields, aboutDiseaseItems } = req.body;

    // Basic validation
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new ErrorClass('Request body is required', 400);
    }

    const disease = await createDiseaseService({
      diseaseId,
      name,
      predictionType,
      description,
      fields,
      aboutDiseaseItems,
    });
    
    res.status(201).json({
      success: true,
      message: 'Disease created successfully',
      data: disease,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Controller: Update an existing disease
 */
export const updateDisease = async (req, res) => {
  try {
    const { diseaseId } = req.params;

    if (!diseaseId) {
      throw new ErrorClass('Disease ID is required in URL parameters', 400);
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      throw new ErrorClass('Request body with update data is required', 400);
    }

    const disease = await updateDiseaseService(diseaseId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Disease updated successfully',
      data: disease,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Controller: Delete a disease
 */
export const deleteDisease = async (req, res) => {
  try {
    const { diseaseId } = req.params;

    if (!diseaseId) {
      throw new ErrorClass('Disease ID is required in URL parameters', 400);
    }

    const result = await deleteDiseaseService(diseaseId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    throw error;
  }
};
