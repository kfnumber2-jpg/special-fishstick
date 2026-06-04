import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import "./App.css";

/* ============================================================
   Motion primitives
   ============================================================ */
const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
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

/** Reveal on scroll — animates once when ~22% enters the viewport. */
function Reveal({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.22 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScrollPop — a 3D entrance driven by scroll position.
 * As the element travels through the viewport it rotates up off the page,
 * scales, and lifts toward the camera, so something "pops out" on every scroll.
 */
function ScrollPop({
  children,
  className,
  intensity = 1,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "center 55%"],
  });
  const p = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    mass: 0.4,
  });

  const rotateX = useTransform(p, [0, 1], [22 * intensity, 0]);
  const z = useTransform(p, [0, 1], [-220 * intensity, 0]);
  const scale = useTransform(p, [0, 1], [0.86, 1]);
  const opacity = useTransform(p, [0, 0.6, 1], [0, 0.6, 1]);

  if (reduce) {
    return (
      <Reveal className={className}>
        <>{children}</>
      </Reveal>
    );
  }

  return (
    <div ref={ref} className={`pop3d ${className ?? ""}`}>
      <motion.div
        className="pop3d__inner"
        style={{ rotateX, z, scale, opacity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Pointer-driven 3D tilt — used on the pricing cards. */
function Tilt({
  children,
  className,
  max = 9,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 16 });
  const sry = useSpring(ry, { stiffness: 180, damping: 16 });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
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
      className={`tilt ${className ?? ""}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={reduce ? undefined : { rotateX: srx, rotateY: sry }}
      whileHover={reduce ? undefined : { z: 40 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   Content
   ============================================================ */
const CRED = [
  "Professional Athletes",
  "Collegiate Programs",
  "Top U.S. Talent",
  "Olympic Hopefuls",
  "Draft Prospects",
];

const PILLARS = [
  {
    k: "Strength & Power",
    body: "Periodized lifting blocks engineered for explosive force — the same progressions that move the needle for pros.",
  },
  {
    k: "Speed & Agility",
    body: "Sprint mechanics, change-of-direction, and reactive drills that translate directly to game-day separation.",
  },
  {
    k: "Mobility & Recovery",
    body: "Stay durable across a full season. Movement prep, soft-tissue work, and recovery protocols built in.",
  },
  {
    k: "Nutrition & Mindset",
    body: "Fuel like a pro and train the mental side. Macros, habits, and the competitor's mindset that wins.",
  },
];

const INCLUDED = [
  "100+ guided video sessions",
  "Periodized 12-month program",
  "Position-specific tracks",
  "Mobile app + offline access",
  "Nutrition playbook & macros",
  "Recovery & injury-prevention",
  "Progress tracking dashboard",
  "Private athlete community",
];

const STATS = [
  { num: "12+", label: "Years coaching elite athletes" },
  { num: "30+", label: "Pro & collegiate athletes trained" },
  { num: "100+", label: "On-demand training sessions" },
  { num: "4.9★", label: "Average athlete rating" },
];

type Tier = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
  oneTime?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Rookie",
    price: "$49",
    cadence: "/ month",
    tagline: "Get the full course and start building your base.",
    features: [
      "Complete training course — all 100+ sessions",
      "12-month periodized program",
      "Nutrition playbook & macro targets",
      "Mobile app + progress tracking",
      "Private athlete community",
    ],
    cta: "Start as Rookie",
  },
  {
    name: "Varsity",
    price: "$99",
    cadence: "/ month",
    tagline: "Coaching, accountability, and form feedback every week.",
    features: [
      "Everything in Rookie",
      "Weekly programming tuned to you",
      "Video form reviews & feedback",
      "Monthly group coaching calls",
      "Position-specific tracks",
    ],
    cta: "Go Varsity",
    featured: true,
  },
  {
    name: "Elite",
    price: "$199",
    cadence: "/ month",
    tagline: "Direct 1:1 access — train like the pros I work with.",
    features: [
      "Everything in Varsity",
      "1:1 private coaching sessions",
      "Direct line to your coach 7 days a week",
      "Fully custom programming",
      "Combine & draft prep available",
    ],
    cta: "Apply for Elite",
  },
];

const ONE_TIME: Tier = {
  name: "The Full Course",
  price: "$249",
  cadence: "one-time",
  tagline: "Buy once. Own the entire system for life — no subscription.",
  features: [
    "Lifetime access to the complete course",
    "All 100+ guided video sessions",
    "Full 12-month periodized program",
    "Nutrition playbook, recovery & mobility",
    "Every future update included free",
  ],
  cta: "Buy the course — $249",
  oneTime: true,
};

const FAQ = [
  {
    q: "Does every package include the full training course?",
    a: "Yes. Every single sign-up — from Rookie to Elite to the one-time purchase — unlocks the complete training course. The tiers simply add more coaching, feedback, and personalization on top.",
  },
  {
    q: "I don't want a subscription. Can I just buy it once?",
    a: "Absolutely. The Full Course one-time option gives you lifetime access to the entire system, including all future updates, for a single payment.",
  },
  {
    q: "Who is this actually built for?",
    a: "Anyone serious about performance — from high-school and collegiate athletes to weekend competitors. It's built on the exact methods used with professional and top-ranked U.S. athletes.",
  },
  {
    q: "What equipment do I need?",
    a: "Most of the program runs with a barbell, dumbbells, and open space. Home and full-gym variations are provided for every session.",
  },
];

/* ============================================================
   Hero with parallax 3D layers
   ============================================================ */
function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const yTitle = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const yOrb = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 220]);
  const rotateGrid = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 18]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <header className="hero" id="top" ref={ref}>
      <motion.div className="hero__grid" style={{ rotateX: rotateGrid }} aria-hidden />
      <motion.div className="hero__orb hero__orb--a" style={{ y: yOrb }} aria-hidden />
      <motion.div className="hero__orb hero__orb--b" style={{ y: yOrb }} aria-hidden />

      <motion.div className="shell" style={{ y: yTitle, opacity: fade }}>
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span className="eyebrow" variants={rise}>
            Trusted by pro &amp; collegiate athletes
          </motion.span>

          <motion.h1 className="hero__title" variants={rise}>
            Train like the <em>best</em> in the country.
          </motion.h1>

          <motion.p className="hero__lead" variants={rise}>
            The complete performance system I've used with professional
            athletes, collegiate programs, and some of the top athletes in the
            United States — now built for you. Every sign-up unlocks the full
            training course.
          </motion.p>

          <motion.div className="hero__cta" variants={rise}>
            <a className="btn btn--primary" href="#pricing">
              See packages →
            </a>
            <a className="btn btn--ghost" href="#course">
              What's inside
            </a>
          </motion.div>

          <motion.div className="hero__trust" variants={rise}>
            <span className="hero__avatars" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              Built on the methods behind pro, collegiate &amp; nationally
              ranked athletes
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="hero__scroll" aria-hidden>
        <span>Scroll</span>
        <motion.span
          className="hero__scrollline"
          animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3], originY: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </header>
  );
}

/* A single animated count-up stat that pops in 3D as it scrolls into view. */
function StatCard({ s }: { s: { num: string; label: string } }) {
  return (
    <motion.div className="stat" variants={rise}>
      <div className="stat__num">{s.num}</div>
      <div className="stat__label">{s.label}</div>
    </motion.div>
  );
}

function PriceCard({ t }: { t: Tier }) {
  return (
    <Tilt
      className={`price ${t.featured ? "price--featured" : ""} ${
        t.oneTime ? "price--onetime" : ""
      }`}
    >
      <div className="price__sheen" aria-hidden />
      {t.featured && <span className="price__badge">Most popular</span>}
      {t.oneTime && <span className="price__badge price__badge--alt">Best value · pay once</span>}

      <h3 className="price__name">{t.name}</h3>
      <p className="price__tagline">{t.tagline}</p>

      <div className="price__amount">
        <span className="price__num">{t.price}</span>
        <span className="price__cadence">{t.cadence}</span>
      </div>

      <a
        className={`btn ${t.featured || t.oneTime ? "btn--primary" : "btn--ghost"} price__cta`}
        href="#signup"
      >
        {t.cta}
      </a>

      <ul className="price__features">
        {t.features.map((f) => (
          <li key={f}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M20 6L9 17l-5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </Tilt>
  );
}

export default function App() {
  const reduce = useReducedMotion();

  return (
    <div className="site">
      <nav className="nav">
        <div className="shell nav__inner">
          <a className="brand" href="#top">
            <span className="brand__mark" aria-hidden="true" />
            APEX&nbsp;Performance
          </a>
          <div className="nav__links">
            <a className="nav__hideable" href="#course">
              The Course
            </a>
            <a className="nav__hideable" href="#proof">
              Results
            </a>
            <a className="btn btn--ghost" href="#pricing">
              Get started
            </a>
          </div>
        </div>
      </nav>

      <Hero />

      {/* Credibility marquee */}
      <div className="marquee" aria-hidden="true">
        <motion.div
          className="marquee__row"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity }}
        >
          {[0, 1].map((dup) => (
            <span key={dup}>
              {CRED.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      <main className="shell">
        {/* Proof / stats */}
        <section className="section" id="proof">
          <Reveal className="section__head section__head--center">
            <motion.span className="eyebrow" variants={rise}>
              The track record
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              I've coached professional athletes, collegiate athletes, and some
              of the <em>top athletes in the United States</em>.
            </motion.h2>
            <motion.p className="section__lead" variants={rise}>
              The programming on this page isn't theory. It's the same system —
              refined over years on the field, court, and platform — distilled
              into a course you can run from anywhere.
            </motion.p>
          </Reveal>

          <ScrollPop className="stats" intensity={0.7}>
            <motion.div
              className="stats__grid"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
            >
              {STATS.map((s) => (
                <StatCard key={s.label} s={s} />
              ))}
            </motion.div>
          </ScrollPop>
        </section>

        {/* The course / pillars */}
        <section className="section" id="course">
          <Reveal className="section__head">
            <motion.span className="eyebrow" variants={rise}>
              Inside the course
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              One complete system. <em>Four</em> pillars of performance.
            </motion.h2>
          </Reveal>

          <div className="pillars">
            {PILLARS.map((f, i) => (
              <ScrollPop key={f.k} intensity={0.9}>
                <article className="pillar">
                  <span className="pillar__index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="pillar__title">{f.k}</h3>
                  <p className="pillar__body">{f.body}</p>
                </article>
              </ScrollPop>
            ))}
          </div>

          <ScrollPop className="included" intensity={0.6}>
            <div className="included__inner">
              <h3 className="included__title">
                Every package unlocks the <em>full</em> course
              </h3>
              <ul className="included__list">
                {INCLUDED.map((x) => (
                  <li key={x}>
                    <span className="included__dot" aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollPop>
        </section>

        {/* Pricing */}
        <section className="section" id="pricing">
          <Reveal className="section__head section__head--center">
            <motion.span className="eyebrow" variants={rise}>
              Packages
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              Choose your <em>level of commitment</em>.
            </motion.h2>
            <motion.p className="section__lead" variants={rise}>
              Pick a monthly tier for ongoing coaching, or own the whole system
              outright with a single one-time purchase. Either way, the complete
              training course is yours.
            </motion.p>
          </Reveal>

          <Reveal className="pricing">
            {TIERS.map((t) => (
              <motion.div key={t.name} variants={rise} className="pricing__cell">
                <PriceCard t={t} />
              </motion.div>
            ))}
          </Reveal>

          {/* One-time buy option — set apart */}
          <ScrollPop className="onetime" intensity={0.5}>
            <div className="onetime__split">
              <div className="onetime__copy">
                <span className="eyebrow">No subscription</span>
                <h3 className="onetime__title">
                  Prefer to <em>buy it once</em>?
                </h3>
                <p className="onetime__lead">
                  Get lifetime access to the entire training course for a single
                  payment — every session, every program, and every future
                  update included. No recurring charges, ever.
                </p>
              </div>
              <PriceCard t={ONE_TIME} />
            </div>
          </ScrollPop>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <Reveal className="section__head section__head--center">
            <motion.span className="eyebrow" variants={rise}>
              Questions
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              Everything you need to know.
            </motion.h2>
          </Reveal>

          <Reveal className="faq">
            {FAQ.map((item) => (
              <motion.details className="faq__item" key={item.q} variants={rise}>
                <summary className="faq__q">
                  {item.q}
                  <span className="faq__icon" aria-hidden />
                </summary>
                <p className="faq__a">{item.a}</p>
              </motion.details>
            ))}
          </Reveal>
        </section>

        {/* Final CTA / signup */}
        <section className="section" id="signup">
          <ScrollPop intensity={0.7}>
            <motion.div
              className="cta"
              whileHover={reduce ? undefined : { y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="eyebrow">Your move</span>
              <h2 className="cta__title">
                Sign up and get the <em>full training course</em> today.
              </h2>
              <p className="cta__lead">
                Join the athletes building real, measurable performance with the
                exact system trusted at the highest levels of U.S. sport.
              </p>
              <form
                className="cta__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Thanks! This is where checkout / sign-up would connect. Wire it to your payment provider to go live.",
                  );
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  aria-label="Email address"
                  className="cta__input"
                />
                <button className="btn btn--primary" type="submit">
                  Claim my spot →
                </button>
              </form>
              <p className="cta__fine">
                30-day performance guarantee · Cancel anytime · Lifetime option
                available
              </p>
            </motion.div>
          </ScrollPop>
        </section>
      </main>

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} APEX Performance Training</span>
        <span>
          Trusted by professional, collegiate &amp; top U.S. athletes
        </span>
      </footer>
    </div>
  );
}
