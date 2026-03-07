import reviewService from "../service/review.service.js";
import ErrorClass from "../util/errorClass.js";

const addReview = async (req, res) => {
  const { user, rating, comment } = req.body;

  //  Validation
  if (!user) {
    throw new ErrorClass("User ID is required.", 400);
  }

  if (!rating) {
    throw new ErrorClass("Rating is required.", 400);
  }

  if (rating < 1 || rating > 5) {
    throw new ErrorClass("Rating must be between 1 and 5.", 400);
  }

  if (!comment || comment.trim() === "") {
    throw new ErrorClass("Comment is required.", 400);
  }

  const review = await reviewService.addReviewService(req.body);

  res.status(201).json({
    success: true,
    data: review,
  });
};

export default {
    addReview
}