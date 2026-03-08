// import Disease from '../models/Disease.model.js';
// import ErrorClass from '../util/errorClass.js';

// /**
//  * Generate a unique diseaseId with mix of strings and numbers
//  * Format: DS_[timestamp]_[random_alphanumeric]
//  * Example: DS_67E8D4A2_X3M8N1L6
//  */
// const generateUniqueDiseaseId = async () => {
//   let diseaseId;
//   let isUnique = false;
//   let attempts = 0;
//   const maxAttempts = 10;

//   while (!isUnique && attempts < maxAttempts) {
//     // Generate timestamp in hexadecimal (uppercase)
//     const timestamp = Date.now().toString(16).toUpperCase();

//     // Generate random alphanumeric string (uppercase)
//     const randomPart = Math.random().toString(36).slice(2, 11).toUpperCase();

//     // Combine to create unique ID: DS_[timestamp]_[random]
//     diseaseId = `DS_${timestamp}_${randomPart}`;

//     // Check if this ID already exists in database
//     const existingDisease = await Disease.findOne({
//       diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' },
//     });

//     if (!existingDisease) {
//       isUnique = true;
//     }

//     attempts++;
//   }

//   if (!isUnique) {
//     throw new ErrorClass('Failed to generate unique disease ID after multiple attempts', 500);
//   }

//   return diseaseId;
// };

// const validateAboutDiseaseItems = (aboutDiseaseItems, errors) => {
//   if (aboutDiseaseItems === undefined) {
//     return;
//   }

//   if (!Array.isArray(aboutDiseaseItems)) {
//     errors.push('aboutDiseaseItems must be an array');
//     return;
//   }

//   aboutDiseaseItems.forEach((item, index) => {
//     if (!item || typeof item !== 'object' || !item.heading || !item.description) {
//       errors.push(`About Disease Item ${index} must have heading and description`);
//     }
//   });
// };

// /**
//  * Validate disease input data
//  */
// const validateDiseaseData = (data) => {
//   const errors = [];

//   // diseaseId is auto-generated, so we don't require it
//   // But if provided, validate it
//   if (data.diseaseId && (typeof data.diseaseId !== 'string' || data.diseaseId.trim() === '')) {
//     errors.push('diseaseId must be a non-empty string if provided');
//   }

//   if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
//     errors.push('name is required and must be a non-empty string');
//   }

//   if (!data.predictionType || !['image', 'text'].includes(data.predictionType.toLowerCase())) {
//     errors.push('predictionType is required and must be either "image" or "text"');
//   }

//   if (data.description !== undefined && typeof data.description !== 'string') {
//     errors.push('description must be a string');
//   }

//   if (data.fields !== undefined && !Array.isArray(data.fields)) {
//     errors.push('fields must be an array');
//   }

//   validateAboutDiseaseItems(data.aboutDiseaseItems, errors);

//   if (errors.length > 0) {
//     throw new ErrorClass(`Validation failed: ${errors.join('; ')}`, 400);
//   }
// };

// /**
//  * Get all active diseases
//  */
// export const getAllDiseasesService = async () => {
//   try {
//     const diseases = await Disease.find({ isActive: true }).sort({ name: 1 });
    
//     if (!diseases) {
//       throw new ErrorClass('Failed to retrieve diseases from database', 500);
//     }

//     return diseases;
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     console.error('Error in getAllDiseasesService:', error);
//     throw new ErrorClass(`Failed to retrieve diseases: ${error.message}`, error.statusCode || 500);
//   }
// };

// /**
//  * Get diseases by prediction type
//  */
// export const getDiseasesByTypeService = async (predictionType) => {
//   try {
//     if (!predictionType || typeof predictionType !== 'string') {
//       throw new ErrorClass('Prediction type parameter is required and must be a string', 400);
//     }

//     const normalizedType = predictionType.toLowerCase();
//     if (!['image', 'text'].includes(normalizedType)) {
//       throw new ErrorClass('Invalid prediction type. Must be "image" or "text".', 400);
//     }

//     const diseases = await Disease.find({ 
//       predictionType: normalizedType, 
//       isActive: true 
//     }).sort({ name: 1 });

//     if (!diseases) {
//       throw new ErrorClass('Failed to retrieve diseases from database', 500);
//     }
    
