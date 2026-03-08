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

export default {
  createReviewService,
};