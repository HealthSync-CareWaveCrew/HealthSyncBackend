import reviewService from "../service/review.service.js";
import ErrorClass from "../util/errorClass.js";

const createReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const user = req.user;

    // Validate required fields
    if (!user || !rating || !title || !comment) {
      throw new ErrorClass('All fields are required', 400);
    }

    const reviewData = {
      user:user._id,
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
    const reviews = await reviewService.getAllReviewsAdminService();

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
    const user=req.user;

    if (!user) {
      throw new ErrorClass('user is required', 400);
    }

    const reviews = await reviewService.getReviewsByUserService(user._id);

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

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, userEmail } = req.body;

    const updateData = {};
    if (rating !== undefined) updateData.rating = Number(rating);
    if (title !== undefined) updateData.title = title;
    if (comment !== undefined) updateData.comment = comment;

    const review = await reviewService.updateReviewService(id, updateData, userEmail);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    throw error;
  }
};

const toggleReviewVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;

    if (isVisible === undefined) {
      throw new ErrorClass('isVisible field is required', 400);
    }

    const review = await reviewService.updateReviewVisibilityService(id, isVisible);

    res.status(200).json({
      success: true,
      message: `Review ${isVisible ? 'shown' : 'hidden'} successfully`,
      data: review,
    });
  } catch (error) {
    throw error;
  }
};

const toggleReviewApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      throw new ErrorClass('isApproved field is required', 400);
    }

    const review = await reviewService.updateReviewApprovalService(id, isApproved);

    res.status(200).json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'unapproved'} successfully`,
      data: review,
    });
  } catch (error) {
    throw error;
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    const result = await reviewService.deleteReviewService(id, userEmail);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    throw error;
  }
};

const getReviewStats = async (req, res) => {
  try {
    const stats = await reviewService.getReviewStatsService();

    res.status(200).json({
      success: true,
      message: 'Review statistics retrieved successfully',
      data: stats,
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
    getReviewById,
    updateReview,
    toggleReviewVisibility,
    toggleReviewApproval,
    deleteReview,
    getReviewStats
}