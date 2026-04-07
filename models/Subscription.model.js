import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentPlan",
      required: true,
    },
    stripe_subscription_id: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
      ],
      required: true,
    },
    current_period_start: {
      type: Date,
    },
    current_period_end: {
      type: Date,
    },
    cancel_at_period_end: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

subscriptionSchema.index({ user_id: 1, status: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