//     return diseases;
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     console.error('Error in getDiseasesByTypeService:', error);
//     throw new ErrorClass(`Failed to retrieve diseases by type: ${error.message}`, error.statusCode || 500);
//   }
// };

// /**
//  * Get a single disease by diseaseId
//  */
// export const getDiseaseByIdService = async (diseaseId) => {
//   try {
//     if (!diseaseId || typeof diseaseId !== 'string') {
//       throw new ErrorClass('Disease ID parameter is required and must be a string', 400);
//     }

//     // Case-insensitive search for the disease
//     const disease = await Disease.findOne({ 
//       diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' }, 
//       isActive: true 
//     });
    
//     if (!disease) {
//       throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
//     }
    
//     return disease;
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     console.error('Error in getDiseaseByIdService:', error);
//     throw new ErrorClass(`Failed to retrieve disease: ${error.message}`, error.statusCode || 500);
//   }
// };

// /**
//  * Create a new disease
//  */
// export const createDiseaseService = async (diseaseData) => {
//   try {
//     // Validate input data
//     if (!diseaseData || typeof diseaseData !== 'object') {
//       throw new ErrorClass('Disease data is required and must be an object', 400);
//     }

//     validateDiseaseData(diseaseData);

//     const { name, predictionType, description, fields, aboutDiseaseItems } = diseaseData;
//     const normalizedType = predictionType.toLowerCase();

//     // Validate fields structure if provided
//     if (fields && Array.isArray(fields)) {
//       fields.forEach((field, index) => {
//         if (!field.name || !field.label || !field.type) {
//           throw new ErrorClass(`Field ${index} must have name, label, and type properties`, 400);
//         }
//         if (!['text', 'number', 'select', 'radio', 'checkbox'].includes(field.type)) {
//           throw new ErrorClass(`Field ${index}: Invalid field type "${field.type}"`, 400);
//         }
//       });
//     }

//     // For image type, fields should be empty
//     const diseaseFields = normalizedType === 'image' ? [] : (fields || []);

//     // Generate unique diseaseId using algorithm
//     const generatedDiseaseId = await generateUniqueDiseaseId();
//     console.log(`Generated unique disease ID: ${generatedDiseaseId}`);

//     // Create disease with generated ID
//     const disease = new Disease({
//       diseaseId: generatedDiseaseId,
//       name: name.trim(),
//       predictionType: normalizedType,
//       description: description ? description.trim() : '',
//       fields: diseaseFields,
//       aboutDiseaseItems: Array.isArray(aboutDiseaseItems) ? aboutDiseaseItems : [],
//     });

//     const savedDisease = await disease.save();
//     console.log(`Disease created successfully with ID: ${savedDisease.diseaseId}`);
//     return savedDisease;
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     // Handle MongoDB validation errors
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors)
//         .map(err => err.message)
//         .join('; ');
//       throw new ErrorClass(`Validation error: ${messages}`, 400);
//     }
//     // Handle MongoDB duplicate key error
//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern)[0];
//       throw new ErrorClass(`A disease with this ${field} already exists`, 409);
//     }
//     console.error('Error in createDiseaseService:', error);
//     throw new ErrorClass(`Failed to create disease: ${error.message}`, error.statusCode || 500);
//   }
// };

// /**
//  * Update an existing disease
//  */
// export const updateDiseaseService = async (diseaseId, updateData) => {
//   try {
//     if (!diseaseId || typeof diseaseId !== 'string') {
//       throw new ErrorClass('Disease ID is required and must be a string', 400);
//     }

//     if (!updateData || typeof updateData !== 'object') {
//       throw new ErrorClass('Update data is required and must be an object', 400);
//     }

//     // Case-insensitive search for the disease
//     const disease = await Disease.findOne({ 
//       diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' } 
//     });
    
//     if (!disease) {
//       throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
//     }

//     // Update name
//     if (updateData.name !== undefined) {
//       if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
//         throw new ErrorClass('Name must be a non-empty string', 400);
//       }
//       disease.name = updateData.name.trim();
//     }

//     // Update description
//     if (updateData.description !== undefined) {
//       if (typeof updateData.description !== 'string') {
//         throw new ErrorClass('Description must be a string', 400);
//       }
//       disease.description = updateData.description.trim();
//     }

//     // Update prediction type
//     if (updateData.predictionType !== undefined) {
//       const normalizedType = updateData.predictionType.toLowerCase();
//       if (!['image', 'text'].includes(normalizedType)) {
//         throw new ErrorClass('Invalid prediction type. Must be "image" or "text".', 400);
//       }
//       disease.predictionType = normalizedType;
//     }

