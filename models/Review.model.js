import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot be more than 5'],
        },
        title: {
            type: String,
            required: [true, 'Review title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        comment: {
            type: String,
            required: [true, 'Review comment is required'],
            trim: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        },
        isApproved: {
            type: Boolean,
            default: true, // Auto-approve reviews, can be changed to false for manual approval
        },
        isVisible: {
            type: Boolean,
            default: true, // Admin can hide reviews without deleting
        },
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ isVisible: 1, isApproved: 1 });

// Virtual for review age
reviewSchema.virtual('age').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;