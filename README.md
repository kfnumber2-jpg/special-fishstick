# APEX Performance — training-package sales site

A dynamic, 3D, scroll-driven landing page for selling an athletic training
course. Built with **Vite + React + TypeScript + [Motion](https://motion.dev)**
on a design-token system. Every sign-up unlocks the full training course; the
page offers three monthly coaching **tiers** plus a **one-time buy** option.

## Quick start

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # typecheck (tsc) + production build to dist/
npm run preview  # serve the production build locally
```

## What's on the page

- **Hero** — parallax 3D grid floor, drifting glow orbs, and a headline that
  lifts away as you scroll.
- **Credibility** — a marquee and stat block highlighting work with
  professional, collegiate, and top U.S. athletes.
- **The course** — four performance pillars and a "what's included" strip.
- **Packages** — three tiers (Rookie / Varsity / Elite) plus a set-apart
  one-time "Full Course" purchase. Each card has pointer-driven 3D tilt.
- **FAQ** and a **final sign-up CTA** with an email capture form.

## How it's organized

| File | What lives there |
| --- | --- |
| `src/index.css` | **Design tokens** — color, fluid type scale, spacing, easing. Edit these first; the whole site moves with them. |
| `src/App.css` | Component styles (nav, hero, pricing, FAQ, CTA, footer) and the 3D/perspective rules. |
| `src/App.tsx` | The page + Motion animations: `Reveal`, `ScrollPop` (scroll-driven 3D entrance), `Tilt` (pointer-driven 3D), parallax `Hero`, pricing data, and FAQ. |

## Motion / 3D notes

- `ScrollPop` maps scroll progress to `rotateX` + `translateZ` + `scale` so
  each block rotates up and pops toward the camera as it enters view.
- `Tilt` reads pointer position and springs the card's `rotateX`/`rotateY`.
- The `.site` element sets a shared `perspective` so all 3D shares one camera.
- `prefers-reduced-motion` is honored everywhere: `ScrollPop` falls back to a
  plain fade/rise, tilt and parallax switch off via `useReducedMotion()`, and
  CSS transitions are neutralized globally.

## Checkout (Stripe)

Real Stripe Checkout is wired in. Each pricing button (and the final sign-up
form) creates a Stripe Checkout Session server-side and redirects the buyer to
Stripe's hosted payment page. Your secret key stays in `.env` and never reaches
the browser.

**Pieces:**

| File | Role |
| --- | --- |
| `server/index.js` | Express server. `POST /api/create-checkout-session` creates the session; `/api/webhook` is a fulfillment stub; `/api/health` reports config status. |
| `src/checkout.ts` | `startCheckout(priceKey, email?)` — calls the API and redirects to Stripe. |
| `.env.example` | Template for your secret key + the four Price IDs. |

**One-time setup:**

1. `cp .env.example .env`
2. In the [Stripe dashboard](https://dashboard.stripe.com/products), create a
   Product + Price for each package. Make **Rookie / Varsity / Elite**
   *recurring (monthly)* and **Full Course** a *one-time* price.
3. Paste your `sk_...` secret key and the four `price_...` IDs into `.env`.

**Run it (two processes — Vite + the API):**

```bash
npm run dev:all   # Vite on :5173 (proxies /api) + checkout server on :8787
# or run them separately:
npm run dev        # front-end only
npm run server     # checkout API only
```

**Production:** `npm run build`, then `npm start` (serves `dist/` + the API
from one Node process). Set `PUBLIC_URL` so Stripe's success/cancel redirects
point at your domain. For Netlify, see below.

**Fulfillment:** add a webhook in Stripe pointing at `/api/webhook`, set
`STRIPE_WEBHOOK_SECRET`, and fill in the `checkout.session.completed` handler
(in `lib/checkout-core.js`'s callers: `server/index.js` for local,
`netlify/functions/webhook.mjs` for production) to grant course access.

> The price *labels* on the cards (`$49`, `$99`, …) are display copy in
> `src/App.tsx`. The real amount charged comes from the Stripe Price you map to
> each `priceKey` — keep the two in sync.

## Deploy to Netlify

The site deploys as a static front-end (`dist/`) plus serverless functions for
checkout. Config lives in `netlify.toml`, which routes `/api/*` to the
functions in `netlify/functions/`.

1. Push this repo to GitHub (done) and, in Netlify, **Add new site → Import an
   existing project**, then pick this repo. Netlify reads `netlify.toml`
   automatically (build `npm run build`, publish `dist`, functions
   `netlify/functions`).
2. Under **Site settings → Environment variables**, add:
   `STRIPE_SECRET_KEY`, `PRICE_ROOKIE`, `PRICE_VARSITY`, `PRICE_ELITE`,
   `PRICE_FULL_COURSE` (and optionally `STRIPE_WEBHOOK_SECRET`, `PUBLIC_URL`).
3. **Deploy.** Your live URL will be `https://<your-site>.netlify.app` (add a
   custom domain in Netlify if you have one).
4. For fulfillment, create a Stripe webhook pointing at
   `https://<your-site>.netlify.app/api/webhook` and set
   `STRIPE_WEBHOOK_SECRET` to its signing secret.

> Local dev uses the Express server (`lib/checkout-core.js` is shared, so dev
> and production behave the same). To test the Netlify build locally instead,
> install the Netlify CLI and run `netlify dev`.

## Design direction

One restrained palette, one bold accent (chartreuse on near-black), a serif
display face (Instrument Serif) against a grotesk body (Inter). Swap the accent
and fonts in `src/index.css` to rebrand.
