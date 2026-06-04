import { motion, useReducedMotion, type Variants } from "motion/react";
import "./App.css";

/* Shared entrance: a quiet rise + fade, staggered by parents. */
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Reveal on scroll — animates once when ~25% enters the viewport. */
function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

const CAPABILITIES = [
  "Design systems",
  "Motion",
  "Brand",
  "Performance",
  "Accessibility",
  "Prototyping",
];

const FEATURES = [
  {
    title: "A design system, not a template",
    body: "Tokens for color, type, space, and motion live in one place. Change the system, the whole site moves.",
  },
  {
    title: "Motion that earns its place",
    body: "Powered by Motion — entrance, scroll-reveal, and micro-interactions that respect reduced-motion by default.",
  },
  {
    title: "No generic AI slop",
    body: "Opinionated typography, one bold accent, and real hierarchy. Built to look made, not generated.",
  },
];

const STATS = [
  { num: "60fps", label: "Spring-based motion" },
  { num: "0", label: "Layout-shift budget" },
  { num: "100", label: "Lighthouse target" },
  { num: "AA", label: "Contrast baseline" },
];

export default function App() {
  const reduce = useReducedMotion();

  return (
    <div className="site">
      <nav className="nav">
        <div className="shell nav__inner">
          <a className="brand" href="#top">
            <span className="brand__mark" aria-hidden="true" />
            Fishstick&nbsp;Studio
          </a>
          <div className="nav__links">
            <a className="nav__hideable" href="#work">
              Work
            </a>
            <a className="nav__hideable" href="#approach">
              Approach
            </a>
            <a className="btn btn--ghost" href="#start">
              Start a project
            </a>
          </div>
        </div>
      </nav>

      <header className="shell hero" id="top">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span className="eyebrow" variants={rise}>
            Vite · React · Motion
          </motion.span>

          <motion.h1 className="hero__title" variants={rise}>
            We build websites that feel <em>inevitable</em>.
          </motion.h1>

          <motion.p className="hero__lead" variants={rise}>
            A studio-grade starter, already wired for distinctive frontend
            work — design tokens, scroll-reveal, and motion you can ship.
          </motion.p>

          <motion.div className="hero__cta" variants={rise}>
            <a className="btn btn--primary" href="#start">
              Start a project →
            </a>
            <a className="btn btn--ghost" href="#approach">
              See the approach
            </a>
          </motion.div>
        </motion.div>
      </header>

      {/* Infinite marquee — paused entirely when reduced-motion is on. */}
      <div className="marquee" aria-hidden="true">
        <motion.div
          className="marquee__row"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 22, ease: "linear", repeat: Infinity }}
        >
          {[0, 1].map((dup) => (
            <span key={dup}>
              {CAPABILITIES.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      <main className="shell">
        <section className="section" id="approach">
          <Reveal className="section__head">
            <motion.span className="eyebrow" variants={rise}>
              The approach
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              Opinionated by default, yours to override.
            </motion.h2>
          </Reveal>

          <Reveal className="grid">
            {FEATURES.map((f, i) => (
              <motion.article className="card" key={f.title} variants={rise}>
                <span className="card__index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="card__title">{f.title}</h3>
                <p className="card__body">{f.body}</p>
              </motion.article>
            ))}
          </Reveal>
        </section>

        <Reveal>
          <section className="stats" id="work">
            {STATS.map((s) => (
              <motion.div key={s.label} variants={rise}>
                <div className="stat__num">{s.num}</div>
                <div className="stat__label">{s.label}</div>
              </motion.div>
            ))}
          </section>
        </Reveal>

        <section className="section" id="start">
          <Reveal>
            <motion.div
              className="cta"
              variants={rise}
              whileHover={reduce ? undefined : { y: -4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="eyebrow">Ready when you are</span>
              <h2 className="cta__title">
                Let's build something <em>worth shipping</em>.
              </h2>
              <p className="hero__lead">
                Edit <code>src/App.tsx</code>, tweak the tokens in{" "}
                <code>src/index.css</code>, and make it yours.
              </p>
              <div className="hero__cta">
                <a className="btn btn--primary" href="mailto:hello@example.com">
                  Get in touch
                </a>
              </div>
            </motion.div>
          </Reveal>
        </section>
      </main>

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} Fishstick Studio — starter kit</span>
        <span>
          Built with{" "}
          <a href="https://motion.dev" target="_blank" rel="noreferrer">
            Motion
          </a>{" "}
          ·{" "}
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            Vite
          </a>
        </span>
      </footer>
    </div>
  );
}
