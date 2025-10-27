// frontend/src/pages/SchoolSelect.jsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSchool } from "../contexts/SchoolContext";
import { Link, useNavigate } from "react-router-dom";

const TOKENS = {
  pageBg: "#F7F8FA",
  bandGray: "#F3F6F9",
  text: "#0F172A",
  sub: "#475569",
  red: "#EF4444",
  border: "rgba(15,23,42,0.16)",
  white: "#FFFFFF",
  green: "#10B981",
  blue: "#2563EB",
  sky: "#0EA5E9",
  purple: "#7C3AED",
  amber: "#F59E0B",
};

const SCHOOLS = [
  { key: "nyu", short: "NYU", name: "New York University", enabled: true, domains: ["nyu.edu"] },
  { key: "boston", short: "Boston", name: "Boston University", enabled: false, domains: ["bu.edu", "boston.edu"] },
  { key: "columbia", short: "Columbia", name: "Columbia University", enabled: false, domains: ["columbia.edu"] },
];

export default function SchoolSelect() {
  const { setSchool } = useSchool();
  const navigate = useNavigate();

  // === Header modal state (kept) ===
  const [showPicker, setShowPicker] = useState(false);

  // === Bottom Quick Enter state (independent from header) ===
  const [quickChosen, setQuickChosen] = useState(null);
  const quickInfo = useMemo(
    () => (quickChosen ? SCHOOLS.find((s) => s.key === quickChosen) : null),
    [quickChosen]
  );

  const openHeaderPicker = () => setShowPicker(true);

  const handlePickFromHeader = (school) => {
    if (!school.enabled) {
      setShowPicker(false);
      return;
    }
    setSchool?.(school.key);
    setShowPicker(false);
    navigate(`/${school.key}/dashboard`);
  };

  const handleQuickEnter = () => {
    if (!quickInfo || !quickInfo.enabled) return;
    setSchool?.(quickInfo.key);
    navigate(`/${quickInfo.key}/dashboard`);
  };

  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      {/* === TOP NAV (unchanged) === */}
      <header className="fixed inset-x-0 top-0 z-30 bg-white border-b border-black/10">
        <div className="w-full h-16 px-0 flex items-center justify-between relative">
          <div className="flex items-center gap-10 md:gap-12 pl-28 md:pl-32 [&>a]:tracking-[.02em]">
            <Link
              to="/"
              className="font-semibold tracking-[.01em] text-2xl md:text-3xl"
              style={{ color: "#EF4444" }}
            >
              CNAPSS
            </Link>
            <Link to="/about" className="text-black hover:opacity-70 text-sm font-semibold">
              About us
            </Link>
            <Link to="/contact" className="text-black hover:opacity-70 text-sm font-semibold">
              Contacts
            </Link>
          </div>

          <div className="pr-10 md:pr-12 relative">
            <button
              onClick={openHeaderPicker}
              className="text-sm font-semibold text-black hover:opacity-70 focus:outline-none"
            >
              Click to enter
            </button>
          </div>
        </div>
      </header>

      {/* === Centered School Picker Modal (kept) === */}
      {showPicker && (
        <EnterModal
          onClose={() => setShowPicker(false)}
          onPick={handlePickFromHeader}
          schools={SCHOOLS}
        />
      )}

      {/* === HERO (gap fixed + copy replaced) === */}
      <section
        className="relative isolate text-white min-h-screen flex flex-col justify-center overflow-x-hidden"
        style={{
          background:
            "linear-gradient(180deg, #EE5C5C 0%, #F16969 40%, #F78A8A 80%, #F59F9F 100%)",
        }}
      >
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-32 pb-24 text-center">
          <h1 className="font-black tracking-tight leading-tight text-[40px] sm:text-[56px] md:text-[72px]">
            AI doesn’t know your campus.<br />
            Cnapss does.
          </h1>

          <p className="mt-10 text-white/95 text-base sm:text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
            <span className="font-semibold">CNAPSS</span> connects verified students —
            sharing <span className="font-semibold">Real Stories, Opinions, and Experiences.</span>
          </p>
        </div>

        {/* scope chips (kept styles, safe for overflow-x-hidden) */}
        <style>{`
          .chip {
            display: inline-block;
            padding: .1em .5em;
            border-radius: .7em;
            line-height: 1;
            white-space: nowrap;
          }
          .chip--ai { background: #fff; color: #E11D48; }
          .chip--peers {
            color: #fff; border: 2px solid rgba(255,255,255,.85);
            border-radius: 1em; padding: .1em .7em;
          }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px) scale(.98);} to { opacity: 1; transform: translateY(0) scale(1);} }
          .animate-fadeInUp { animation: fadeInUp .18s ease-out; }
          @keyframes fadeBg { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeBg { animation: fadeBg .15s ease-out; }
        `}</style>
      </section>

      {/* === NEW INTERLUDE SECTION === */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2
            className="text-center font-black tracking-tight text-[36px] sm:text-[48px] md:text-[60px]"
            style={{ color: TOKENS.text }}
          >
            For students, By students
          </h2>
        </div>
      </section>

      {/* === ANONYMITY · BUT · VERIFIED (unchanged) === */}
      <section className="relative w-full pt-10 pb-0 md:pt-12 md:pb-2 -mb-10 md:-mb-16">
        <div className="-mx-4 md:-mx-6">
          <div className="relative mx-0 rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.12)]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, #E5E9EE 0%, #D8DEE6 46%, #EBDADA 50%, #EE5C5C 54%, #F16969 72%, #F59F9F 100%)",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(600px 220px at 50% 50%, rgba(255,255,255,.35), rgba(255,255,255,0) 60%)",
              }}
            />

            <div className="relative">
              <div className="hidden md:grid grid-cols-3 place-items-center h-[320px] lg:h-[360px]">
                <div className="text-center">
                  <div className="text-[12px] font-extrabold tracking-[.25em] text-slate-600 mb-3">ANONYMITY</div>
                  <div className="text-white drop-shadow-sm">
                    <h3 className="text-[38px] lg:text-[46px] font-black">Anonymous</h3>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-black/80 text-white px-6 py-2.5 text-[14px] lg:text-[16px] font-black shadow-[0_12px_28px_rgba(0,0,0,.25)]">
                    BUT
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-[12px] font-extrabold tracking-[.25em] text-white/80 mb-3">VERIFIED</div>
                  <div className="text-white drop-shadow-sm">
                    <h3 className="text-[38px] lg:text-[46px] font-black">Verified</h3>
                  </div>
                </div>
              </div>

              <div className="md:hidden flex flex-col items-center text-center py-12 gap-6">
                <div>
                  <div className="text-[11px] font-extrabold tracking-[.25em] text-slate-700 mb-2">ANONYMITY</div>
                  <h3 className="text-white text-[32px] font-black drop-shadow-sm">Anonymous</h3>
                </div>
                <span className="rounded-full bg-black/80 text-white px-5 py-2 text-[13px] font-black shadow-md">
                  BUT
                </span>
                <div>
                  <div className="text-[11px] font-extrabold tracking-[.25em] text-white/85 mb-2">VERIFIED</div>
                  <h3 className="text-white text-[32px] font-black drop-shadow-sm">Verified</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === FEATURE SHOWCASE (unchanged) === */}
      <Band bg="white" roomy>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <FeatureShowcase />
        </div>
      </Band>

      {/* === QUICK ENTER (kept) === */}
      <Band bg="white" roomy>
        <div className="mx-auto max-w-5xl px-4">
          <h2
            className="text-center text-[34px] sm:text-[42px] font-black"
            style={{ color: TOKENS.text }}
          >
            Choose your campus to continue
          </h2>
          <p className="mt-4 text-center text-[16px]" style={{ color: TOKENS.sub }}>
            Pick one here to enter directly. (Top-right button still works as well.)
          </p>

          <div
            className="mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-sm ring-1"
            style={{ borderColor: TOKENS.border }}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {SCHOOLS.map((s) => {
                const active = quickChosen === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setQuickChosen(s.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition
                      ${active ? "bg-red-50 border-red-200 text-red-700" : "bg-white hover:bg-black/5"}
                      ${!s.enabled ? "opacity-60" : ""}`}
                    style={{ borderColor: TOKENS.border }}
                    title={s.enabled ? s.name : "Coming soon"}
                  >
                    {s.short}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="text-sm">
                {!quickInfo && (
                  <span className="text-slate-500">No campus selected.</span>
                )}
                {quickInfo && quickInfo.enabled && (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {quickInfo.name} selected
                  </span>
                )}
                {quickInfo && !quickInfo.enabled && (
                  <span className="text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                    {quickInfo.name} · Coming soon
                  </span>
                )}
              </div>

              <button
                onClick={handleQuickEnter}
                disabled={!quickInfo || !quickInfo.enabled}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition ring-1
                  ${!quickInfo || !quickInfo.enabled
                    ? "bg-white text-slate-400 cursor-not-allowed ring-black/10"
                    : "bg-black text-white hover:bg-black/90 ring-black/10"}`}
                title={
                  !quickInfo
                    ? "Pick a campus"
                    : !quickInfo.enabled
                    ? "Coming soon"
                    : `Enter ${quickInfo.short} dashboard`
                }
              >
                Enter
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[13px] text-slate-500">
            You can also use the <strong>“Click to enter”</strong> button at the top right.
          </p>
        </div>
      </Band>
    </div>
  );
}

/* === Centered Picker Modal (header) === */
function EnterModal({ onClose, onPick, schools }) {
  const cardRef = useRef(null);

  const onBackdropClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onMouseDown={onBackdropClick}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fadeBg" />
      <div
        ref={cardRef}
        className="relative w-[min(92vw,28rem)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 p-4 sm:p-5 animate-fadeInUp"
      >
        <div className="px-1 pb-3">
          <div className="text-sm font-semibold text-slate-800">Choose your campus</div>
          <div className="text-xs text-slate-500 mt-1">Pick a school to open its dashboard.</div>
        </div>

        <div className="mt-1 flex flex-col">
          {schools.map((s, i) => (
            <button
              key={s.key}
              onClick={() => onPick(s)}
              disabled={!s.enabled}
              className={`w-full text-left px-4 py-3 rounded-xl transition
                ${s.enabled ? "hover:bg-black/5 active:scale-[0.99]" : "opacity-60 cursor-not-allowed bg-slate-50"}
                ${i !== 0 ? "mt-2" : ""}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-[15px] text-slate-900">
                  {s.name}
                </div>
                {!s.enabled && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>
              <div className="text-[12px] text-slate-500">{s.short}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-black/5"
            style={{ borderColor: "rgba(15,23,42,0.16)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Supporting components (unchanged) --- */

function HeroRed({ children }) {
  return (
    <div
      className="w-full"
      style={{
        background: "linear-gradient(180deg,#EF4444 0%,#F87171 100%)",
        color: "#fff",
      }}
    >
      {children}
    </div>
  );
}

function Band({ bg = "white", roomy = false, children }) {
  const bgColor = bg === "gray" ? TOKENS.bandGray : TOKENS.white;
  return (
    <section
      className={roomy ? "py-20 sm:py-28" : "py-10"}
      style={{ background: bgColor }}
    >
      {children}
    </section>
  );
}

function Primary({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-xl bg-black text-white font-semibold px-6 py-3 hover:bg-black/90 transition disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ValueCard({ eyebrow, title, emoji, text, tone = "slate" }) {
  const toneMap = {
    slate: { bg: "bg-slate-50", ring: "ring-slate-200", txt: "text-slate-600" },
    rose: { bg: "bg-rose-50", ring: "ring-rose-200", txt: "text-rose-600" },
  };
  const t = toneMap[tone] || toneMap.slate;

  return (
    <div
      className={`rounded-2xl ${t.bg} ring-1 ${t.ring} p-6 md:p-7 shadow-sm`}
      style={{ borderColor: TOKENS.border }}
    >
      <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2">
        {eyebrow}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-2xl">{emoji}</div>
        <h3
          className="text-[22px] sm:text-[24px] font-black"
          style={{ color: TOKENS.text }}
        >
          {title}
        </h3>
      </div>
      <p className={`mt-3 text-[16px] ${t.txt}`}>{text}</p>
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes floatIn { from { opacity: 0; transform: translateY(16px) scale(.96) rotate(-2deg); } to { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); } }
      @keyframes drift { from { transform: translateY(0) scale(1); } to { transform: translateY(-12px) scale(1.02); } }
      @keyframes softPulse { 0% { box-shadow: 0 0 0 0 rgba(14,165,233,0.25); } 70% { box-shadow: 0 0 0 12px rgba(14,165,233,0); } 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); } }
      @keyframes popIn { 0% { transform: scale(.6); opacity:.2 } 100% { transform: scale(1); opacity:1 } }
      @keyframes fadeIn { from {opacity:0} to {opacity:1} }
      @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );
}

/* ================= Showcase (Stripe-like) ================= */
function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef([null, null, null]);

  const recomputeActive = useCallback(() => {
    const center = window.innerHeight * 0.5;
    const distances = sectionRefs.current.map((el) => {
      if (!el) return Number.POSITIVE_INFINITY;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      return Math.abs(mid - center);
    });
    const minIdx = distances.indexOf(Math.min(...distances));
    if (minIdx !== -1) setActive(minIdx);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          recomputeActive();
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [recomputeActive]);

  return (
    <div className="grid md:grid-cols-12 gap-10 md:gap-16">
      {/* LEFT copy */}
      <div className="md:col-span-5">
        {[0, 1, 2].map((i) => (
          <article key={i} ref={(el) => (sectionRefs.current[i] = el)} className="flex items-center min-h-[90vh]">
            <div className="space-y-3">
              {i === 0 && (
                <>
                  <p className="text-[11px] font-extrabold tracking-wider text-red-600 uppercase">COMMUNITY · ANONYMOUS</p>
                  <h3 className="text-[34px] sm:text-[48px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
                    Freeboard
                  </h3>
                  <p className="text-[16px] leading-[1.8]" style={{ color: TOKENS.sub }}>
                    Real-time campus banter and memes. A scrolling magazine of student voices — always anonymous.
                  </p>
                </>
              )}
              {i === 1 && (
                <>
                  <p className="text-[11px] font-extrabold tracking-wider text-red-600 uppercase">ACADEMICS · Q&A</p>
                  <h3 className="text-[34px] sm:text-[48px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
                    Academic Board — General Q
                  </h3>
                  <p className="text-[16px] leading-[1.8]" style={{ color: TOKENS.sub }}>
                    Swipe through school questions as cards — reveal actionable answers from real students.
                  </p>
                </>
              )}
              {i === 2 && (
                <>
                  <p className="text-[11px] font-extrabold tracking-wider text-red-600 uppercase">SEEKING · CONNECT</p>
                  <h3 className="text-[34px] sm:text-[48px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
                    Academic Board — Seeking
                  </h3>
                  <p className="text-[16px] leading-[1.8]" style={{ color: TOKENS.sub }}>
                    Find study buddies, chat live, and lock the plan — all in a desktop-like flow.
                  </p>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* RIGHT sticky demos */}
      <div className="md:col-span-7">
        <div className="sticky top-20">
          <div className="relative h-[640px]">
            {/* Anonymous (Freeboard) demo with darker bg */}
            <Panel visible={active === 0}>
              {/* <div className="absolute inset-0 bg-slate-900" />
              <div className="relative z-10"> */}
                <GeneralQSwipe play={active === 0} />
              {/* </div> */}
            </Panel>
            {/* Academic – General Q */}
            <Panel visible={active === 1} delay={70}>
              <GeneralQSwipe play={active === 1} />
            </Panel>
            {/* Academic – Seeking */}
            <Panel visible={active === 2} delay={110}>
              <SeekingDesktop play={active === 2} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ children, visible, delay = 0 }) {
  return (
    <div
      className="absolute inset-0 transition-all duration-[800ms] ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px) scale(1)" : "translateY(28px) scale(0.97)",
        transitionDelay: `${delay}ms`,
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}



/* ================== Freeboard (perfectly aligned stack) ================== */
function FreeboardFloating({ play }) {
  const CARD_W = 560;
  const CARD_H = 320;
  const X_STEP = 34;
  const SCALE_1 = 1.0;
  const SCALE_2 = 0.94;
  const SCALE_3 = 0.88;
  const AUTO_MS = 4200;

  const ROT_ALL = 0;

  const posts = React.useMemo(
    () => [
      { tag: "Rumor", color: "#0EA5E9", emoji: "🕵️‍♂️", title: "Secret printer that never has a line?", likes: 87, comments: 19, ago: "1h" },
      { tag: "Confession", color: "#F59E0B", emoji: "😳", title: "I microwaved fish in the dorm—am I the villain?", likes: 132, comments: 44, ago: "2h",
        image: "https://images.unsplash.com/photo-1514516430039-589bd2f9ef41?q=80&w=1600&auto=format&fit=crop", imageAlt: "Dorm kitchen microwave" },
      { tag: "Overheard", color: "#10B981", emoji: "👂", title: "“Midterm ‘curve’ means cry-VE.” – at Bobst 😭", likes: 74, comments: 12, ago: "55m" },
      { tag: "Hot Take", color: "#EF4444", emoji: "🔥", title: "9am lectures should be illegal.", likes: 211, comments: 63, ago: "3h",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600&auto=format&fit=crop", imageAlt: "Sleepy student in lecture hall" },
      { tag: "Meme", color: "#8B5CF6", emoji: "🧃", title: "Dining hall ‘orange juice’ speed-run (0.4 sec).", likes: 98, comments: 27, ago: "1h" },
      { tag: "Tips", color: "#22D3EE", emoji: "💡", title: "Hidden study spot with outlets + sunlight", likes: 156, comments: 33, ago: "2h",
        image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1600&auto=format&fit=crop", imageAlt: "Sunny study spot" },
      { tag: "Rant", color: "#F43F5E", emoji: "💢", title: "Professor uploaded slides 3 minutes before class.", likes: 143, comments: 51, ago: "30m" },
      { tag: "Spotted", color: "#84CC16", emoji: "📸", title: "Dog parade near campus this Friday 🐶", likes: 169, comments: 22, ago: "4h",
        image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=1600&auto=format&fit=crop", imageAlt: "Dogs near campus" },
    ],
    []
  );

  const [idx, setIdx] = React.useState(0);
  const len = posts.length;
  const timerRef = React.useRef(null);

  const next = React.useCallback(() => setIdx((i) => (i + 1) % len), [len]);
  const start = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_MS);
  }, [next]);
  const stop = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  React.useEffect(() => { if (play) start(); return stop; }, [play, start, stop]);

  const relPos = (i) => {
    const r = (i - idx) % len;
    return r < 0 ? r + len : r;
  };

  return (
    <>
      <Keyframes />
      <div className="relative h-full w-full" onMouseEnter={stop} onMouseLeave={start}>
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 360px at 65% 60%, rgba(59,130,246,0.08), rgba(124,58,237,0.05) 40%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex items-end justify-start pl-2 md:pl-6">
          <div className="relative" style={{ width: CARD_W + X_STEP * 2 + 12, height: CARD_H }}>
            {posts.map((p, i) => {
              const r = relPos(i);

              let x = 0, scale = SCALE_1, z = 30, opacity = 1, shadow = "0 28px 56px rgba(15,23,42,0.22)";

              if (r === 0) {
                x = 0; scale = SCALE_1; z = 30; opacity = 1;
              } else if (r === 1) {
                x = X_STEP; scale = SCALE_2; z = 20; opacity = 0.98;
                shadow = "0 20px 40px rgba(15,23,42,0.16)";
              } else if (r === 2) {
                x = X_STEP * 2; scale = SCALE_3; z = 10; opacity = 0.94;
                shadow = "0 14px 28px rgba(15,23,42,0.12)";
              } else if (r === len - 1) {
                x = -110; scale = SCALE_2; z = 5; opacity = 0;
                shadow = "0 10px 24px rgba(15,23,42,0.10)";
              } else {
                x = X_STEP * 2 + 60; scale = SCALE_3; z = 0; opacity = 0;
              }

              return (
                <div
                  key={`${i}-${p.title}`}
                  className="absolute bottom-0 left-0 will-change-transform rounded-2xl"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    transformOrigin: "50% 100%",
                    transform: `translateX(${x}px) rotate(${ROT_ALL}deg) scale(${scale})`,
                    transition: "transform 640ms cubic-bezier(0.34,1,0.68,1), opacity 420ms ease, box-shadow 420ms ease",
                    opacity,
                    zIndex: z,
                    boxShadow: shadow,
                  }}
                >
                  <FBCard width={CARD_W} height={CARD_H} fixedHeight {...p} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0"
             style={{ width: 36, background: "linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))" }} />
        <div className="pointer-events-none absolute inset-y-0 right-0"
             style={{ width: 48, background: "linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))" }} />
      </div>
    </>
  );
}

function FBCard({ width, height, fixedHeight = false, tag, color, emoji, title, likes, comments, ago, active, image, imageAlt = "" }) {
  const hasImage = !!image;
  const IMG_H = fixedHeight ? Math.round((height || 320) * 0.48) : undefined;

  return (
    <div
      className="shrink-0 rounded-2xl bg-white ring-1 overflow-hidden"
      style={{
        width,
        height: fixedHeight ? height : "auto",
        borderColor: "rgba(15,23,42,0.12)",
        boxShadow: active ? "0 28px 56px rgba(15,23,42,0.22)" : "0 14px 28px rgba(15,23,42,0.14)",
        transition: "box-shadow 360ms ease, opacity 360ms ease",
      }}
    >
      {hasImage ? (
        <div className="relative" style={{ height: IMG_H }}>
          <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-transparent" />
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ background: `${color}` }}
          >
            {tag}
          </span>
        </div>
      ) : (
        fixedHeight && <div style={{ height: IMG_H }} />
      )}

      <div className={`p-5 md:p-6 ${hasImage ? "pt-4 md:pt-5" : ""}`}>
        {!hasImage && (
          <div className="flex items-start justify-between gap-3">
            <div className="text-2xl">{emoji}</div>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
              style={{ background: color }}
            >
              {tag}
            </span>
          </div>
        )}

        <p className={`font-extrabold text-slate-900 leading-snug ${hasImage ? "text-[20px] md:text-[22px]" : "mt-3 text-[20px] md:text-[22px]"}`}>
          {title}
        </p>

        <div className="mt-4 flex items-center gap-4 text-[12px] text-slate-600">
          <span className="flex items-center gap-1">👍 {likes}</span>
          <span className="flex items-center gap-1">💬 {comments}</span>
          <span className="ml-auto">{ago} ago</span>
        </div>
      </div>
    </div>
  );
}

/* ================== General Q — swipe carousel ================== */
function GeneralQSwipe({ play }) {
  const CARD_W = 560;
  const GAP = 28;
  const STEP = CARD_W + GAP;

  const cards = React.useMemo(
    () => [
      { tag: "Campus", title: "Where do I book study rooms?", meta: "9 answers · 1h", accent: TOKENS.blue,
        thread: [
          { who: "A", text: "Use the library portal → Bobst → Reserve a Room." },
          { who: "B", text: "Slots open at 7am. Book early for good times." },
          { who: "You", text: "I’ll drop a quick how-to in the comments." },
        ]},
      { tag: "Career", title: "Prep for NYC SWE tech screens?", meta: "15 answers · 1d", accent: TOKENS.sky,
        thread: [
          { who: "A", text: "Arrays/graphs plus systems basics helped a ton." },
          { who: "B", text: "Do timed mock interviews with classmates." },
          { who: "You", text: "I can share my practice set after class." },
        ]},
      { tag: "Courses", title: "Is Prof. Lee's midterm curved?", meta: "12 answers · 3h", accent: TOKENS.purple,
        thread: [
          { who: "A", text: "Usually curved ~10% based on past years." },
          { who: "B", text: "Last term’s syllabus allowed one retake." },
          { who: "You", text: "Thanks — I’ll update after the exam." },
        ]},
      { tag: "Resources", title: "Bloomberg terminal access?", meta: "6 answers · 2h", accent: TOKENS.amber,
        thread: [
          { who: "A", text: "Ask at the Tisch library desk for credentials." },
          { who: "B", text: "Complete the short training first." },
          { who: "You", text: "Nice — I’ll book a slot and report back." },
        ]},
    ],
    []
  );

  const list3 = React.useMemo(() => [...cards, ...cards, ...cards], [cards]);
  const BASE = cards.length;
  const [cur, setCur] = useState(0);
  const pos = BASE + cur;
  const [animate, setAnimate] = useState(true);

  const [pressing, setPressing] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const playKey = `${cur}-${showAnswers}`;

  const timers = React.useRef([]);
  const clearTimers = React.useCallback(() => {
    timers.current.forEach((t) => (t.kind === "i" ? clearInterval(t.id) : clearTimeout(t.id)));
    timers.current = [];
  }, []);

  useEffect(() => {
    clearTimers();
    setPressing(false);
    setShowAnswers(false);
    if (!play) return;

    const typingLen = (cards[cur].thread?.[2]?.text || "").length;
    const DELAY_BEFORE_PRESS = 900;
    const PRESS_TIME = 220;
    const AFTER_PRESS_TO_PANEL = 200;
    const COMMENT_FLOW_MS = 320 + 900 + 420 + typingLen * 34 + 220 + 360;
    const EXTRA_DWELL = 700;
    const AUTO_NEXT_MS = DELAY_BEFORE_PRESS + PRESS_TIME + AFTER_PRESS_TO_PANEL + COMMENT_FLOW_MS + EXTRA_DWELL;

    timers.current.push({ kind: "t", id: setTimeout(() => setPressing(true), DELAY_BEFORE_PRESS) });
    timers.current.push({ kind: "t", id: setTimeout(() => setPressing(false), DELAY_BEFORE_PRESS + PRESS_TIME) });
    timers.current.push({ kind: "t", id: setTimeout(() => setShowAnswers(true), DELAY_BEFORE_PRESS + PRESS_TIME + AFTER_PRESS_TO_PANEL) });
    timers.current.push({ kind: "t", id: setTimeout(() => setCur((c) => (c + 1) % cards.length), AUTO_NEXT_MS) });

    return clearTimers;
  }, [cur, play, cards, clearTimers]);

  useEffect(() => {
    if (!play) {
      clearTimers();
      setAnimate(false);
      setCur(0);
      setPressing(false);
      setShowAnswers(false);
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [play, clearTimers]);

  return (
    <>
      <Keyframes />
      <div className="h-full w-full rounded-3xl overflow-visible">
        <div className="h-full flex flex-col justify-center px-6">
          {/* top: question cards */}
          <div className="relative w-full overflow-hidden mb-4">
            <div
              className="flex items-stretch"
              style={{
                gap: `${GAP}px`,
                transform: `translateX(${-pos * STEP}px)`,
                transition: animate ? "transform 680ms cubic-bezier(0.34,1,0.68,1)" : "none",
              }}
            >
              {list3.map((c, i) => (
                <QQuestionCard
                  key={`${i}-${c.tag}`}
                  width={CARD_W}
                  tag={c.tag}
                  title={c.title}
                  meta={c.meta}
                  accent={c.accent}
                  active={i === pos}
                  dim={i !== pos}
                  pressing={pressing && i === pos}
                />
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 left-0"
              style={{
                width: 36,
                background: "linear-gradient(to right, rgba(255,255,255,0.55), rgba(255,255,255,0))",
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0"
              style={{
                width: 36,
                background: "linear-gradient(to left, rgba(255,255,255,0.55), rgba(255,255,255,0))",
              }}
            />
          </div>

          {/* bottom: comments panel */}
          <QComments show={showAnswers} thread={cards[cur].thread} playKey={playKey} />
        </div>
      </div>
    </>
  );
}

function QQuestionCard({ width, tag, title, meta, accent, dim, active, pressing }) {
  return (
    <div
      className="shrink-0 rounded-2xl ring-1 bg-white p-6 md:p-7"
      style={{
        width,
        borderColor: TOKENS.border,
        transform: dim ? "scale(.94)" : "scale(1)",
        boxShadow: dim ? "0 10px 24px rgba(15,23,42,0.10)" : "0 20px 40px rgba(15,23,42,0.18)",
        transition: "transform 400ms ease, box-shadow 400ms ease",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <span className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: accent }}>
          {tag}
        </span>
      </div>

      <p className="text-[26px] leading-[1.2] font-black text-slate-900">{title}</p>
      <div className="mt-3 flex items-center gap-2 text-[14px] text-slate-500">{meta}</div>

      <button
        className="mt-6 rounded-full bg-black px-4 py-2 text-[14px] font-bold text-white transition-transform"
        style={{
          transform: pressing ? "scale(0.95)" : "scale(1)",
          boxShadow: pressing ? "inset 0 0 0 9999px rgba(255,255,255,0.06)" : "none",
        }}
      >
        View answers
      </button>
    </div>
  );
}

function QComments({ show, thread, playKey }) {
  const [shown, setShown] = useState([]);
  const [composerText, setComposerText] = useState("");
  const [blink, setBlink] = useState(true);
  const [pressingPost, setPressingPost] = useState(false);
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => (t.kind === "i" ? clearInterval(t.id) : clearTimeout(t.id)));
    timers.current = [];
  }, []);

  const palette = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6", "#22D3EE"];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const anonOf = (text, idx = 0) => {
    const h = hash(text + idx);
    const id = (h % 97) + 3;
    const color = palette[h % palette.length];
    return { id, color };
  };

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    clearTimers();
    setShown([]);
    setComposerText("");
    setPressingPost(false);
    if (!show) return;

    timers.current.push({ kind: "t", id: setTimeout(() => setShown([thread[0]]), 320) });
    timers.current.push({ kind: "t", id: setTimeout(() => setShown((s) => [...s, thread[1]]), 1200) });

    timers.current.push({
      kind: "t",
      id: setTimeout(() => {
        const full = thread[2].text || "";
        let i = 1;
        const inter = setInterval(() => {
          setComposerText(full.slice(0, i));
          i += 1;
          if (i > full.length) {
            clearInterval(inter);
            setTimeout(() => {
              setPressingPost(true);
              setTimeout(() => {
                setPressingPost(false);
                setShown((s) => [...s, thread[2]]);
                setComposerText("");
              }, 200);
            }, 180);
          }
        }, 34);
        timers.current.push({ kind: "i", id: inter });
      }, 2000),
    });

  return () => clearTimers();
  }, [show, playKey, thread, clearTimers]);

  return (
    <div
      className="rounded-2xl bg-white/90 backdrop-blur px-5 py-4 shadow-sm"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(10px)",
        transition: "all 480ms cubic-bezier(0.34,1.56,0.64,1)",
        minHeight: 160,
      }}
    >
      <div className="space-y-3">
        {shown.map((m, i) => {
          const isYou = m.who === "You";
          const { id, color } = isYou ? { id: "you", color: "#111827" } : anonOf(m.text, i);
          return (
            <div
              key={`${i}-${m.who}`}
              className="flex items-start gap-3"
              style={{ opacity: 0, animation: "fadeSlideUp 380ms ease forwards", animationDelay: `${i * 40}ms` }}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: color }}
                title={isYou ? "Anonymous (you)" : `Anonymous #${id}`}
              >
                {isYou ? "You" : "A"}
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-slate-500">
                  {isYou ? "Anonymous (you)" : `Anonymous #${id}`} · {i === 0 ? "1h" : i === 1 ? "45m" : "just now"}
                </div>
                <div
                  className={`mt-1 rounded-xl px-3 py-2 text-[14px] ring-1 ${
                    isYou ? "bg-emerald-50 ring-emerald-200 text-slate-900" : "bg-slate-50 ring-black/5 text-slate-900"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3 pt-1">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: "#111827" }}
            title="Anonymous (you)"
          >
            You
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="flex-1 rounded-xl border px-3 py-2 text-[14px] text-slate-900 bg-white"
              style={{ borderColor: TOKENS.border }}
              aria-readonly
            >
              {composerText || <span className="text-slate-400">Write a comment…</span>}
              {composerText && <span style={{ opacity: blink ? 1 : 0 }}>▍</span>}
            </div>
            <button
              disabled={!composerText}
              className="rounded-lg bg-black text-white px-4 py-2 text-[13px] font-bold transition-transform disabled:opacity-40"
              style={{ transform: pressingPost ? "scale(0.95)" : "scale(1)" }}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== Academic Board — Seeking (full, drop-in) ================== */
/** 
 * Usage:
 *   <div className="h-[560px]"><SeekingDesktop play /></div>
 */
function SeekingDesktop({ play }) {
  const [step, setStep] = useState(0);
  const [activePost, setActivePost] = useState(null);
  const [composerText, setComposerText] = useState("");
  const [messages, setMessages] = useState([]);
  const [offerPulse, setOfferPulse] = useState(false);
  const [clickedFeedId, setClickedFeedId] = useState(null);

  const feedRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const chatRef = useRef(null);
  const hasRunRef = useRef(false);

  const SEED = useMemo(
    () => [
      { id: "p1", icon: "📝", title: "Principles of Microeconomics", meta: "", badges: ["Lecture Notes", "Syllabus", "Quiz Prep"], author: "Mina", kind: "Course Materials", time: "" },
      { id: "p3", icon: "👥", title: "Study Mate for Calc II", meta: "Looking for 2 peers · Weekends", badges: ["Study Group"], author: "Yuna", kind: "Study Mate", time: "" },
      { id: "p4", icon: "☕", title: "Coffee chat: SWE internships", meta: "Looking for a senior in CS major who can share internship tips…", badges: [], author: "Leo", kind: "Coffee Chat", time: "" },
      { id: "p5", icon: "📝", title: "Linear Algebra", meta: "", badges: ["Lecture Notes"], author: "Noah", kind: "Course Materials", time: "" },
      { id: "p6", icon: "👥", title: "Study Mate for DS-UA 201", meta: "Afternoons preferred", badges: ["Study Group"], author: "Irene", kind: "Study Mate", time: "" },
      { id: "p8", icon: "📝", title: "Principles of Statistics", meta: "", badges: ["Lecture Notes", "Quiz Prep"], author: "Sam", kind: "Course Materials", time: "" },
    ],
    []
  );

  const FEED = useMemo(() => {
    const arr = [];
    const copies = 3;
    for (let i = 0; i < copies; i++) {
      const chunk = [...SEED];
      if (i % 2 === 0) chunk.reverse();
      chunk.forEach((p, idx) => arr.push({ ...p, id: `${p.id}-${i}-${idx}` }));
    }
    const seen = new Set();
    const uniq = arr.filter((p) => {
      if (seen.has(p.title)) return false;
      seen.add(p.title);
      return true;
    });
    return uniq.slice(0, 9);
  }, [SEED]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let timers = [];

    const stopScroll = () => {
      if (scrollTimerRef.current) {
        clearInterval(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };

    const resetState = () => {
      setStep(0);
      setActivePost(null);
      setComposerText("");
      setMessages([]);
      setOfferPulse(false);
      setClickedFeedId(null);
      stopScroll();
      if (feedRef.current) feedRef.current.scrollTop = 0;
    };

    const run = () => {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      resetState();

      const TARGET_SEED =
        SEED.find((p) => p.title === "Principles of Microeconomics") ||
        SEED.find((p) => p.kind === "Course Materials") ||
        SEED[0];

      const SCROLL_PX_PER_TICK = 16;
      timers.push(
        setTimeout(() => {
          const node = feedRef.current;
          if (!node) return;
          node.scrollTop = 0;
          scrollTimerRef.current = setInterval(() => {
            node.scrollTop += SCROLL_PX_PER_TICK;
          }, 16);
        }, 350)
      );

      timers.push(
        setTimeout(() => {
          stopScroll();
          const targetFeed = FEED.find((f) => f.title === TARGET_SEED.title);
          if (targetFeed) setClickedFeedId(targetFeed.id);
        }, 2000)
      );

      timers.push(
        setTimeout(() => {
          setActivePost(TARGET_SEED);
          setStep(2);
        }, 2500)
      );

      const YOU_OPENING =
        "Hey! I saw your post looking for microeconomics notes. I have a clean set from this semester — thinking around $10. What price did you have in mind?";
      timers.push(
        setTimeout(() => {
          setComposerText(YOU_OPENING);
          setOfferPulse(true);
          timers.push(setTimeout(() => setOfferPulse(false), 900));
        }, 3300)
      );

      timers.push(
        setTimeout(() => {
          setStep(3);
          setMessages([{ who: "You", text: YOU_OPENING }]);
          timers.push(setTimeout(() => setMessages((m) => [...m, { who: "Sam", text: "That sounds good to me. $10 works!" }]), 900));
          timers.push(setTimeout(() => setMessages((m) => [...m, { who: "You", text: "Awesome — want to meet at Bobst Library today around 7:00 PM?" }]), 1700));
          timers.push(setTimeout(() => setMessages((m) => [...m, { who: "Sam", text: "Perfect. Cash or Venmo—either is fine. See you at the main entrance!" }]), 2500));
        }, 4100)
      );
    };

    if (play) {
      run();
    } else {
      hasRunRef.current = false;
      resetState();
    }

    return () => {
      timers.forEach(clearTimeout);
      stopScroll();
    };
  }, [play]);

  return (
    <>
      <Keyframes />
      <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl bg-white">
        {/* Mock browser bar */}
        <div className="h-12 flex items-center justify-between px-6 border-b bg-slate-50" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-8 px-5 py-1.5 rounded-lg bg-white text-xs text-slate-600 text-center" style={{ border: `1px solid ${TOKENS.border}` }}>
            cnapss.com/academic
          </div>
          <div className="text-xs text-slate-400">⋯</div>
        </div>

        {/* Canvas */}
        <div className="relative h-[calc(100%-48px)]">
          {/* ===== Step 0: Feed ===== */}
          <div
            className="absolute inset-0 grid grid-rows-[auto_1fr] min-h-0"
            style={{ opacity: step === 0 ? 1 : 0, transition: "opacity 600ms ease", pointerEvents: step === 0 ? "auto" : "none" }}
          >
            <div className="px-8 py-6 border-b" style={{ borderColor: TOKENS.border }}>
              <div className="max-w-4xl mx-auto flex items-center gap-3">
                <input disabled placeholder="Keyword" className="flex-1 rounded-xl border px-4 py-3 text-sm bg-white" style={{ borderColor: TOKENS.border }} />
                <button disabled className="rounded-xl border px-3 py-2.5 text-sm bg-white flex items-center gap-2" style={{ borderColor: TOKENS.border }}>
                  <span className="text-slate-500">Type</span>
                  <strong className="text-slate-900">Seeking</strong>
                  <span className="text-slate-400">▾</span>
                </button>
                <Pill label="School" value="NYU" />
                <Pill label="Sort" value="Latest" />
              </div>
            </div>

            <div className="overflow-y-hidden">
              <div ref={feedRef} className="h-full overflow-y-auto scroll-smooth px-8 py-6">
                <div className="max-w-4xl mx-auto space-y-4">
                  {FEED.map((p, idx) => (
                    <FeedCard
                      key={p.id}
                      index={idx}
                      icon={p.icon}
                      title={p.title}
                      meta={p.meta}
                      badges={p.badges}
                      selected={clickedFeedId === p.id}
                      kind={p.kind}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Step 2: Detail ===== */}
          <div
            className="absolute inset-0 min-h-0"
            style={{ opacity: step === 2 ? 1 : 0, transform: step === 2 ? "translateX(0)" : "translateX(24px)", transition: "all 700ms cubic-bezier(0.34,1.56,0.64,1)", pointerEvents: step === 2 ? "auto" : "none" }}
          >
            <div className="p-10 max-w-3xl mx-auto min-h-0 flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{activePost?.icon || "📝"}</span>
                <div>
                  <h4 className="text-2xl font-black text-slate-900">{activePost?.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">Seeking · Course Materials</p>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {(activePost?.badges || []).map((b) => (
                  <Tag key={b} label={b} />
                ))}
              </div>

              <div className="rounded-2xl ring-1 p-5 bg-white" style={{ borderColor: TOKENS.border }}>
                <div className="text-[13px] font-semibold mb-2" style={{ color: TOKENS.text }}>
                  Send a Request
                </div>
                <textarea
                  disabled
                  rows={4}
                  value={composerText}
                  placeholder="Write a short message (who you are / what you need)…"
                  className="w-full rounded-xl border px-4 py-3 text-sm bg-slate-50"
                  style={{ borderColor: TOKENS.border }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[12px] text-slate-500">
                    Target: <strong>Academic · course_materials</strong>
                  </div>
                  <button
                    disabled
                    className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${
                      offerPulse ? "animate-[softPulse_1200ms_ease_infinite] bg-emerald-600" : "bg-black hover:bg-black/90"
                    }`}
                  >
                    Send offer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Step 3: Messages ===== */}
          <div
            className="absolute inset-0 grid grid-cols-5 min-h-0"
            style={{ opacity: step === 3 ? 1 : 0, transform: step === 3 ? "translateX(0)" : "translateX(24px)", transition: "all 700ms cubic-bezier(0.34,1.56,0.64,1)", pointerEvents: step === 3 ? "auto" : "none" }}
          >
            <div className="col-span-2 border-r p-6 space-y-3 min-h-0" style={{ borderColor: TOKENS.border }}>
              <div className="px-1 pb-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Messages</div>
              <SideChatItem active icon={activePost?.icon || "📝"} title={activePost?.title || "Post"} />
              <SideChatItem icon="👥" title="Study Mate for Calc II" />
              <SideChatItem icon="☕" title="Coffee chat: SWE internships" />
            </div>

            <div className="col-span-3 p-8 flex flex-col min-h-0">
              <div className="flex items-center gap-3 pb-5 border-b" style={{ borderColor: TOKENS.border }}>
                <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold">S</div>
                <div><div className="text-sm font-bold">Sam</div></div>
                <span className="ml-auto text-[12px] rounded-full bg-black/5 px-2.5 py-1 font-semibold text-slate-700">
                  Seeking · Course Materials
                </span>
              </div>

              <div ref={chatRef} className="flex-1 min-h-0 py-5 space-y-4 overflow-y-auto">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.who === "You" ? "justify-end" : "justify-start"}`}
                    style={{ opacity: 0, animation: "fadeSlideUp 500ms ease forwards", animationDelay: `${i * 110}ms` }}
                  >
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-6 ${msg.who === "You" ? "bg-black text-white" : "bg-slate-100 text-slate-900"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-5 border-t flex gap-3" style={{ borderColor: TOKENS.border }}>
                <input disabled placeholder="Type a message..." className="flex-1 rounded-xl border px-4 py-3 text-sm bg-slate-50" style={{ borderColor: TOKENS.border }} />
                <button disabled className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed">Send</button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="rounded-full bg-black/5 px-3 py-1 text-[12px] font-semibold text-slate-700">Student verified</span>
                <span className="rounded-full bg-black/5 px-3 py-1 text-[12px] font-semibold text-slate-700">No in-app payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- UI bits ---------- */

function Pill({ label, value }) {
  return (
    <div className="text-[12px] rounded-full bg-slate-50 px-3 py-1.5 ring-1" style={{ borderColor: TOKENS.border }}>
      <span className="text-slate-400 mr-1">{label}:</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function Tag({ label }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700">
      {label}
    </span>
  );
}

function FeedCard({ index, icon, title, meta, badges, selected, kind }) {
  const showTags = kind === "Course Materials";
  const showPreview = kind === "Coffee Chat";
  const showMeta = kind === "Study Mate";

  return (
    <div
      className={`rounded-2xl p-5 ring-1 transition ${selected ? "bg-emerald-50 ring-emerald-400 scale-[0.995]" : "bg-white"}`}
      style={{
        borderColor: selected ? "rgb(52 211 153)" : TOKENS.border,
        opacity: 0,
        transform: "translateY(10px)",
        animation: "fadeSlideUp 600ms ease forwards",
        animationDelay: `${60 + index * 40}ms`,
        boxShadow: selected ? "0 0 0 4px rgba(16,185,129,0.15)" : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="text-2xl leading-none">{icon}</div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold">{title}</div>

          {showTags && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <Tag key={`${title}-${b}-${i}`} label={b} />
              ))}
            </div>
          )}

          {showPreview && <div className="text-[13px] text-slate-700 mt-1">{meta}</div>}

          {showMeta && !showTags && !showPreview && meta && (
            <div className="text-[12px] text-slate-500 mt-1">{meta}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SideChatItem({ icon, title, active = false }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${active ? "bg-emerald-50" : "bg-white"}`} style={{ borderColor: TOKENS.border }}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{icon}</span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold leading-5">{title}</div>
        </div>
      </div>
    </div>
  );
}








