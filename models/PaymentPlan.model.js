import mongoose from "mongoose";

const paymentPlanSchema = new mongoose.Schema(
  {
    plan_name: {
      type: String,
      trim: true,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    stripe_product_id: {
      type: String,
      required: true,
    },
    stripe_price_id: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    feature_limits: {
      free_trials: {
        type: Number,
        default: 3,
        min: 0,
      },
      billing_cycle: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const PaymentPlan = mongoose.model("PaymentPlan", paymentPlanSchema);

export default PaymentPlan;
