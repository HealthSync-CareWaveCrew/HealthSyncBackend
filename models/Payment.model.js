import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
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
    payment_method_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
    },
    stripe_subscription_id: {
      type: String,
    },
    stripe_payment_intent_id: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "active", "failed", "cancelled", "refunded", "expired"],
      default: "pending",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "usd",
      lowercase: true,
    },
    due_date: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
