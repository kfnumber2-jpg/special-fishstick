import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { startCheckout } from "./checkout";
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
  "Chris Henry Jr.",
  "Adam “Pacman” Jones",
  "Darqueze Dennard",
  "Ace Olston",
  "DeMarcus Henry",
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
  { num: "NFL", label: "Pros trained at the highest level" },
  { num: "100+", label: "On-demand training sessions" },
  { num: "4.9★", label: "Average athlete rating" },
];

/* Real athletes coached — speed, explosion, and agility work. */
const ATHLETES = [
  {
    name: "Chris Henry Jr.",
    org: "Ohio State",
    level: "Collegiate",
    focus: "Speed & Agility",
  },
  {
    name: "Adam “Pacman” Jones",
    org: "NFL — Professional",
    level: "Pro",
    focus: "Speed & Explosion",
  },
  {
    name: "Darqueze Dennard",
    org: "NFL — Professional",
    level: "Pro",
    focus: "Agility & Speed",
  },
  {
    name: "Ace Olston",
    org: "Notre Dame commit",
    level: "Collegiate",
    focus: "Speed & Explosion",
  },
  {
    name: "DeMarcus Henry",
    org: "Top-ranked HS basketball",
    level: "Elite Prep",
    focus: "Speed, Explosion & Agility",
  },
];

type Tier = {
  name: string;
  /** Maps to a Stripe Price ID server-side (see server/index.js). */
  priceKey: string;
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
    priceKey: "rookie",
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
    priceKey: "varsity",
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
    priceKey: "elite",
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
  priceKey: "full_course",
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
  {
    q: "Can I cancel or change my plan?",
    a: "Yes. Monthly tiers can be cancelled or changed anytime from your account — no contracts, no penalties. The one-time course is yours for life.",
  },
];

/* How it works — three simple steps from sign-up to training. */
const STEPS = [
  {
    k: "Pick your package",
    body: "Choose a monthly coaching tier or buy the full course once. Checkout is secure and takes under a minute.",
  },
  {
    k: "Unlock the full system",
    body: "Instantly get every session, the 12-month program, nutrition, and recovery — on web and mobile.",
  },
  {
    k: "Train, track, and level up",
    body: "Follow the plan, log your progress, and watch your speed, power, and durability climb week over week.",
  },
];

/* Sample testimonials — replace the quotes/names with real ones as you collect
   them. Roles are used so nothing is misattributed before you have approvals. */
const TESTIMONIALS = [
  {
    quote:
      "The speed work changed my first step completely. By spring I was a different athlete — coaches noticed immediately.",
    name: "Division I Wide Receiver",
    meta: "Collegiate program",
  },
  {
    quote:
      "Same explosion training the pros run, broken down so I could actually do it on my own. My vertical and 40 both jumped.",
    name: "Pro Defensive Back",
    meta: "Professional athlete",
  },
  {
    quote:
      "My son went from middle of the pack to one of the most explosive kids on the floor. The plan just works.",
    name: "Parent of a top HS recruit",
    meta: "Elite prep basketball",
  },
];

/* Results gallery — REPLACE these placeholders with your real media.
   Photos: drop real images in public/gallery/ and update `image` + text.
   Videos: add a `youtubeId` (e.g. "dQw4w9WgXcQ") OR a direct `videoSrc` (mp4).
   Until then the lightbox shows the placeholder thumbnail. */
type Slide = {
  kind: "photo" | "video";
  image: string; // shown in the carousel + thumbnail strip
  caption: string; // title under the slide
  desc: string; // description under the title
  youtubeId?: string;
  videoSrc?: string;
};

const PHOTOS: Slide[] = [
  {
    kind: "photo",
    image: "/gallery/photo-1.svg",
    caption: "+4\" vertical in 12 weeks",
    desc: "Collegiate forward — explosive lower-body block added four inches to his standing vert.",
  },
  {
    kind: "photo",
    image: "/gallery/photo-2.svg",
    caption: "Combine 40-yard prep",
    desc: "Start mechanics and acceleration work dialed in ahead of pro day testing.",
  },
  {
    kind: "photo",
    image: "/gallery/photo-3.svg",
    caption: "Pre-season strength block",
    desc: "Periodized lifting that carried straight into in-season durability.",
  },
  {
    kind: "photo",
    image: "/gallery/photo-4.svg",
    caption: "Explosive first-step work",
    desc: "Reactive drills built the separation that shows up on game film.",
  },
  {
    kind: "photo",
    image: "/gallery/photo-5.svg",
    caption: "Speed & agility ladder drills",
    desc: "Footwork and change-of-direction patterns under controlled load.",
  },
  {
    kind: "photo",
    image: "/gallery/photo-6.svg",
    caption: "Game-ready conditioning",
    desc: "Energy-system work tuned to the demands of the sport.",
  },
];

