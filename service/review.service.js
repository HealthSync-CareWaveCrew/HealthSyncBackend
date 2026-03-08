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

const getAllReviewsAdminService = async () => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .lean();
    
    return reviews;
  } catch (error) {
    throw error;
  }
};

const getReviewsByUserService = async (userEmail) => {
  try {
    const reviews = await Review.find({ 'user.email': userEmail })
      .sort({ createdAt: -1 })
      .lean();
    
    return reviews;
  } catch (error) {
    throw error;
  }
};

const getReviewByIdService = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new ErrorClass('Review not found', 404);
    }
    
    return review;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new ErrorClass('Invalid review ID', 400);
    }
    throw error;
  }
};

export default {
  createReviewService,
  getAllReviewsService,
  getAllReviewsAdminService,
  getReviewsByUserService,
  getReviewByIdService
};