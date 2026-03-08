import Review from "../models/Review.model.js";
import ErrorClass from "../util/errorClass.js";

const createReviewService = async (reviewData) => {
  try {
    const review = await Review.create(reviewData);
    return review;
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw new ErrorClass(
        'Validation Error',
        400,
        Object.values(error.errors).map((err) => err.message)
      );
    }
    throw error;
  }
};

const getAllReviewsService = async (filters = {}) => {
  try {
    const query = { isVisible: true };
    
    // Add additional filters if provided
    if (filters.isApproved !== undefined) {
      query.isApproved = filters.isApproved;
    }
    
    if (filters.rating) {
      query.rating = filters.rating;
    }
    
    if (filters.userEmail) {
      query.user?.email = filters.userEmail;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return reviews;
  } catch (error) {
    throw error;
  }
};

export default {
  createReviewService,
  getAllReviewsService,
};