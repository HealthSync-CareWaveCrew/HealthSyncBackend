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

const getAllReviews = async (req, res) => {
  try {
    const { rating, approved } = req.query;
    
    const filters = {};
    if (rating) filters.rating = Number(rating);
    if (approved !== undefined) filters.isApproved = approved === 'true';

    const reviews = await reviewService.getAllReviewsService(filters);

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved successfully',
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    throw error;
  }
};

const getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await getAllReviewsAdminService();

    res.status(200).json({
      success: true,
      message: 'All reviews retrieved successfully',
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    throw error;
  }
};

const getReviewsByUser = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      throw new ErrorClass('Email is required', 400);
    }

    const reviews = await reviewService.getReviewsByUserService(email);

    res.status(200).json({
      success: true,
      message: 'User reviews retrieved successfully',
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    throw error;
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await reviewService.getReviewByIdService(id);

    res.status(200).json({
      success: true,
      message: 'Review retrieved successfully',
      data: review,
    });
  } catch (error) {
    throw error;
  }
};

export default {
    createReview,
    getAllReviews,
    getAllReviewsAdmin,
    getReviewsByUser,
    getReviewById
}