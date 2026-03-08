import reviewService from "../service/review.service.js";
import ErrorClass from "../util/errorClass.js";

const createReview = async (req, res) => {
  try {
    const { user, rating, title, comment } = req.body;

    // Validate required fields
    if (!user || !rating || !title || !comment) {
      throw new ErrorClass('All fields are required', 400);
    }

    const reviewData = {
      user,
      rating: Number(rating),
      title,
      comment,
    };

    const review = await reviewService.createReviewService(reviewData);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    throw error;
  }
};

export default {
    createReview
}