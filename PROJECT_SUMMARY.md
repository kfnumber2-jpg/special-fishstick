# APEX Performance — Project Summary & Handoff

_Last updated: 2026-06-04_

A catch-up document for the training-package sales website. Read this top to
bottom to know exactly where things stand and what to do next.

---

## 1. What this project is

A dynamic, 3D, scroll-driven **landing page that sells an athletic training
course**. Every sign-up unlocks the full course. Buyers can pick a monthly
coaching **tier** or **buy the whole course once**. Payments run through
**Stripe Checkout**. The site is built to deploy on **Netlify**.

- **Brand on the page:** "APEX Performance" (placeholder — easy to rename).
- **Tech stack:** Vite + React 19 + TypeScript + Motion (animation), with a
  small Node/serverless backend for Stripe.

---

## 2. What the website includes

- **Hero** — parallax 3D grid "floor," drifting glow orbs, headline that lifts
  away as you scroll.
- **Credibility marquee** — your athletes' names scrolling across.
- **Track record + stats** — "professional, collegiate, and top U.S. athletes,"
  with a stats grid (years coaching, NFL pros, 100+ sessions, 4.9★).
- **Athletes I've personally trained** — showcase cards (3D pop + tilt):
  - **Chris Henry Jr.** — Ohio State — speed & agility
  - **Adam "Pacman" Jones** — NFL — speed & explosion
  - **Darqueze Dennard** — NFL — agility & speed
  - **Ace Olston** — Notre Dame commit — speed & explosion
  - **DeMarcus Henry** — top-ranked HS basketball — speed, explosion & agility
  - ⚠️ **Double-check these spellings** — two were transcribed to common forms
    ("Pacman" Jones, Darqueze Dennard). Edit in `src/App.tsx` if needed.
- **The course** — four pillars (Strength & Power, Speed & Agility, Mobility &
  Recovery, Nutrition & Mindset) + a "what's included" list (every package
  unlocks the full course).
- **How it works** — three steps: pick a package → unlock the full system →
  train, track, and level up.
- **Testimonials** — three quote cards. ⚠️ These are **sample/placeholder
  quotes with role-based names** (e.g. "Division I Wide Receiver") so nothing is
  misattributed. Replace them with real, approved quotes in `src/App.tsx`
  (`TESTIMONIALS`).
- **Results gallery** — a dynamic 3D **coverflow carousel** (swipe/drag, prev/
  next arrows, thumbnail strip) with **Videos / Photos** tabs and a lightbox
  player. Placeholder media lives in `public/gallery/`; replace it and edit the
  `PHOTOS` / `VIDEOS` lists in `src/App.tsx` (`image`, `caption`, `desc`, and a
  `youtubeId` or `videoSrc` for videos).
- **Hero background** — an athletic motion-graphic at `public/hero-bg.svg`
  (swap for a real photo anytime).
- **Welcome email** — after purchase the webhook emails the buyer their access
  link via Resend (`lib/fulfillment.js`); set `RESEND_API_KEY`, `FROM_EMAIL`,
  `COURSE_ACCESS_URL` to enable.
- **Footer** — brand blurb, navigation columns, contact links, and
  Privacy/Terms/Refund placeholders (the legal links currently point to `#`).
- **Packages / pricing** — three monthly tiers + a set-apart one-time option:
  | Package | Price | Billing | Stripe `priceKey` |
  |---|---|---|---|
  | Rookie | $49 | monthly | `rookie` |
  | Varsity (most popular) | $99 | monthly | `varsity` |
  | Elite | $199 | monthly | `elite` |
  | The Full Course | $249 | one-time | `full_course` |
- **FAQ** and a **final sign-up CTA** with email capture (routes to checkout).
- Honors `prefers-reduced-motion` throughout (animations soften/disable).

> The dollar amounts on the cards are **display text** in `src/App.tsx`. The
> amount actually charged comes from the Stripe Price you connect to each
> `priceKey`. Keep the two in sync.

---

## 3. How checkout works

1. A buyer clicks a package button (or submits the email form).
2. The browser calls `POST /api/create-checkout-session` with a `priceKey`.
3. The backend creates a **Stripe Checkout Session** (subscription for tiers,
   one-time payment for the course) and returns the Stripe URL.
4. The buyer is redirected to Stripe's secure hosted checkout page.
5. After paying they return to the site with a success/cancel banner.

**Your Stripe secret key never touches the browser** — it lives only in
environment variables on the server/Netlify.

---

## 4. Key files (where to edit what)

| File | What it controls |
|---|---|
| `src/App.tsx` | All page content: copy, athlete list, pillars, pricing tiers, FAQ. **Edit text here.** |
| `src/App.css` | Visual styling, 3D effects, layout. |
| `src/index.css` | Design tokens — colors, accent, fonts, type scale. Rebrand here. |
| `src/checkout.ts` | Client code that starts Stripe checkout. |
| `lib/checkout-core.js` | Shared checkout logic (the package→Stripe map lives here). |
| `server/index.js` | Local dev API (Express) for running on your machine. |
| `netlify/functions/*.mjs` | Production serverless checkout (used by Netlify). |
| `netlify.toml` | Netlify build + routing config. |
| `.env.example` | Template listing the env vars you must provide. |
| `README.md` | Full technical docs. |

---

## 5. Running it locally (optional)

On a machine with Node.js installed:

