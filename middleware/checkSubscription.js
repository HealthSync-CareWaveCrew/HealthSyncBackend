import Payment from "../models/Payment.model.js";
import PaymentPlan from "../models/PaymentPlan.model.js";
import Subscription from "../models/Subscription.model.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due"];

export const checkSubscription = (featureType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      const subscription = await Subscription.findOne({
        user_id: userId,
        status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
      })
        .populate("plan_id")
        .sort({ updated_at: -1 });

      req.subscription = subscription || null;

      if (featureType === "image") {
        if (
          !subscription ||
          subscription.status !== "active" ||
          subscription.plan_id?.type !== "image"
        ) {
          return res.status(403).json({
            success: false,
            data: null,
            message: "This feature requires an active image plan.",
          });
        }

        return next();
      }

      if (subscription) {
        return next();
      }

      const textPlanIds = await PaymentPlan.find({ type: "text" }).distinct(
        "_id",
      );
      const trialCount = await Payment.countDocuments({
        user_id: userId,
        plan_id: { $in: textPlanIds },
        amount: 0,
      });

      if (trialCount >= 3) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "Free trial limit reached. Please subscribe.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
