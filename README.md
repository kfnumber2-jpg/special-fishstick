# Fishstick Studio — studio-grade starter

A small, opinionated starting point for building distinctive websites:
**Vite + React + TypeScript + [Motion](https://motion.dev)**, with a real
design-token system and scroll-reveal animation already wired in.

## Quick start

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # typecheck (tsc) + production build to dist/
npm run preview  # serve the production build locally
```

## How it's organized

| File | What lives there |
| --- | --- |
| `src/index.css` | **Design tokens** — color, fluid type scale, spacing, easing. Edit these first; the whole site moves with them. |
| `src/App.css` | Component styles (nav, hero, cards, CTA, footer). |
| `src/App.tsx` | The page + Motion animations (`rise`/`stagger` variants, a `Reveal` scroll wrapper, an infinite marquee). |

## Motion notes

- Entrance and scroll-reveal use shared `rise` / `stagger` variants.
- `Reveal` animates a section once when ~25% of it enters the viewport.
- `prefers-reduced-motion` is honored: the marquee and hover lifts switch
  off via `useReducedMotion()`, and CSS transitions are neutralized globally.

## Design direction

One restrained palette, one bold accent (chartreuse on near-black), a serif
display face (Instrument Serif) against a grotesk body (Inter), and generous
whitespace. Swap the accent and fonts in `src/index.css` to rebrand.

---

Scaffolded with `create-vite` (`react-ts`). Pairs well with the
`frontend-design` and `impeccable` Claude Code plugins.
