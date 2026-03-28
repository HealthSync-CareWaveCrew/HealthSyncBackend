import stripe from "../config/stripe.js";
import Payment from "../models/Payment.model.js";
import PaymentMethod from "../models/PaymentMethod.model.js";
import Subscription from "../models/Subscription.model.js";

const toDate = (unixSeconds) => {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: `Webhook Error: ${error.message}`,
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripe_subscription_id: subscription.id },
          {
            status: subscription.status,
            current_period_start: toDate(subscription.current_period_start),
            current_period_end: toDate(subscription.current_period_end),
            trial_end: toDate(subscription.trial_end),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          },
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripe_subscription_id: subscription.id },
          { status: "canceled", cancel_at_period_end: false },
        );
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const dueDate =
          invoice.lines?.data?.[0]?.period?.end || invoice.period_end;
        const stripePaymentIntentId = invoice.payment_intent || null;
        const paymentIntentKey =
          stripePaymentIntentId || `invoice_${invoice.id}`;

        const subscription = await Subscription.findOne({
          stripe_subscription_id: invoice.subscription,
        });

        if (subscription) {
          const stripePmId = invoice.default_payment_method || null;
          const paymentMethod = stripePmId
            ? await PaymentMethod.findOne({ stripe_pm_id: stripePmId })
            : null;

          await Payment.findOneAndUpdate(
            { stripe_payment_intent_id: paymentIntentKey },
            {
              user_id: subscription.user_id,
              plan_id: subscription.plan_id,
              payment_method_id: paymentMethod?._id || undefined,
              stripe_subscription_id: invoice.subscription,
              stripe_payment_intent_id: paymentIntentKey,
              status: "active",
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency || "usd",
              due_date: toDate(dueDate),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripePaymentIntentId = invoice.payment_intent || null;
        const paymentIntentKey =
          stripePaymentIntentId || `invoice_${invoice.id}`;
        const dueDate =
          invoice.lines?.data?.[0]?.period?.end || invoice.period_end;
        const subscription = await Subscription.findOne({
          stripe_subscription_id: invoice.subscription,
        });

        if (subscription) {
          const stripePmId = invoice.default_payment_method || null;
          const paymentMethod = stripePmId
            ? await PaymentMethod.findOne({ stripe_pm_id: stripePmId })
            : null;

          await Payment.findOneAndUpdate(
            { stripe_payment_intent_id: paymentIntentKey },
            {
              user_id: subscription.user_id,
              plan_id: subscription.plan_id,
              payment_method_id: paymentMethod?._id || undefined,
              stripe_subscription_id: invoice.subscription,
              stripe_payment_intent_id: paymentIntentKey,
              status: "failed",
              amount: (invoice.amount_due || 0) / 100,
              currency: invoice.currency || "usd",
              due_date: toDate(dueDate),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        }
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await Payment.findOneAndUpdate(
          { stripe_payment_intent_id: paymentIntent.id },
          { status: "active" },
        );
        break;
      }
      default:
        break;
    }

    return res.status(200).json({
      success: true,
      data: { received: true },
      message: "Webhook received.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message,
    });
  }
};
