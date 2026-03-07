import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        user: {
            //   type: mongoose.Schema.Types.ObjectId,
            //   ref: "User",
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        // predictionId: {
        //   type: mongoose.Schema.Types.ObjectId,
        //   ref: "Prediction",
        // }
    },
    {
        timestamps: true,
    }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;