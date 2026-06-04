// Netlify Function: creates a Stripe Checkout Session.
// Mapped from /api/create-checkout-session via netlify.toml redirects.
import { createCheckoutSession } from "../../lib/checkout-core.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  const origin =
    event.headers.origin ||
    (event.headers.host ? `https://${event.headers.host}` : "");

  const result = await createCheckoutSession(process.env, {
    priceKey: payload.priceKey,
    email: payload.email,
    origin,
  });

  return {
    statusCode: result.url ? 200 : result.status || 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result.url ? { url: result.url } : { error: result.error }),
  };
};