//     // Update fields
//     if (updateData.fields !== undefined) {
//       if (!Array.isArray(updateData.fields)) {
//         throw new ErrorClass('Fields must be an array', 400);
//       }
//       // Validate fields structure
//       updateData.fields.forEach((field, index) => {
//         if (!field.name || !field.label || !field.type) {
//           throw new ErrorClass(`Field ${index} must have name, label, and type properties`, 400);
//         }
//       });
//       // For image type, clear fields
//       disease.fields = disease.predictionType === 'image' ? [] : updateData.fields;
//     }

//     // Update isActive status
//     if (updateData.isActive !== undefined) {
//       if (typeof updateData.isActive !== 'boolean') {
//         throw new ErrorClass('isActive must be a boolean', 400);
//       }
//       disease.isActive = updateData.isActive;
//     }

//     const updatedDisease = await disease.save();
//     console.log(`Disease updated successfully: ${updatedDisease.diseaseId}`);
//     return updatedDisease;
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     // Handle MongoDB validation errors
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors)
//         .map(err => err.message)
//         .join('; ');
//       throw new ErrorClass(`Validation error: ${messages}`, 400);
//     }
//     console.error('Error in updateDiseaseService:', error);
//     throw new ErrorClass(`Failed to update disease: ${error.message}`, error.statusCode || 500);
//   }
// };

// /**
//  * Delete a disease (soft delete by setting isActive to false)
//  */
// export const deleteDiseaseService = async (diseaseId) => {
//   try {
//     if (!diseaseId || typeof diseaseId !== 'string') {
//       throw new ErrorClass('Disease ID is required and must be a string', 400);
//     }

//     // Case-insensitive search for the disease
//     const disease = await Disease.findOne({ 
//       diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' } 
//     });
    
//     if (!disease) {
//       throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
//     }

//     if (!disease.isActive) {
//       throw new ErrorClass(`Disease with ID "${diseaseId}" is already deleted.`, 400);
//     }

//     disease.isActive = false;
//     const deletedDisease = await disease.save();
//     console.log(`Disease deleted successfully (soft delete): ${deletedDisease.diseaseId}`);
    
//     return { 
//       success: true,
//       message: 'Disease deleted successfully.',
//       data: deletedDisease
//     };
//   } catch (error) {
//     if (error instanceof ErrorClass) {
//       throw error;
//     }
//     console.error('Error in deleteDiseaseService:', error);
//     throw new ErrorClass(`Failed to delete disease: ${error.message}`, error.statusCode || 500);
//   }
// };

import Disease from '../models/Disease.model.js';
import ErrorClass from '../util/errorClass.js';

/**
 * Generate a unique diseaseId with mix of strings and numbers
 * Format: DS_[timestamp]_[random_alphanumeric]
 * Example: DS_67E8D4A2_X3M8N1L6
 */
const generateUniqueDiseaseId = async () => {
  let diseaseId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate timestamp in hexadecimal (uppercase)
    const timestamp = Date.now().toString(16).toUpperCase();

    // Generate random alphanumeric string (uppercase)
    const randomPart = Math.random().toString(36).slice(2, 11).toUpperCase();

    // Combine to create unique ID: DS_[timestamp]_[random]
    diseaseId = `DS_${timestamp}_${randomPart}`;

    // Check if this ID already exists in database
    const existingDisease = await Disease.findOne({
      diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' },
    });

    if (!existingDisease) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new ErrorClass('Failed to generate unique disease ID after multiple attempts', 500);
  }

  return diseaseId;
};

const validateAboutDiseaseItems = (aboutDiseaseItems, errors) => {
  if (aboutDiseaseItems === undefined) {
    return;
  }

  if (!Array.isArray(aboutDiseaseItems)) {
    errors.push('aboutDiseaseItems must be an array');
    return;
  }

  aboutDiseaseItems.forEach((item, index) => {
    if (!item || typeof item !== 'object' || !item.heading || !item.description) {
      errors.push(`About Disease Item ${index} must have heading and description`);
    }
  });
};

/**
 * Validate disease input data
 */
