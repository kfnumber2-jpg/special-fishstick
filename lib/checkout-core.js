// ============================================================
// Shared checkout logic — single source of truth for both the local Express
// dev server (server/index.js) and the Netlify Functions used in production.
// ============================================================
import Stripe from "stripe";

/** Map the front-end's priceKey -> Stripe Price ID + checkout mode. */
export function getPackages(env) {
  return {
    rookie: { price: env.PRICE_ROOKIE, mode: "subscription" },
    varsity: { price: env.PRICE_VARSITY, mode: "subscription" },
    elite: { price: env.PRICE_ELITE, mode: "subscription" },
    full_course: { price: env.PRICE_FULL_COURSE, mode: "payment" },
  };
}

/** True when the secret key and all four Price IDs are present. */
export function isConfigured(env) {
  const pkgs = getPackages(env);
  return (
    Boolean(env.STRIPE_SECRET_KEY) &&
    Object.values(pkgs).every((p) => Boolean(p.price))
  );
}

/**
 * Create a Stripe Checkout Session for a package.
 * Returns { url } on success or { error, status } on failure.
 */
export async function createCheckoutSession(env, { priceKey, email, origin }) {
  const pkg = getPackages(env)[priceKey];

  if (!pkg) {
    return { error: `Unknown package: "${priceKey}".`, status: 400 };
  }
  if (!env.STRIPE_SECRET_KEY || !pkg.price) {
    return {
      error:
        "Checkout isn't configured yet. Add your Stripe secret key and price IDs (see .env.example).",
      status: 503,
    };
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const base = env.PUBLIC_URL || origin || "";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: pkg.mode,
      line_items: [{ price: pkg.price, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancelled#pricing`,
      metadata: { package: priceKey },
    });
    return { url: session.url, status: 200 };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return { error: "Could not start checkout. Please try again.", status: 500 };
  }
}
