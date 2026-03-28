import dotenv from "dotenv";
import Stripe from "stripe";

// Ensure environment variables are loaded before we initialize Stripe.
dotenv.config();

const { STRIPE_SECRET_KEY } = process.env;

if (!STRIPE_SECRET_KEY) {
  console.warn("WARNING: STRIPE_SECRET_KEY is missing in .env file.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

export default stripe;