const VIDEOS: Slide[] = [
  {
    kind: "video",
    image: "/gallery/video-1.svg",
    caption: "Sprint mechanics breakdown",
    desc: "A frame-by-frame look at the start, drive phase, and top-end posture.",
  },
  {
    kind: "video",
    image: "/gallery/video-2.svg",
    caption: "Explosive lower-body session",
    desc: "The exact power progression behind the vertical and 40 gains.",
  },
  {
    kind: "video",
    image: "/gallery/video-3.svg",
    caption: "Change-of-direction drill",
    desc: "Cutting and deceleration mechanics that translate to the field.",
  },
];

type LightboxItem = { kind: "photo" | "video"; slide: Slide };

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

      <button
        type="button"
        className={`btn ${t.featured || t.oneTime ? "btn--primary" : "btn--ghost"} price__cta`}
        onClick={() => startCheckout(t.priceKey)}
      >
        {t.cta}
      </button>

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

/** Banner shown when Stripe redirects back after checkout. */
function CheckoutNotice() {
  // Read the redirect result once, on first render.
  const [status, setStatus] = useState<"success" | "cancelled" | null>(() => {
    const c = new URLSearchParams(window.location.search).get("checkout");
    return c === "success" || c === "cancelled" ? c : null;
  });

  useEffect(() => {
    if (!status) return;
    // Clean the query string so the banner doesn't persist on refresh.
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.pathname + url.hash);
  }, [status]);

  if (!status) return null;

  return (
    <motion.div
      className={`notice notice--${status}`}
      role="status"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {status === "success" ? (
        <span>
          🎉 You're in! Your training course is unlocked — check your email for
          access details.
        </span>
      ) : (
        <span>
          Checkout cancelled — no charge was made. Your spot is still here when
          you're ready.
        </span>
      )}
      <button
        type="button"
        className="notice__close"
        aria-label="Dismiss"
        onClick={() => setStatus(null)}
      >
        ✕
      </button>
    </motion.div>
  );
}

