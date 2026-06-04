// ============================================================
// APEX Performance — Stripe Checkout server
//
// Creates Stripe Checkout Sessions for each training package. The client
// POSTs a `priceKey` to /api/create-checkout-session and is redirected to
// Stripe's hosted checkout. Secret keys live in .env and never reach the
// browser. Run with:  npm run server   (or  npm run dev:all  alongside Vite)
// ============================================================
import express from "express";
import Stripe from "stripe";
import "dotenv/config";

const PORT = process.env.PORT || 8787;
const app = express();

const secret = process.env.STRIPE_SECRET_KEY;
const stripe = secret ? new Stripe(secret) : null;

// Map the front-end's priceKey -> Stripe Price ID + checkout mode.
// Subscriptions for the tiers; a one-time payment for the full course.
const PACKAGES = {
  rookie: { price: process.env.PRICE_ROOKIE, mode: "subscription" },
  varsity: { price: process.env.PRICE_VARSITY, mode: "subscription" },
  elite: { price: process.env.PRICE_ELITE, mode: "subscription" },
  full_course: { price: process.env.PRICE_FULL_COURSE, mode: "payment" },
};

// The Stripe webhook needs the raw request body to verify its signature, so
// it must bypass the JSON body parser. Everything else parses JSON.
app.use((req, res, next) =>
  req.originalUrl === "/api/webhook" ? next() : express.json()(req, res, next),
);

app.get("/api/health", (_req, res) => {
  const configured =
    Boolean(secret) &&
    Object.values(PACKAGES).every((p) => Boolean(p.price));
  res.json({ ok: true, stripeConfigured: configured });
});

app.post("/api/create-checkout-session", async (req, res) => {
  const { priceKey, email } = req.body ?? {};
  const pkg = PACKAGES[priceKey];

  if (!pkg) {
    return res.status(400).json({ error: `Unknown package: "${priceKey}".` });
  }
  if (!stripe || !pkg.price) {
    return res.status(503).json({
      error:
        "Checkout isn't configured yet. Add your Stripe secret key and price IDs to .env (see .env.example).",
    });
  }

  // Build absolute return URLs from the request origin (works in dev and prod).
  const origin =
    process.env.PUBLIC_URL ||
    req.headers.origin ||
    `${req.protocol}://${req.get("host")}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: pkg.mode,
      line_items: [{ price: pkg.price, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled#pricing`,
      metadata: { package: priceKey },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
});

// Optional: order-fulfillment webhook. Wire this up in the Stripe dashboard
// and set STRIPE_WEBHOOK_SECRET to grant access to your course on payment.
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !whSecret) return res.status(200).end();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        whSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // TODO: grant course access for session.customer_email /
      // session.metadata.package (send credentials, add to community, etc.).
      console.log(
        `✅ Payment complete: ${session.metadata?.package} for ${session.customer_details?.email}`,
      );
    }
    res.json({ received: true });
  },
);

// In production, serve the built site from the same server.
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
}

app.listen(PORT, () => {
  const ready =
    stripe && Object.values(PACKAGES).every((p) => Boolean(p.price));
  console.log(`Checkout server on http://localhost:${PORT}`);
  if (!ready) {
    console.log(
      "⚠️  Stripe not fully configured — copy .env.example to .env and fill in your keys + price IDs.",
    );
  }
});