const validateDiseaseData = (data) => {
  const errors = [];

  // diseaseId is auto-generated, so we don't require it
  // But if provided, validate it
  if (data.diseaseId && (typeof data.diseaseId !== 'string' || data.diseaseId.trim() === '')) {
    errors.push('diseaseId must be a non-empty string if provided');
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
  }

  if (!data.predictionType || !['image', 'text'].includes(data.predictionType.toLowerCase())) {
    errors.push('predictionType is required and must be either "image" or "text"');
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('description must be a string');
  }

  if (data.fields !== undefined && !Array.isArray(data.fields)) {
    errors.push('fields must be an array');
  }

  validateAboutDiseaseItems(data.aboutDiseaseItems, errors);

  if (errors.length > 0) {
    throw new ErrorClass(`Validation failed: ${errors.join('; ')}`, 400);
  }
};

/**
 * Get all active diseases
 */
export const getAllDiseasesService = async () => {
  try {
    const diseases = await Disease.find({ isActive: true }).sort({ name: 1 });

    if (!Array.isArray(diseases)) {
      throw new ErrorClass('Failed to retrieve diseases from database', 500);
    }

    return diseases;
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    console.error('Error in getAllDiseasesService:', error);
    throw new ErrorClass(`Failed to retrieve diseases: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Get diseases by prediction type
 */
export const getDiseasesByTypeService = async (predictionType) => {
  try {
    if (!predictionType || typeof predictionType !== 'string') {
      throw new ErrorClass('Prediction type parameter is required and must be a string', 400);
    }

    const normalizedType = predictionType.toLowerCase();
    if (!['image', 'text'].includes(normalizedType)) {
      throw new ErrorClass('Invalid prediction type. Must be "image" or "text".', 400);
    }

    const diseases = await Disease.find({
      predictionType: normalizedType,
      isActive: true,
    }).sort({ name: 1 });

    if (!Array.isArray(diseases)) {
      throw new ErrorClass('Failed to retrieve diseases from database', 500);
    }

    return diseases;
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    console.error('Error in getDiseasesByTypeService:', error);
    throw new ErrorClass(`Failed to retrieve diseases by type: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Get a single disease by diseaseId
 */
export const getDiseaseByIdService = async (diseaseId) => {
  try {
    if (!diseaseId || typeof diseaseId !== 'string') {
      throw new ErrorClass('Disease ID parameter is required and must be a string', 400);
    }

    // Case-insensitive search for the disease
    const disease = await Disease.findOne({
      diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' },
      isActive: true,
    });

    if (!disease) {
      throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
    }

    return disease;
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    console.error('Error in getDiseaseByIdService:', error);
    throw new ErrorClass(`Failed to retrieve disease: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Create a new disease
 */
export const createDiseaseService = async (diseaseData) => {
  try {
    // Validate input data
    if (!diseaseData || typeof diseaseData !== 'object') {
      throw new ErrorClass('Disease data is required and must be an object', 400);
    }

    validateDiseaseData(diseaseData);

    const { name, predictionType, description, fields, aboutDiseaseItems } = diseaseData;
    const normalizedType = predictionType.toLowerCase();

    // Validate fields structure if provided
    if (fields && Array.isArray(fields)) {
      fields.forEach((field, index) => {
        if (!field.name || !field.label || !field.type) {
          throw new ErrorClass(`Field ${index} must have name, label, and type properties`, 400);
        }
        if (!['text', 'number', 'select', 'radio', 'checkbox'].includes(field.type)) {
          throw new ErrorClass(`Field ${index}: Invalid field type "${field.type}"`, 400);
        }
      });
    }

    // For image type, fields should be empty
    const diseaseFields = normalizedType === 'image' ? [] : (fields || []);

    // Generate unique diseaseId using algorithm
    const generatedDiseaseId = await generateUniqueDiseaseId();
    console.log(`Generated unique disease ID: ${generatedDiseaseId}`);

    // Create disease with generated ID
    const disease = new Disease({
      diseaseId: generatedDiseaseId,
      name: name.trim(),
      predictionType: normalizedType,
      description: description ? description.trim() : '',
      fields: diseaseFields,
      aboutDiseaseItems: Array.isArray(aboutDiseaseItems) ? aboutDiseaseItems : [],
    });

    const savedDisease = await disease.save();
    console.log(`Disease created successfully with ID: ${savedDisease.diseaseId}`);
    return savedDisease;
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join('; ');
      throw new ErrorClass(`Validation error: ${messages}`, 400);
    }
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new ErrorClass(`A disease with this ${field} already exists`, 409);
    }
    console.error('Error in createDiseaseService:', error);
    throw new ErrorClass(`Failed to create disease: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Update an existing disease
 */
export const updateDiseaseService = async (diseaseId, updateData) => {
  try {
    if (!diseaseId || typeof diseaseId !== 'string') {
      throw new ErrorClass('Disease ID is required and must be a string', 400);
    }

    if (!updateData || typeof updateData !== 'object') {
      throw new ErrorClass('Update data is required and must be an object', 400);
    }

    // Case-insensitive search for the disease
    const disease = await Disease.findOne({
      diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' },
    });

    if (!disease) {
      throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
    }

    // Update name
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim() === '') {
        throw new ErrorClass('Name must be a non-empty string', 400);
      }
      disease.name = updateData.name.trim();
    }

    // Update description
    if (updateData.description !== undefined) {
      if (typeof updateData.description !== 'string') {
        throw new ErrorClass('Description must be a string', 400);
      }
      disease.description = updateData.description.trim();
    }

    // Update prediction type
    if (updateData.predictionType !== undefined) {
      const normalizedType = updateData.predictionType.toLowerCase();
      if (!['image', 'text'].includes(normalizedType)) {
        throw new ErrorClass('Invalid prediction type. Must be "image" or "text".', 400);
      }
      disease.predictionType = normalizedType;
    }

    // Update fields
    if (updateData.fields !== undefined) {
      if (!Array.isArray(updateData.fields)) {
        throw new ErrorClass('Fields must be an array', 400);
      }
      // Validate fields structure
      updateData.fields.forEach((field, index) => {
        if (!field.name || !field.label || !field.type) {
          throw new ErrorClass(`Field ${index} must have name, label, and type properties`, 400);
        }
        if (!['text', 'number', 'select', 'radio', 'checkbox'].includes(field.type)) {
          throw new ErrorClass(`Field ${index}: Invalid field type "${field.type}"`, 400);
        }
      });
      // For image type, clear fields
      disease.fields = disease.predictionType === 'image' ? [] : updateData.fields;
    }

    // Update aboutDiseaseItems
    if (updateData.aboutDiseaseItems !== undefined) {
      const errors = [];
      validateAboutDiseaseItems(updateData.aboutDiseaseItems, errors);
      if (errors.length > 0) {
        throw new ErrorClass(`Validation failed: ${errors.join('; ')}`, 400);
      }
      disease.aboutDiseaseItems = updateData.aboutDiseaseItems;
    }

    // Update isActive status
    if (updateData.isActive !== undefined) {
      if (typeof updateData.isActive !== 'boolean') {
        throw new ErrorClass('isActive must be a boolean', 400);
      }
      disease.isActive = updateData.isActive;
    }

    const updatedDisease = await disease.save();
    console.log(`Disease updated successfully: ${updatedDisease.diseaseId}`);
    return updatedDisease;
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join('; ');
      throw new ErrorClass(`Validation error: ${messages}`, 400);
    }
    console.error('Error in updateDiseaseService:', error);
    throw new ErrorClass(`Failed to update disease: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Delete a disease (soft delete by setting isActive to false)
 */
export const deleteDiseaseService = async (diseaseId) => {
  try {
    if (!diseaseId || typeof diseaseId !== 'string') {
      throw new ErrorClass('Disease ID is required and must be a string', 400);
    }

    // Case-insensitive search for the disease
    const disease = await Disease.findOne({
      diseaseId: { $regex: `^${diseaseId}$`, $options: 'i' },
    });

    if (!disease) {
      throw new ErrorClass(`Disease with ID "${diseaseId}" not found.`, 404);
    }

    if (!disease.isActive) {
      throw new ErrorClass(`Disease with ID "${diseaseId}" is already deleted.`, 400);
    }

    disease.isActive = false;
    const deletedDisease = await disease.save();
    console.log(`Disease deleted successfully (soft delete): ${deletedDisease.diseaseId}`);

    return {
      success: true,
      message: 'Disease deleted successfully.',
      data: deletedDisease,
    };
  } catch (error) {
    if (error instanceof ErrorClass) {
      throw error;
    }
    console.error('Error in deleteDiseaseService:', error);
    throw new ErrorClass(`Failed to delete disease: ${error.message}`, error.statusCode || 500);
  }
};
