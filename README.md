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

## Wiring up checkout

The pricing CTAs link to the `#signup` section, and the form currently shows a
placeholder `alert`. Point the buttons and the form submit at your payment
provider (Stripe Checkout, etc.) to take real orders.

## Design direction

One restrained palette, one bold accent (chartreuse on near-black), a serif
display face (Instrument Serif) against a grotesk body (Inter). Swap the accent
and fonts in `src/index.css` to rebrand.
