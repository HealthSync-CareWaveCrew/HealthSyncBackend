import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripe_customer_id: {
      type: String,
      required: true,
    },
    stripe_pm_id: {
      type: String,
      required: true,
    },
    card_last4: {
      type: String,
      trim: true,
    },
    card_brand: {
      type: String,
      trim: true,
    },
    exp_month: {
      type: Number,
    },
    exp_year: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

paymentMethodSchema.index({ user_id: 1, stripe_pm_id: 1 }, { unique: true });

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);

export default PaymentMethod;
