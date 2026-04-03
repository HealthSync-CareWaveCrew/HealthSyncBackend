import stripe from "../config/stripe.js";
import Payment from "../models/Payment.model.js";
import PaymentMethod from "../models/PaymentMethod.model.js";
import PaymentPlan from "../models/PaymentPlan.model.js";
import Subscription from "../models/Subscription.model.js";
import User from "../models/User.model.js";
import Analysis from "../models/Analysis.model.js";
import ErrorClass from "../util/errorClass.js";
import { getStripeSubscriptionPeriodDates } from "../util/stripeSubscriptionDates.js";

const ensureStripeCustomer = async (user) => {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  if (user.stripeCustomerId) {
    user.stripe_customer_id = user.stripeCustomerId;
    await user.save();
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user._id.toString() },
  });

  user.stripe_customer_id = customer.id;
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ErrorClass("User not found.", 404);
    }

    const stripeCustomerId = await ensureStripeCustomer(user);

    return res.status(200).json({
      success: true,
      data: { stripe_customer_id: stripeCustomerId },
      message: "Stripe customer ready.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const createSetupIntent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ErrorClass("User not found.", 404);
    }

    const stripeCustomerId = await ensureStripeCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
    });

    return res.status(200).json({
      success: true,
      data: { client_secret: setupIntent.client_secret },
      message: "SetupIntent created.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const savePaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { stripe_pm_id } = req.body;

    if (!stripe_pm_id) {
      throw new ErrorClass("stripe_pm_id is required.", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorClass("User not found.", 404);
    }

    const stripeCustomerId = await ensureStripeCustomer(user);

    try {
      await stripe.paymentMethods.attach(stripe_pm_id, {
        customer: stripeCustomerId,
      });
    } catch (error) {
      if (error?.code !== "resource_already_attached") {
        throw error;
      }
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: stripe_pm_id },
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(stripe_pm_id);

    const saved = await PaymentMethod.findOneAndUpdate(
      { user_id: userId, stripe_pm_id },
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_pm_id,
        card_last4: paymentMethod?.card?.last4 || null,
        card_brand: paymentMethod?.card?.brand || null,
        exp_month: paymentMethod?.card?.exp_month || null,
        exp_year: paymentMethod?.card?.exp_year || null,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      data: saved,
      message: "Payment method saved.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user?.id;
    const methods = await PaymentMethod.find({
      user_id: userId,
      isActive: true,
    }).sort({ updated_at: -1 });

    const enriched = await Promise.all(
      methods.map(async (method) => {
        let stripeMethod = null;
        try {
          stripeMethod = await stripe.paymentMethods.retrieve(
            method.stripe_pm_id,
          );
        } catch (error) {
          stripeMethod = null;
        }

        return {
          id: method._id,
          brand: method.card_brand || stripeMethod?.card?.brand || null,
          last4: method.card_last4 || stripeMethod?.card?.last4 || null,
          exp_month: stripeMethod?.card?.exp_month || method.exp_month || null,
          exp_year: stripeMethod?.card?.exp_year || method.exp_year || null,
          is_default: method.isActive,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: enriched,
      message: "Payment methods retrieved.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const method = await PaymentMethod.findOne({
      _id: id,
      user_id: userId,
      isActive: true,
    });

    if (!method) {
      throw new ErrorClass("Payment method not found.", 404);
    }

    await stripe.paymentMethods.detach(method.stripe_pm_id);

    method.isActive = false;
    await method.save();

    return res.status(200).json({
      success: true,
      data: method,
      message: "Payment method removed.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const method = await PaymentMethod.findOne({
      _id: id,
      user_id: userId,
    });

    if (!method) {
      throw new ErrorClass("Payment method not found.", 404);
    }

    await PaymentMethod.updateMany({ user_id: userId }, { isActive: false });
    method.isActive = true;
    await method.save();

    const user = await User.findById(userId);
    if (user) {
      const stripeCustomerId = await ensureStripeCustomer(user);
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: method.stripe_pm_id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Default payment method updated",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const getPlans = async (req, res) => {
  try {
    const plans = await PaymentPlan.find({ isActive: true });

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const adminGetPlans = async (req, res) => {
  try {
    const includeInactive = String(req.query?.includeInactive || "false") === "true";
    const filter = includeInactive ? {} : { isActive: true };
    const plans = await PaymentPlan.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

const normalizeBillingCycle = (cycle) => {
  if (!cycle) return null;
  const normalized = String(cycle).toLowerCase();
  if (normalized === "month" || normalized === "monthly") return "month";
  if (normalized === "year" || normalized === "yearly") return "year";
  return null;
};

export const adminCreatePlan = async (req, res) => {
  try {
    const {
      plan_name,
      cost,
      currency = "usd",
      type,
      billing_cycle,
      description = "",
      isActive = true,
    } = req.body;

    if (!plan_name || typeof plan_name !== "string") {
      throw new ErrorClass("plan_name is required.", 400);
    }
    if (cost === undefined || Number.isNaN(Number(cost))) {
      throw new ErrorClass("Valid cost is required.", 400);
    }
    if (!type || !["text", "image"].includes(type)) {
      throw new ErrorClass("type must be text or image.", 400);
    }

    const normalizedCycle = normalizeBillingCycle(billing_cycle);
    if (!normalizedCycle) {
      throw new ErrorClass("billing_cycle must be monthly or yearly.", 400);
    }

    const stripeProduct = await stripe.products.create({
      name: plan_name,
      description,
      metadata: { type },
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(Number(cost) * 100),
      currency: String(currency || "usd").toLowerCase(),
      recurring: { interval: normalizedCycle },
    });

    const plan = await PaymentPlan.create({
      plan_name,
      cost: Number(cost),
      currency: String(currency || "usd").toLowerCase(),
      type,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
      isActive: Boolean(isActive),
      description,
      feature_limits: {
        billing_cycle: normalizedCycle,
      },
    });

    return res.status(201).json({
      success: true,
      data: plan,
      message: "Plan created.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode || 500);
  }
};

export const adminUpdatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await PaymentPlan.findById(id);
    if (!plan) {
      throw new ErrorClass("Plan not found.", 404);
    }

    const {
      plan_name,
      cost,
      currency,
      billing_cycle,
      description,
      isActive,
    } = req.body;

    if (plan_name) {
      plan.plan_name = plan_name;
    }
    if (typeof description === "string") {
      plan.description = description;
    }
    if (typeof isActive === "boolean") {
      plan.isActive = isActive;
    }

    const normalizedCycle = billing_cycle
      ? normalizeBillingCycle(billing_cycle)
      : plan.feature_limits?.billing_cycle;

    const nextCurrency = currency
      ? String(currency).toLowerCase()
      : plan.currency;
    const nextCost =
      cost !== undefined && !Number.isNaN(Number(cost))
        ? Number(cost)
        : plan.cost;

    const billingChanged =
      normalizedCycle &&
      normalizedCycle !== plan.feature_limits?.billing_cycle;
    const costChanged = nextCost !== plan.cost;
    const currencyChanged = nextCurrency !== plan.currency;

    if (plan_name || typeof description === "string") {
      await stripe.products.update(plan.stripe_product_id, {
        name: plan.plan_name,
        description: plan.description || undefined,
      });
    }

    if (billingChanged || costChanged || currencyChanged) {
      if (!normalizedCycle) {
        throw new ErrorClass("billing_cycle must be monthly or yearly.", 400);
      }
      const stripePrice = await stripe.prices.create({
        product: plan.stripe_product_id,
        unit_amount: Math.round(Number(nextCost) * 100),
        currency: nextCurrency || "usd",
        recurring: { interval: normalizedCycle },
      });
      plan.stripe_price_id = stripePrice.id;
      plan.feature_limits.billing_cycle = normalizedCycle;
      plan.cost = nextCost;
      plan.currency = nextCurrency || "usd";
    }

    await plan.save();

    return res.status(200).json({
      success: true,
      data: plan,
      message: "Plan updated.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode || 500);
  }
};

export const adminDeactivatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await PaymentPlan.findById(id);
    if (!plan) {
      throw new ErrorClass("Plan not found.", 404);
    }

    plan.isActive = false;
    await plan.save();

    try {
      await stripe.prices.update(plan.stripe_price_id, { active: false });
    } catch (error) {
      // Ignore Stripe deactivation failures to keep DB consistent.
    }

    return res.status(200).json({
      success: true,
      data: plan,
      message: "Plan deactivated.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode || 500);
  }
};

export const subscribe = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { plan_id, payment_method_id } = req.body;

    console.log("Subscribe request:", { userId, plan_id, payment_method_id });

    if (!plan_id || !payment_method_id) {
      throw new ErrorClass("plan_id and payment_method_id are required.", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorClass("User not found.", 404);
    }

    const plan = await PaymentPlan.findById(plan_id);
    console.log("Found plan:", {
      id: plan?._id,
      type: plan?.type,
      name: plan?.plan_name,
    });

    if (!plan || !plan.isActive) {
      throw new ErrorClass("Payment plan not found.", 404);
    }

    const paymentMethod = await PaymentMethod.findOne({
      _id: payment_method_id,
      user_id: userId,
      isActive: true,
    });

    if (!paymentMethod) {
      throw new ErrorClass("Payment method not found.", 404);
    }

    const stripeCustomerId = await ensureStripeCustomer(user);

    // Cancel any existing active subscriptions of the same type
    const existingSubscriptions = await Subscription.find({
      user_id: userId,
      status: { $in: ["active", "past_due"] },
    }).populate("plan_id");

    for (const existingSub of existingSubscriptions) {
      if (existingSub.plan_id?.type === plan.type) {
        // Cancel the old subscription in Stripe
        await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Update subscription status to canceled
        existingSub.status = "canceled";
        existingSub.cancel_at_period_end = true;
        await existingSub.save();

        // Update payment records to cancelled
        const paymentUpdate = await Payment.updateMany(
          {
            user_id: userId,
            stripe_subscription_id: existingSub.stripe_subscription_id,
          },
          {
            status: "cancelled",
          },
        );
        console.log(
          "Updated payment records to cancelled:",
          paymentUpdate.modifiedCount,
        );
      }
    }

    try {
      await stripe.paymentMethods.attach(paymentMethod.stripe_pm_id, {
        customer: stripeCustomerId,
      });
    } catch (error) {
      if (error?.code !== "resource_already_attached") {
        throw error;
      }
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethod.stripe_pm_id },
    });

    const subscriptionParams = {
      customer: stripeCustomerId,
      items: [{ price: plan.stripe_price_id }],
      default_payment_method: paymentMethod.stripe_pm_id,
      expand: ["latest_invoice.payment_intent"],
      payment_behavior: "allow_incomplete",
    };

    console.log(
      "Creating Stripe subscription with params:",
      subscriptionParams,
    );
    const subscription = await stripe.subscriptions.create(subscriptionParams);
    console.log("Stripe subscription created:", {
      id: subscription.id,
      status: subscription.status,
    });

    const { currentPeriodStart, currentPeriodEnd } =
      getStripeSubscriptionPeriodDates(subscription);

    const savedSubscription = await Subscription.findOneAndUpdate(
      { stripe_subscription_id: subscription.id },
      {
        user_id: userId,
        plan_id: plan._id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log("Subscription saved to DB:", {
      id: savedSubscription._id,
      status: savedSubscription.status,
    });

    const paymentStatus =
      subscription.status === "active"
        ? "active"
        : subscription.status === "incomplete"
          ? "pending"
          : "failed";

    await Payment.create({
      user_id: userId,
      plan_id: plan._id,
      payment_method_id: paymentMethod._id,
      stripe_subscription_id: subscription.id,
      stripe_payment_intent_id:
        subscription.latest_invoice?.payment_intent?.id,
      status: paymentStatus,
      amount: plan.cost || 0,
      currency: plan.currency || "usd",
      due_date: currentPeriodEnd,
    });

    if (subscription.status === "incomplete") {
      return res.status(200).json({
        success: true,
        data: {
          status: "requires_action",
          client_secret:
            subscription.latest_invoice?.payment_intent?.client_secret || null,
          subscription_id: subscription.id,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription_id: savedSubscription.stripe_subscription_id,
        client_secret:
          subscription.latest_invoice?.payment_intent?.client_secret || null,
        status: savedSubscription.status,
      },
      message: "Subscription created.",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(
          error.message || "Subscription failed",
          error.statusCode || 500,
        );
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subscription_id } = req.body;

    if (!subscription_id) {
      throw new ErrorClass("subscription_id is required.", 400);
    }

    const subscription = await Subscription.findOne({
      stripe_subscription_id: subscription_id,
      user_id: userId,
    });

    if (!subscription) {
      throw new ErrorClass("Subscription not found.", 404);
    }

    const updated = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });

    subscription.cancel_at_period_end = updated.cancel_at_period_end;
    subscription.status = "canceled";
    const { currentPeriodStart, currentPeriodEnd } =
      getStripeSubscriptionPeriodDates(updated);
    subscription.current_period_start =
      currentPeriodStart || subscription.current_period_start;
    subscription.current_period_end =
      currentPeriodEnd || subscription.current_period_end;
    await subscription.save();

    // Update existing payment records to canceled status
    await Payment.updateMany(
      {
        user_id: userId,
        stripe_subscription_id: subscription.stripe_subscription_id,
      },
      {
        status: "cancelled",
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        subscription_id: subscription.stripe_subscription_id,
        cancel_at_period_end: true,
        status: "canceled",
        current_period_end: subscription.current_period_end,
      },
      message: "Subscription cancellation scheduled.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(
          error.message || "Subscription failed",
          error.statusCode || 500,
        );
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const trialLimit = 3;
    const requestedType = req.query?.feature;
    const subscriptions = await Subscription.find({
      user_id: userId,
      status: { $in: ["active", "past_due", "canceled"] },
    })
      .populate("plan_id")
      .sort({ updated_at: -1 });

    const trialCount = await Analysis.countDocuments({
      user: userId,
      type: "clinical",
    });

    const normalizeSubscription = (subscription) => {
      if (!subscription) return null;
      return {
        subscription_id: subscription.stripe_subscription_id,
        plan_id: subscription.plan_id?._id,
        status: subscription.status,
        plan: subscription.plan_id
          ? {
              name: subscription.plan_id.plan_name,
              type: subscription.plan_id.type,
              cost: subscription.plan_id.cost,
              billing_cycle: subscription.plan_id.feature_limits?.billing_cycle,
              _id: subscription.plan_id._id,
            }
          : null,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      };
    };

    const subscriptionsByType = {
      text: null,
      image: null,
    };
    let latestNormalizedSubscription = null;

    for (const subscription of subscriptions) {
      const planType = subscription.plan_id?.type;
      if (!planType) {
        continue;
      }

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
          // If Stripe fetch fails, return stored values.
        }
      }

      if (!latestNormalizedSubscription) {
        latestNormalizedSubscription = normalizeSubscription(subscription);
      }

      if (subscriptionsByType[planType]) {
        continue;
      }

      subscriptionsByType[planType] = normalizeSubscription(subscription);
    }

    const availableSubscriptions = Object.values(subscriptionsByType).filter(
      Boolean,
    );
    const normalizedSubscription =
      requestedType && subscriptionsByType[requestedType] !== undefined
        ? subscriptionsByType[requestedType]
        : latestNormalizedSubscription;

    return res.status(200).json({
      success: true,
      data: normalizedSubscription,
      subscriptions: subscriptionsByType,
      free_trials_used: trialCount,
      free_trials_total: trialLimit,
      free_trials_remaining: Math.max(0, trialLimit - trialCount),
      message: availableSubscriptions.length
        ? "Subscription status retrieved."
        : "No active subscription.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 10));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ user_id: userId })
        .populate("plan_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ user_id: userId }),
    ]);

    const items = payments.map((payment) => {
      return {
        id: payment._id,
        date: payment.created_at,
        plan_name: payment.plan_id?.plan_name || payment.plan_id?.name || "-",
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status, // Just use the payment status directly
        invoice_url: null,
        stripe_subscription_id: payment.stripe_subscription_id,
      };
    });

    const hasMore = page * limit < total;

    return res.status(200).json({
      success: true,
      data: {
        items,
        hasMore,
        total,
        page,
      },
      message: "Payment history retrieved.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};

export const getAdminSubscriptions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query?.page || 1));
    const limit = Math.max(1, Number(req.query?.limit || 10));
    const skip = (page - 1) * limit;
    const status = req.query?.status;
    const type = req.query?.type;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const subscriptions = await Subscription.find(filter)
      .populate("user_id", "name email")
      .populate("plan_id")
      .sort({ updated_at: -1 });

    const filteredSubscriptions = subscriptions.filter((subscription) => {
      if (!type) return true;
      return subscription.plan_id?.type === type;
    });

    const paginatedSubscriptions = filteredSubscriptions.slice(skip, skip + limit);

    const items = paginatedSubscriptions.map((subscription) => ({
      id: subscription._id,
      subscription_id: subscription.stripe_subscription_id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      updated_at: subscription.updated_at,
      user: subscription.user_id
        ? {
            id: subscription.user_id._id,
            name: subscription.user_id.name,
            email: subscription.user_id.email,
          }
        : null,
      plan: subscription.plan_id
        ? {
            id: subscription.plan_id._id,
            name: subscription.plan_id.plan_name,
            type: subscription.plan_id.type,
            cost: subscription.plan_id.cost,
            currency: subscription.plan_id.currency,
            billing_cycle: subscription.plan_id.feature_limits?.billing_cycle,
          }
        : null,
    }));

    const summary = {
      total: filteredSubscriptions.length,
      active: filteredSubscriptions.filter((item) => item.status === "active")
        .length,
      canceled: filteredSubscriptions.filter(
        (item) => item.status === "canceled",
      ).length,
      text: filteredSubscriptions.filter((item) => item.plan_id?.type === "text")
        .length,
      image: filteredSubscriptions.filter(
        (item) => item.plan_id?.type === "image",
      ).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        items,
        summary,
        page,
        total: filteredSubscriptions.length,
        hasMore: skip + paginatedSubscriptions.length < filteredSubscriptions.length,
      },
      message: "Admin subscriptions retrieved.",
    });
  } catch (error) {
    throw error instanceof ErrorClass
      ? error
      : new ErrorClass(error.message, error.statusCode);
  }
};
