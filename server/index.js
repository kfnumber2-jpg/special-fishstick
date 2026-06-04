// ============================================================
// APEX Performance — local Stripe Checkout dev server.
//
// In production the checkout runs as Netlify Functions (see netlify/functions).
// This Express server mirrors them for local development so `npm run dev:all`
// gives the Vite app a working /api to talk to. Both share lib/checkout-core.js.
// Run with:  npm run server   (or  npm run dev:all  alongside Vite)
// ============================================================
import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import {
  createCheckoutSession,
  isConfigured,
} from "../lib/checkout-core.js";

const PORT = process.env.PORT || 8787;
const app = express();

// The Stripe webhook needs the raw request body to verify its signature, so
// it must bypass the JSON body parser. Everything else parses JSON.
app.use((req, res, next) =>
  req.originalUrl === "/api/webhook" ? next() : express.json()(req, res, next),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stripeConfigured: isConfigured(process.env) });
});

app.post("/api/create-checkout-session", async (req, res) => {
  const { priceKey, email } = req.body ?? {};
  const origin =
    req.headers.origin || `${req.protocol}://${req.get("host")}`;
  const result = await createCheckoutSession(process.env, {
    priceKey,
    email,
    origin,
  });
  if (result.url) return res.json({ url: result.url });
  res.status(result.status || 500).json({ error: result.error });
});

// Optional: order-fulfillment webhook. Wire this up in the Stripe dashboard
// and set STRIPE_WEBHOOK_SECRET to grant access to your course on payment.
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!process.env.STRIPE_SECRET_KEY || !whSecret) return res.status(200).end();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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
      // TODO: grant course access for session.customer_details?.email /
      // session.metadata.package (send credentials, add to community, etc.).
      console.log(
        `✅ Payment complete: ${session.metadata?.package} for ${session.customer_details?.email}`,
      );
    }
    res.json({ received: true });
  },
);

app.listen(PORT, () => {
  console.log(`Checkout server on http://localhost:${PORT}`);
  if (!isConfigured(process.env)) {
    console.log(
      "⚠️  Stripe not fully configured — copy .env.example to .env and fill in your keys + price IDs.",
    );
  }
});
