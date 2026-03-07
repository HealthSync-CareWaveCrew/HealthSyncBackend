import Review from "../models/Review.model.js";
import ErrorClass from "../util/errorClass.js";

const addReviewService = async (reviewData) => {
  try {
    const review = await Review.create(reviewData);
    return review;
  } catch (error) {
    console.error("Database error in addReviewService:", error);
    throw new ErrorClass("Failed to add review.", 500);
  }
};

export default {
  addReviewService,
};