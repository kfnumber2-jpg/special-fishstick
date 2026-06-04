import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type Variants,
} from "motion/react";
import "./App.css";

/* ------------------------------------------------------------------ */
/* Motion presets                                                      */
/* ------------------------------------------------------------------ */
const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/* A card that "pops out" of the page when scrolled into view. */
const pop: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -22, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

function Reveal({
  children,
  className,
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Pointer-tilt card (real 3D)                                         */
/* ------------------------------------------------------------------ */
function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  }
  function reset() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      className={className}
      variants={pop}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={reduce ? undefined : { rotateX: srx, rotateY: sry }}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Pinned scroll scene — one panel rotates out, the next rotates in    */
/* ------------------------------------------------------------------ */
const PHASES = [
  {
    n: "01",
    title: "Assess",
    body: "We meet you where you are — your sport, your gaps, your goals. The full course adapts to all of them.",
  },
  {
    n: "02",
    title: "Build",
    body: "Train the exact system used by the pros: strength, speed, mobility, recovery. Programmed, not guessed.",
  },
  {
    n: "03",
    title: "Dominate",
    body: "Step on the field, court, or track undeniable. This is how the top athletes in the country prepare.",
  },
];

function ScenePanel({
  progress,
  index,
  total,
  phase,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  phase: (typeof PHASES)[number];
}) {
  const seg = 1 / total;
  const start = index * seg;
  const end = start + seg;
  const opacity = useTransform(
    progress,
    [start - 0.05, start + 0.04, end - 0.04, end + 0.05],
    [0, 1, 1, 0],
  );
  const rotateX = useTransform(
    progress,
    [start - 0.08, start + 0.05, end - 0.05, end + 0.08],
    [45, 0, 0, -45],
  );
  const scale = useTransform(
    progress,
    [start - 0.05, start + 0.05, end - 0.05, end + 0.05],
    [0.8, 1, 1, 0.8],
  );

  return (
    <motion.div className="panel" style={{ opacity, rotateX, scale }}>
      <div className="panel__num">{phase.n}</div>
      <h3>{phase.title}</h3>
      <p>{phase.body}</p>
    </motion.div>
  );
}

function SceneDot({
  progress,
  index,
  total,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
}) {
  const seg = 1 / total;
  const active = useTransform(
    progress,
    [index * seg, index * seg + 0.02, (index + 1) * seg - 0.02, (index + 1) * seg],
    [0.25, 1, 1, 0.25],
  );
  return <motion.span className="scene__dot" style={{ opacity: active, scale: active }} />;
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */
const CRED = [
  "Professional athletes",
  "Collegiate athletes",
  "Top athletes in the U.S.",
  "Pro combine prep",
  "D1 programs",
];

const DELIVERABLES = [
  {
    icon: "▣",
    title: "The complete course",
    body: "50+ structured sessions covering the full system — every signup gets all of it, day one.",
  },
  {
    icon: "⚡",
    title: "Speed & power",
    body: "Sprint mechanics, acceleration, and explosive strength blocks built from pro programming.",
  },
  {
    icon: "✦",
    title: "Mobility & recovery",
    body: "Daily movement and recovery protocols that keep you durable through a full season.",
  },
  {
    icon: "▶",
    title: "Film-room breakdowns",
    body: "Video walkthroughs of every lift and drill so your form is right before you load it.",
  },
  {
    icon: "◆",
    title: "Fuel & nutrition",
    body: "A practical fueling guide to train harder, recover faster, and hold lean mass.",
  },
  {
    icon: "▲",
    title: "Progress tracking",
    body: "Benchmarks and check-ins so you can see — and prove — you're getting faster and stronger.",
  },
];

const STATS = [
  { num: "12+", label: "Years coaching" },
  { num: "500+", label: "Athletes trained" },
  { num: "30+", label: "Pro & collegiate" },
  { num: "100%", label: "Get the full course" },
];

const PLANS = [
  {
    name: "Foundation",
    amount: "$49",
    per: "/mo",
    tag: "Train on your own schedule",
    featured: false,
    features: [
      "Full training course — all 50+ sessions",
      "Weekly group training drops",
      "Complete exercise & film library",
      "Private athlete community",
    ],
    cta: "Start Foundation",
  },
  {
    name: "Performance",
    amount: "$99",
    per: "/mo",
    tag: "The serious-competitor plan",
    featured: true,
    features: [
      "Everything in Foundation",
      "Monthly custom programming",
      "Bi-weekly check-ins & form reviews",
      "Nutrition & fueling system",
    ],
    cta: "Start Performance",
  },
  {
    name: "Elite",
    amount: "$199",
    per: "/mo",
    tag: "Coached like a pro",
    featured: false,
    features: [
      "Everything in Performance",
      "1:1 coaching calls each month",
      "Fully personalized programming",
      "Direct text access & priority support",
    ],
    cta: "Start Elite",
  },
];

const ONE_TIME = {
  name: "Full Course — One-Time",
  amount: "$399",
  per: "once",
  tag: "Pay once. Own it forever.",
  features: [
    "Lifetime access to the entire course",
    "All 50+ sessions, self-paced",
    "Every future update included",
    "No subscription, no renewal",
  ],
  cta: "Buy the course once",
};

const QUOTES = [
  {
    text: "I trained pros for a decade — this is the exact system, packaged so any athlete can run it.",
    name: "From the coach",
    role: "Built from pro & D1 programming",
  },
  {
    text: "Came in off a redshirt year and added real speed. The programming just works.",
    name: "Collegiate athlete",
    role: "Division I — sample testimonial",
  },
  {
    text: "Used it through combine prep. Showed up the most explosive I've ever been.",
    name: "Professional athlete",
    role: "Pro prospect — sample testimonial",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const reduce = useReducedMotion();

  // Global scroll progress bar
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  // Hero parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroP, [0, 1], [0, reduce ? 0 : 140]);
  const heroRotate = useTransform(heroP, [0, 1], [0, reduce ? 0 : -10]);
  const heroFade = useTransform(heroP, [0, 0.85], [1, 0]);
  const orbA = useTransform(heroP, [0, 1], [0, reduce ? 0 : -160]);
  const orbB = useTransform(heroP, [0, 1], [0, reduce ? 0 : 160]);

  // Pinned scene
  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sceneP } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  return (
    <div className="site">
      <motion.div className="progress" style={{ scaleX: progressX }} />

      <nav className="nav">
        <div className="shell nav__inner">
          <a className="brand" href="#top">
            <span className="brand__mark" aria-hidden="true" />
            Apex Performance
          </a>
          <div className="nav__links">
            <a className="nav__hideable" href="#system">
              The System
            </a>
            <a className="nav__hideable" href="#pricing">
              Pricing
            </a>
            <a className="btn btn--primary" href="#pricing">
              Get the course
            </a>
          </div>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <header className="hero" id="top" ref={heroRef}>
        <motion.div
          className="hero__orb hero__orb--a"
          style={{ y: orbA }}
          aria-hidden="true"
        />
        <motion.div
          className="hero__orb hero__orb--b"
          style={{ y: orbB }}
          aria-hidden="true"
        />

        <motion.div
          className="shell hero__inner"
          style={{ y: heroY, rotateX: heroRotate, opacity: heroFade }}
        >
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.span className="eyebrow" variants={rise}>
              Trained pro, collegiate &amp; top U.S. athletes
            </motion.span>
            <motion.h1 className="hero__title" variants={rise}>
              Train like the pros. Become <em>undeniable</em>.
            </motion.h1>
            <motion.p className="hero__lead" variants={rise}>
              The complete athletic training course — the same system behind
              professional athletes, collegiate stars, and some of the top
              athletes in the United States. Every signup gets the full course.
            </motion.p>
            <motion.div className="hero__cta" variants={rise}>
              <a className="btn btn--primary" href="#pricing">
                Choose your plan →
              </a>
              <a className="btn btn--ghost" href="#system">
                See the system
              </a>
            </motion.div>
            <motion.p className="hero__note" variants={rise}>
              Monthly tiers or a one-time purchase. Full course included either
              way.
            </motion.p>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__scroll"
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          Scroll
        </motion.div>
      </header>

      {/* ---------------- CREDIBILITY MARQUEE ---------------- */}
      <div className="cred" aria-hidden="true">
        <motion.div
          className="cred__row"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        >
          {[0, 1].map((dup) => (
            <span key={dup}>
              {CRED.map((c) => (
                <b key={c}>{c}</b>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ---------------- DELIVERABLES ---------------- */}
      <section className="section shell" id="course">
        <Reveal className="section__head">
          <motion.span className="eyebrow" variants={rise}>
            Everyone gets everything
          </motion.span>
          <motion.h2 className="section__title" variants={rise}>
            One signup. The <em>entire</em> training course.
          </motion.h2>
          <motion.p className="section__sub" variants={rise}>
            No locked modules, no drip-fed lessons. The day you join, the full
            system is yours.
          </motion.p>
        </Reveal>

        <Reveal className="deliverables" amount={0.15}>
          {DELIVERABLES.map((d) => (
            <TiltCard className="dcard" key={d.title}>
              <div className="dcard__icon" aria-hidden="true">
                {d.icon}
              </div>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
            </TiltCard>
          ))}
        </Reveal>
      </section>

      {/* ---------------- PINNED 3D SCENE ---------------- */}
      <section className="scene" id="system" ref={sceneRef}>
        <div className="scene__sticky">
          <span className="eyebrow scene__label">The system</span>
          {PHASES.map((phase, i) => (
            <ScenePanel
              key={phase.n}
              progress={sceneP}
              index={i}
              total={PHASES.length}
              phase={phase}
            />
          ))}
          <div className="scene__dots" aria-hidden="true">
            {PHASES.map((p, i) => (
              <SceneDot
                key={p.n}
                progress={sceneP}
                index={i}
                total={PHASES.length}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="shell">
        <Reveal className="stats">
          {STATS.map((s) => (
            <motion.div key={s.label} variants={rise}>
              <div className="stat__num">{s.num}</div>
              <div className="stat__label">{s.label}</div>
            </motion.div>
          ))}
        </Reveal>
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section className="section shell" id="pricing">
        <Reveal className="section__head">
          <motion.span className="eyebrow" variants={rise}>
            Pick your level
          </motion.span>
          <motion.h2 className="section__title" variants={rise}>
            Tiers to be <em>coached</em>, or buy it <em>once</em>.
          </motion.h2>
          <motion.p className="section__sub" variants={rise}>
            Every plan includes the complete training course. Go month-to-month
            for coaching and accountability, or own the whole thing outright.
          </motion.p>
        </Reveal>

        <Reveal className="pricing" amount={0.1}>
          {PLANS.map((p) => (
            <TiltCard
              className={`plan${p.featured ? " plan--featured" : ""}`}
              key={p.name}
              max={6}
            >
              {p.featured && <span className="plan__badge">Most popular</span>}
              <div className="plan__name">{p.name}</div>
              <div className="plan__price">
                <span className="plan__amount">{p.amount}</span>
                <span className="plan__per">{p.per}</span>
              </div>
              <div className="plan__tag">{p.tag}</div>
              <div className="plan__included">★ Full training course included</div>
              <ul className="plan__features">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                className={`btn ${p.featured ? "btn--primary" : "btn--ghost"} btn--block plan__cta`}
                href="#start"
              >
                {p.cta}
              </a>
            </TiltCard>
          ))}
        </Reveal>

        {/* One-time option */}
        <Reveal amount={0.2}>
          <motion.div style={{ marginTop: "1.25rem" }} variants={rise}>
            <TiltCard className="plan plan--onetime" max={5}>
              <span className="plan__badge">One-time buy</span>
              <div className="plan__name">{ONE_TIME.name}</div>
              <div className="plan__price">
                <span className="plan__amount">{ONE_TIME.amount}</span>
                <span className="plan__per">{ONE_TIME.per}</span>
              </div>
              <div className="plan__tag">{ONE_TIME.tag}</div>
              <ul className="plan__features">
                {ONE_TIME.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className="btn btn--primary btn--block plan__cta" href="#start">
                {ONE_TIME.cta}
              </a>
            </TiltCard>
          </motion.div>
        </Reveal>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="section shell">
        <Reveal className="section__head">
          <motion.span className="eyebrow" variants={rise}>
            Built on real results
          </motion.span>
          <motion.h2 className="section__title" variants={rise}>
            The standard the <em>best</em> are held to.
          </motion.h2>
        </Reveal>
        <Reveal className="quotes" amount={0.15}>
          {QUOTES.map((q) => (
            <TiltCard className="quote" key={q.name} max={5}>
              <p>"{q.text}"</p>
              <div className="quote__who">
                <span className="quote__avatar" aria-hidden="true" />
                <span>
                  <span className="quote__name">{q.name}</span>
                  <br />
                  <span className="quote__role">{q.role}</span>
                </span>
              </div>
            </TiltCard>
          ))}
        </Reveal>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="section shell" id="start">
        <Reveal>
          <motion.div
            className="finale"
            variants={pop}
            whileHover={reduce ? undefined : { y: -5 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow">Your move</span>
            <h2>
              Sign up. Get the <em>full course</em>. Go win.
            </h2>
            <p className="hero__lead">
              Join the athletes training with the system that's built pros,
              collegiate standouts, and some of the best in the country.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary" href="#pricing">
                Choose a plan →
              </a>
              <a className="btn btn--ghost" href="#pricing">
                Buy the course once
              </a>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} Apex Performance — Athletic Training</span>
        <span>Pro · Collegiate · Elite athlete development</span>
      </footer>
    </div>
  );
}
