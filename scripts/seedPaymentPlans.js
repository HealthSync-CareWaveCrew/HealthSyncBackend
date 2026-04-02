import dotenv from "dotenv";
import stripe from "../config/stripe.js";
import connectDB from "../config/dbConnection.js";
import PaymentPlan from "../models/PaymentPlan.model.js";

dotenv.config();

const buildPlanData = async ({ priceId, type, defaultName }) => {
  const price = await stripe.prices.retrieve(priceId, {
    expand: ["product"],
  });

  const product = typeof price.product === "object" ? price.product : null;
  const billingCycle = price.recurring?.interval || "one_time";
  const planName =
    product?.name || price.nickname || `${defaultName} ${billingCycle}`.trim();

  return {
    plan_name: planName,
    cost: (price.unit_amount || 0) / 100,
    currency: price.currency || "usd",
    type,
    stripe_product_id: product?.id || price.product,
    stripe_price_id: price.id,
    isActive: price.active,
    description: product?.description || "",
    feature_limits: {
      free_trials: type === "text" ? 3 : 0,
      billing_cycle: billingCycle,
    },
  };
};

const seedPaymentPlans = async () => {
  await connectDB();

  const priceConfigs = [
    {
      envKey: "STRIPE_TEXT_MONTHLY_PRICE_ID",
      type: "text",
      defaultName: "Text Monthly",
    },
    {
      envKey: "STRIPE_TEXT_YEARLY_PRICE_ID",
      type: "text",
      defaultName: "Text Yearly",
    },
    {
      envKey: "STRIPE_IMAGE_MONTHLY_PRICE_ID",
      type: "image",
      defaultName: "Image Monthly",
    },
    {
      envKey: "STRIPE_IMAGE_YEARLY_PRICE_ID",
      type: "image",
      defaultName: "Image Yearly",
    },
  ];

  for (const config of priceConfigs) {
    const priceId = process.env[config.envKey];
    if (!priceId) {
      console.warn(`Missing ${config.envKey}. Skipping.`);
      continue;
    }

    const planData = await buildPlanData({
      priceId,
      type: config.type,
      defaultName: config.defaultName,
    });

    await PaymentPlan.findOneAndUpdate(
      { stripe_price_id: planData.stripe_price_id },
      planData,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    console.log(`Upserted plan for ${config.envKey}: ${planData.plan_name}`);
  }

  console.log("Payment plan seed complete.");
  process.exit(0);
};

seedPaymentPlans().catch((error) => {
  console.error("Payment plan seed failed:", error.message);
  process.exit(1);
});
