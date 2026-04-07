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
      query.user.email = filters.userEmail;
    }

    const reviews = await Review.find(query).populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return reviews;
  } catch (error) {
    throw error;
  }
};

const getAllReviewsAdminService = async () => {
  try {
    // const reviews = await Review.find()
    //   .sort({ createdAt: -1 })
    //   .lean();

    const reviews = await Review.find().populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return reviews;
  } catch (error) {
    throw error;
  }
};

const getReviewsByUserService = async (userId) => {
  try {
    // const reviews = await Review.find({ 'user': userId })
    //   .sort({ createdAt: -1 })
    //   .lean();
    const reviews = await Review.find({ 'user': userId }).populate('user', 'name email')
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

const updateReviewService = async (reviewId, updateData, userEmail) => {
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new ErrorClass('Review not found', 404);
    }

    // Check if user owns this review (unless admin operation)
    if (userEmail && review.user.email !== userEmail) {
      throw new ErrorClass('You can only update your own reviews', 403);
    }

    // Update allowed fields
    const allowedUpdates = ['rating', 'title', 'comment'];
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        review[field] = updateData[field];
      }
    });

    await review.save();
    return review;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new ErrorClass('Invalid review ID', 400);
    }
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

const updateReviewVisibilityService = async (reviewId, isVisible) => {
  try {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isVisible },
      { new: true, runValidators: true }
    );

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

const updateReviewApprovalService = async (reviewId, isApproved) => {
  try {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isApproved },
      { new: true, runValidators: true }
    );

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

const deleteReviewService = async (reviewId, userEmail) => {
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new ErrorClass('Review not found', 404);
    }

    // Check if user owns this review (unless admin operation)
    if (userEmail && review.user.email !== userEmail) {
      throw new ErrorClass('You can only delete your own reviews', 403);
    }

    await Review.findByIdAndDelete(reviewId);
    return { message: 'Review deleted successfully' };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new ErrorClass('Invalid review ID', 400);
    }
    throw error;
  }
};

const getReviewStatsService = async () => {
  try {
    const stats = await Review.aggregate([
      {
        $match: { isVisible: true, isApproved: true }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratings: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageRating: { $round: ['$averageRating', 2] },
          ratingDistribution: {
            fiveStar: {
              $size: {
                $filter: {
                  input: '$ratings',
                  as: 'rating',
                  cond: { $eq: ['$$rating', 5] }
                }
              }
            },
            fourStar: {
              $size: {
                $filter: {
                  input: '$ratings',
                  as: 'rating',
                  cond: { $eq: ['$$rating', 4] }
                }
              }
            },
            threeStar: {
              $size: {
                $filter: {
                  input: '$ratings',
                  as: 'rating',
                  cond: { $eq: ['$$rating', 3] }
                }
              }
            },
            twoStar: {
              $size: {
                $filter: {
                  input: '$ratings',
                  as: 'rating',
                  cond: { $eq: ['$$rating', 2] }
                }
              }
            },
            oneStar: {
              $size: {
                $filter: {
                  input: '$ratings',
                  as: 'rating',
                  cond: { $eq: ['$$rating', 1] }
                }
              }
            }
          }
        }
      }
    ]);

    return stats.length > 0 ? stats[0] : {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0
      }
    };
  } catch (error) {
    throw error;
  }
};

export default {
  createReviewService,
  getAllReviewsService,
  getAllReviewsAdminService,
  getReviewsByUserService,
  getReviewByIdService,
  updateReviewService,
  updateReviewVisibilityService,
  updateReviewApprovalService,
  deleteReviewService,
  getReviewStatsService
};