```bash
npm install
cp .env.example .env      # then paste your Stripe keys/IDs into .env
npm run dev:all           # Vite app on http://localhost:5173 + API on :8787
```

Open http://localhost:5173. Without Stripe values the page still loads; the
buy buttons just say "not configured yet."

---

## 6. Git / repository status

- **Repo:** `kfnumber2-jpg/special-fishstick`
- **Working branch:** `claude/upbeat-allen-XJ5mf` (all work is pushed here)
- **PR #1:** already merged earlier.
- The branch is clean and builds. Everything described above is committed.

---

## 7. Deploy to Netlify — step by step

You need: a free **Netlify account** and your **Stripe** account (to get the
keys + create the four products/prices).

### Step A — Create your Stripe products (gets you the IDs you'll paste later)

1. Log in at **https://dashboard.stripe.com**.
2. Go to **Product catalog → Add product**. Create four products:
   - **Rookie** — pricing model **Recurring**, **$49 / month**.
   - **Varsity** — **Recurring**, **$99 / month**.
   - **Elite** — **Recurring**, **$199 / month**.
   - **The Full Course** — pricing model **One-off (one time)**, **$249**.
3. For each, open the product and copy its **Price ID** (looks like
   `price_` followed by a string). Keep these four handy.
4. Get your **secret key**: **Developers → API keys → Secret key** (starts with
   `sk_`). Use the **test mode** key first to try it safely; switch to the
   live key when you're ready to take real money.

### Step B — Connect the repo to Netlify

1. Log in at **https://app.netlify.com**.
2. Click **Add new site → Import an existing project**.
3. Choose **GitHub** and authorize Netlify if prompted.
4. Select the repository **`kfnumber2-jpg/special-fishstick`**.
5. When asked for the **branch to deploy**, pick **`claude/upbeat-allen-XJ5mf`**
   (or merge it to `main` first and deploy `main`).
6. Netlify auto-fills the build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
   Leave them as detected.
7. **Don't deploy yet** — first add the environment variables (next step). If
   Netlify already deployed, that's fine; you'll redeploy after Step C.

### Step C — Add environment variables

1. In your new site: **Site configuration → Environment variables → Add a
   variable** (add them one by one, or use "Import from a .env file").
2. Add these keys with the values from Step A:
   - `STRIPE_SECRET_KEY` = your `sk_...` secret key
   - `PRICE_ROOKIE` = the Rookie price ID
   - `PRICE_VARSITY` = the Varsity price ID
   - `PRICE_ELITE` = the Elite price ID
   - `PRICE_FULL_COURSE` = the Full Course price ID
3. Optional:
   - `PUBLIC_URL` = your final site URL (e.g. `https://your-site.netlify.app`)
   - `STRIPE_WEBHOOK_SECRET` = added later in Step E

### Step D — Deploy

1. Go to **Deploys → Trigger deploy → Deploy site** (or push a commit).
2. Wait for the build to finish (1–2 min). Your live link appears at the top:
   **`https://<your-site-name>.netlify.app`**.
3. To rename it: **Site configuration → Change site name**. To use your own
   domain: **Domain management → Add a custom domain**.
4. Open the site and test a purchase. In Stripe **test mode**, use card
   number **4242 4242 4242 4242**, any future expiry, any CVC, any ZIP.

### Step E — (Optional) Turn on order fulfillment via webhook

This lets the site react when a payment succeeds (e.g. email access). The
handler is currently a stub you can fill in later.

1. In Stripe: **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: **`https://<your-site-name>.netlify.app/api/webhook`**.
3. Events to send: select **`checkout.session.completed`**.
4. After creating it, copy the **Signing secret** (starts with `whsec_`).
5. In Netlify, add env var `STRIPE_WEBHOOK_SECRET` = that signing secret, then
   redeploy.
6. Fill in the "grant course access" logic in
   `netlify/functions/webhook.mjs` (marked with a `TODO`).

### Step F — Go live (when ready for real payments)

1. Switch Stripe to **live mode** (toggle in the dashboard).
2. Recreate the four products/prices in live mode (or copy them over) and grab
   the live **Price IDs** and live **secret key** (`sk_live_...`).
3. Update the Netlify environment variables with the **live** values.
4. Redeploy. Real cards will now be charged.

---

## 8. Good next steps (not done yet)

- ~~Confirm athlete name spellings~~ — confirmed correct.
- ~~Add legal pages~~ — done (`public/privacy.html`, `terms.html`,
  `refund.html`); **review the template wording** with a professional and set
  the "Last updated" dates.
- ~~Scaffold webhook fulfillment~~ — done (`lib/fulfillment.js`); **implement
  the delivery TODO** (email login / grant course access) when ready.
- **Replace the sample testimonials** with real, approved quotes (`TESTIMONIALS`
  in `src/App.tsx`).
- **Rename the brand** from "APEX Performance" if you have a real business name
  (also update the footer contact email `coach@apexperformance.com`).
- **Replace placeholder stats** (years, ratings) with your real numbers.

> **Deploy branch:** there is no `main` branch. Point Netlify at
> **`claude/upbeat-allen-XJ5mf`**, which holds all the latest clean work.

---

## 9. Quick reference — the four things only you can provide

1. `STRIPE_SECRET_KEY` (from Stripe → Developers → API keys)
2. The four `PRICE_*` IDs (from the products you create in Stripe)
3. A Netlify account connected to this GitHub repo
4. (Optional) `STRIPE_WEBHOOK_SECRET` for fulfillment
