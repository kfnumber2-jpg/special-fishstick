// Netlify Function: Stripe webhook for order fulfillment.
// Mapped from /api/webhook via netlify.toml. Set STRIPE_WEBHOOK_SECRET in the
// Netlify dashboard, then fill in the fulfillment logic below.
import Stripe from "stripe";

export const handler = async (event) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) {
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

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    // TODO: grant course access for session.customer_details?.email /
    // session.metadata.package (send credentials, add to community, etc.).
    console.log(
      `✅ Payment complete: ${session.metadata?.package} for ${session.customer_details?.email}`,
    );
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: true }),
  };
};
