import PaymentPlan from "../models/PaymentPlan.model.js";
import Subscription from "../models/Subscription.model.js";
import Analysis from "../models/Analysis.model.js";
import stripe from "../config/stripe.js";
import { getStripeSubscriptionPeriodDates } from "../util/stripeSubscriptionDates.js";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "past_due"];

export const checkSubscription = (featureType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const now = new Date();

      const planType = featureType === "image" ? "image" : "text";
      const planIds = await PaymentPlan.find({ type: planType }).distinct(
        "_id",
      );
      const subscription = await Subscription.findOne({
        user_id: userId,
        status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
        plan_id: { $in: planIds },
      })
        .populate("plan_id")
        .sort({ updated_at: -1 });

      req.subscription = subscription || null;

      if (subscription) {
        const missingPeriod = !subscription.current_period_end;
        if (missingPeriod) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(
              subscription.stripe_subscription_id,
            );
            subscription.status = stripeSub.status;
            const { currentPeriodStart, currentPeriodEnd } =
              getStripeSubscriptionPeriodDates(stripeSub);
            subscription.current_period_start =
              currentPeriodStart || subscription.current_period_start;
            subscription.current_period_end =
              currentPeriodEnd || subscription.current_period_end;
            subscription.cancel_at_period_end =
              stripeSub.cancel_at_period_end || false;
            await subscription.save();
          } catch (error) {
            // If Stripe fetch fails, fall back to stored values.
          }
        }
      }

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

        if (!subscription.current_period_end) {
          return res.status(403).json({
            success: false,
            data: null,
            message: "Image plan is not active. Please subscribe again.",
          });
        }

        if (
          subscription?.current_period_end &&
          subscription.current_period_end < now
        ) {
          return res.status(403).json({
            success: false,
            data: null,
            message: "Image plan has expired. Please subscribe again.",
          });
        }

        return next();
      }

      if (subscription) {
        if (!subscription.current_period_end) {
          return res.status(403).json({
            success: false,
            data: null,
            message: "Subscription has expired. Please subscribe again.",
          });
        }

        if (
          subscription.current_period_end &&
          subscription.current_period_end < now
        ) {
          return res.status(403).json({
            success: false,
            data: null,
            message: "Subscription has expired. Please subscribe again.",
          });
        }

        return next();
      }

      const trialLimit = 3;
      const trialCount = await Analysis.countDocuments({
        user: userId,
        type: "clinical",
      });

      if (trialCount >= trialLimit) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "Free trial limit reached. Please subscribe.",
        });
      }

      req.freeTrialEligible = true;
      req.freeTrialsRemaining = Math.max(0, trialLimit - trialCount);
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
