import cloudinary from '../config/cloudinary.js';
import ErrorClass from '../util/errorClass.js';

/**
 * Upload a memory-buffer file (multer) to Cloudinary.
 */
export const uploadImageBufferToCloudinary = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!file?.buffer) {
      reject(new ErrorClass('Invalid file upload payload.', 400));
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'disease-predictor/analysis-images',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(new ErrorClass('Failed to upload image to Cloudinary.', 502));
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
};
