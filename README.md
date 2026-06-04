# Apex Performance — athletic training sales site

A dynamic, 3D, scroll-driven one-page site for selling a complete athletic
training course. Built with **Vite + React + TypeScript + [Motion](https://motion.dev)**.

## What it does

- **Sells the full course to everyone** — every plan includes the entire
  training program, no locked modules.
- **Three subscription tiers** (Foundation / Performance / Elite) **plus a
  one-time purchase** for lifetime access.
- **Credibility built in** — calls out training professional, collegiate, and
  top U.S. athletes throughout.
- **Motion on every scroll**: a sticky pinned 3D "system" scene where panels
  rotate in and out, parallax hero, pop-in cards, pointer-tilt 3D cards, an
  infinite credibility marquee, and a scroll-progress bar — all driving toward
  the pricing CTA.
- **Accessible**: honors `prefers-reduced-motion` (tilt, parallax, and looping
  marquees switch off).

## Quick start

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # typecheck (tsc) + production build to dist/
npm run preview  # serve the production build
```

## Where to edit

| File | What lives there |
| --- | --- |
| `src/index.css` | Design tokens — colors, the two accents, fluid type, spacing. |
| `src/App.css` | All component styles (hero, pinned scene, pricing, etc.). |
| `src/App.tsx` | Page + content arrays (`PLANS`, `ONE_TIME`, `DELIVERABLES`, `STATS`, `QUOTES`, `PHASES`) and all Motion logic. |

### Make it yours

- **Pricing**: edit the `PLANS` array and `ONE_TIME` object in `src/App.tsx`.
- **Brand name**: search/replace `Apex Performance`.
- **Testimonials**: the `QUOTES` are clearly-labeled samples — swap in real,
  permissioned athlete quotes before going live.
- **Checkout**: the CTA buttons are placeholders (`#start`). Wire them to your
  payment provider (Stripe Checkout / Payment Links work well per plan).

> Note: stats and testimonials are placeholders. Use real numbers and only
> athlete endorsements you have permission to publish.