/* 3D coverflow carousel — auto-advance, swipe/drag, arrows, thumbnails. */
function Coverflow({
  items,
  onOpen,
  paused = false,
  interval = 6000,
}: {
  items: Slide[];
  onOpen: (s: Slide) => void;
  paused?: boolean; // pause from outside (e.g. lightbox open)
  interval?: number;
}) {
  const reduce = useReducedMotion();
  const len = items.length;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // Wrap-around navigation so the reel loops.
  const go = (n: number) => setIndex(((n % len) + len) % len);

  const playing = !reduce && !paused && !hovering && !userPaused && len > 1;

  // Advance after `interval`; the timer resets on any index change (manual or
  // auto), so manual navigation gives you a fresh full beat before it flips.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % len), interval);
    return () => clearTimeout(id);
  }, [index, playing, len, interval]);

  return (
    <div
      className="cf"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        className="cf__arrow cf__arrow--prev"
        aria-label="Previous"
        onClick={() => go(index - 1)}
      >
        ‹
      </button>

      <motion.div
        className="cf__stage"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -60) go(index + 1);
          else if (info.offset.x > 60) go(index - 1);
        }}
      >
        {items.map((s, i) => {
          const offset = i - index;
          const abs = Math.abs(offset);
          const isActive = offset === 0;
          return (
            <motion.button
              type="button"
              key={s.image}
              className={`cf__slide ${isActive ? "cf__slide--active" : ""} ${
                s.kind === "video" ? "cf__slide--video" : ""
              }`}
              aria-hidden={abs > 2}
              tabIndex={isActive ? 0 : -1}
              onClick={() => (isActive ? onOpen(s) : go(i))}
              animate={{
                x: `${offset * 56}%`,
                rotateY: reduce ? 0 : -offset * 34,
                scale: isActive ? 1 : 0.82,
                opacity: abs > 2 ? 0 : 1,
                filter: isActive ? "brightness(1)" : "brightness(0.55)",
              }}
              style={{ zIndex: 50 - abs, pointerEvents: abs > 2 ? "none" : "auto" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src={s.image} alt={s.caption} draggable={false} loading="lazy" />
              {s.kind === "video" && (
                <span className="cf__play" aria-hidden>
                  ▶
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <button
        type="button"
        className="cf__arrow cf__arrow--next"
        aria-label="Next"
        onClick={() => go(index + 1)}
      >
        ›
      </button>

      {/* Description under the active slide */}
      <div className="cf__caption">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="cf__title">{items[index].caption}</h3>
            <p className="cf__desc">{items[index].desc}</p>
            <button
              type="button"
              className="btn btn--primary cf__open"
              onClick={() => onOpen(items[index])}
            >
              {items[index].kind === "video" ? "Play clip ▶" : "View photo"}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail strip + autoplay toggle */}
      <div className="cf__controls">
        {!reduce && len > 1 && (
          <button
            type="button"
            className="cf__playpause"
            aria-label={userPaused ? "Start autoplay" : "Pause autoplay"}
            aria-pressed={!userPaused}
            onClick={() => setUserPaused((p) => !p)}
          >
            {userPaused ? "▶" : "❚❚"}
          </button>
        )}
        <div className="cf__thumbs" role="tablist" aria-label="Choose a slide">
          {items.map((s, i) => (
            <button
              type="button"
              key={s.image}
              className={`cf__thumb ${i === index ? "cf__thumb--on" : ""}`}
              aria-label={s.caption}
              aria-selected={i === index}
              onClick={() => go(i)}
            >
              <img src={s.image} alt="" draggable={false} loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      {/* Progress dots double as an at-a-glance position indicator. */}
      <div className="cf__dots" aria-hidden>
        {items.map((s, i) => (
          <span
            key={s.image}
            className={`cf__dot ${i === index ? "cf__dot--on" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/* Results gallery — Photos/Videos tabs, coverflow carousel, and a lightbox. */
function Gallery() {
  const [tab, setTab] = useState<"photos" | "videos">("videos");
  const [active, setActive] = useState<LightboxItem | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  const open = (s: Slide) => setActive({ kind: s.kind, slide: s });

  return (
    <section className="section" id="gallery">
      <Reveal className="section__head section__head--center">
        <motion.span className="eyebrow" variants={rise}>
          The proof
        </motion.span>
        <motion.h2 className="section__title" variants={rise}>
          Real athletes. <em>Real results.</em>
        </motion.h2>
        <motion.p className="section__lead" variants={rise}>
          Swipe through sessions, transformations, and breakdowns from athletes
          running the program.
        </motion.p>
      </Reveal>

      <div className="tabs" role="tablist" aria-label="Results gallery">
        <button
          role="tab"
          aria-selected={tab === "videos"}
          className={`tab ${tab === "videos" ? "tab--on" : ""}`}
          onClick={() => setTab("videos")}
        >
          Videos
        </button>
        <button
          role="tab"
          aria-selected={tab === "photos"}
          className={`tab ${tab === "photos" ? "tab--on" : ""}`}
          onClick={() => setTab("photos")}
        >
          Photos
        </button>
      </div>

      <Coverflow
        key={tab}
        items={tab === "videos" ? VIDEOS : PHOTOS}
        onOpen={open}
        paused={Boolean(active)}
      />

      <AnimatePresence>
        {active && (
          <motion.div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            onClick={() => setActive(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="lightbox__inner"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                className="lightbox__close"
                aria-label="Close"
                onClick={() => setActive(null)}
              >
                ✕
              </button>

              {active.kind === "photo" ? (
                <img src={active.slide.image} alt={active.slide.caption} />
              ) : active.slide.youtubeId ? (
                <div className="lightbox__video">
                  <iframe
                    src={`https://www.youtube.com/embed/${active.slide.youtubeId}?autoplay=1`}
                    title={active.slide.caption}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : active.slide.videoSrc ? (
                <video
                  src={active.slide.videoSrc}
                  controls
                  autoPlay
                  onEnded={() => setActive(null)}
                />
              ) : (
                <div className="lightbox__note">
                  <img src={active.slide.image} alt={active.slide.caption} />
                  <p>
                    Add a <code>youtubeId</code> or <code>videoSrc</code> for
                    this clip in the <code>VIDEOS</code> list to play it here.
                  </p>
                </div>
              )}

              <p className="lightbox__cap">{active.slide.caption}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function App() {
  const reduce = useReducedMotion();

  return (
    <div className="site">
      <CheckoutNotice />
      <nav className="nav">
        <div className="shell nav__inner">
          <a className="brand" href="#top">
            <span className="brand__mark" aria-hidden="true" />
            APEX&nbsp;Performance
          </a>
          <div className="nav__links">
            <a className="nav__hideable" href="#proof">
              Results
            </a>
            <a className="nav__hideable" href="#course">
              The Course
            </a>
            <a className="nav__hideable" href="#how">
              How it works
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

          <Reveal className="athletes__head">
            <motion.span className="eyebrow" variants={rise}>
              Athletes I've personally trained
            </motion.span>
          </Reveal>

          <div className="athletes">
            {ATHLETES.map((a) => (
              <ScrollPop key={a.name} intensity={0.9}>
                <Tilt className="athlete" max={7}>
                  <div className="price__sheen" aria-hidden />
                  <span className="athlete__level">{a.level}</span>
                  <h3 className="athlete__name">{a.name}</h3>
                  <p className="athlete__org">{a.org}</p>
                  <p className="athlete__focus">
                    <span aria-hidden>⚡</span> {a.focus}
                  </p>
                </Tilt>
              </ScrollPop>
            ))}
          </div>
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

        {/* How it works */}
        <section className="section" id="how">
          <Reveal className="section__head section__head--center">
            <motion.span className="eyebrow" variants={rise}>
              How it works
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              From sign-up to <em>game-ready</em> in three steps.
            </motion.h2>
          </Reveal>

          <div className="steps">
            {STEPS.map((s, i) => (
              <ScrollPop key={s.k} intensity={0.8}>
                <article className="step">
                  <span className="step__num">{i + 1}</span>
                  <h3 className="step__title">{s.k}</h3>
                  <p className="step__body">{s.body}</p>
                </article>
              </ScrollPop>
            ))}
          </div>
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

        {/* Testimonials */}
        <section className="section" id="testimonials">
          <Reveal className="section__head section__head--center">
            <motion.span className="eyebrow" variants={rise}>
              In their words
            </motion.span>
            <motion.h2 className="section__title" variants={rise}>
              Athletes don't guess. They <em>train with proof</em>.
            </motion.h2>
          </Reveal>

          <div className="quotes">
            {TESTIMONIALS.map((t) => (
              <ScrollPop key={t.name} intensity={0.7}>
                <Tilt className="quote" max={6}>
                  <div className="price__sheen" aria-hidden />
                  <span className="quote__mark" aria-hidden>
                    &ldquo;
                  </span>
                  <p className="quote__text">{t.quote}</p>
                  <div className="quote__by">
                    <span className="quote__name">{t.name}</span>
                    <span className="quote__meta">{t.meta}</span>
                  </div>
                </Tilt>
              </ScrollPop>
            ))}
          </div>
        </section>

        {/* Results gallery */}
        <Gallery />

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
                  const data = new FormData(e.currentTarget);
                  const email = String(data.get("email") ?? "");
                  // Default sign-up routes to the most popular tier; Stripe
                  // collects payment and confirms the email from here.
                  startCheckout("varsity", email);
                }}
              >
                <input
                  type="email"
                  name="email"
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

      <footer className="footer">
        <div className="shell footer__inner">
          <div className="footer__brand">
            <a className="brand" href="#top">
              <span className="brand__mark" aria-hidden="true" />
              APEX&nbsp;Performance
            </a>
            <p className="footer__tag">
              The complete performance system trusted by professional,
              collegiate, and top U.S. athletes.
            </p>
            <a className="btn btn--primary footer__cta" href="#pricing">
              Get the course →
            </a>
          </div>

          <nav className="footer__cols" aria-label="Footer">
            <div className="footer__col">
              <span className="footer__head">Explore</span>
              <a href="#proof">Results</a>
              <a href="#course">The Course</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Packages</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer__col">
              <span className="footer__head">Get started</span>
              <a href="#pricing">Monthly tiers</a>
              <a href="#pricing">Buy the full course</a>
              <a href="#signup">Sign up</a>
            </div>
            <div className="footer__col">
              <span className="footer__head">Contact</span>
              <a href="mailto:coach@apexperformance.com">Email the coach</a>
              <a href="#faq">Support &amp; FAQ</a>
              <a href="#signup">Book a consult</a>
            </div>
          </nav>
        </div>

        <div className="shell footer__bar">
          <span>
            © {new Date().getFullYear()} APEX Performance Training. All rights
            reserved.
          </span>
          <span className="footer__legal">
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="/refund.html">Refund policy</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
