// Netlify Function: Stripe webhook for order fulfillment.
// Mapped from /api/webhook via netlify.toml. Set STRIPE_WEBHOOK_SECRET in the
// Netlify dashboard, then implement `fulfill()` to grant course access.
import Stripe from "stripe";
import { fulfillOrder } from "../../lib/fulfillment.js";

export const handler = async (event) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) {
    // Not configured — acknowledge so Stripe doesn't retry forever.
    return { statusCode: 200, body: "" };
  }

  const stripe = new Stripe(secret);
  // Stripe needs the exact raw payload to verify the signature.
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      raw,
      event.headers["stripe-signature"],
      whSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      await fulfillOrder(stripeEvent.data.object);
    }
  } catch (err) {
    // Returning 500 tells Stripe to retry delivery later.
    console.error("Fulfillment failed:", err.message);
    return { statusCode: 500, body: "Fulfillment error" };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: true }),
  };
};
