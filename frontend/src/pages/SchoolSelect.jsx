// frontend/src/pages/SchoolSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSchool } from "../contexts/SchoolContext";

/* ====== Tokens (Toss-like bands, roomy type) ====== */
const TOKENS = {
  pageBg: "#F7F8FA",
  bandGray: "#F3F6F9",
  text: "#0F172A",
  sub: "#475569",
  red: "#EF4444",          // hero base
  redSoft: "#F87171",      // hero gradient soft
  border: "rgba(15,23,42,0.16)",
  white: "#FFFFFF",
  green: "#10B981",
  blue: "#2563EB",
  sky: "#0EA5E9",
};

/* ====== Mock schools ====== */
const SCHOOLS = [
  { key: "nyu", short: "NYU", name: "New York University", enabled: true,  domains: ["nyu.edu"] },
  { key: "columbia", short: "Columbia", name: "Columbia University", enabled: false, domains: ["columbia.edu"] },
  { key: "boston", short: "Boston", name: "Boston University", enabled: false, domains: ["bu.edu", "boston.edu"] },
];

export default function SchoolSelect() {
  const { setSchool } = useSchool();

  const [selected, setSelected] = useState("nyu");
  const selectedInfo = useMemo(
    () => SCHOOLS.find((s) => s.key === selected) || SCHOOLS[0],
    [selected]
  );

  // waitlist
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const inputRef = useRef(null);

  useEffect(() => { setMsg({ type: "", text: "" }); }, [selected]);

  const emailLooksValidForSchool = (e, school) => {
    if (!e || !e.includes("@")) return false;
    const dom = e.split("@").pop().toLowerCase();
    return (school.domains || []).some((d) => dom === d || dom.endsWith(`.${d}`));
  };

  const handleJoin = async (ev) => {
    ev.preventDefault();
    setMsg({ type: "", text: "" });

    if (!email) {
      setMsg({ type: "error", text: "Please enter your school email." });
      inputRef.current?.focus();
      return;
    }
    if (!emailLooksValidForSchool(email, selectedInfo)) {
      setMsg({
        type: "error",
        text: `Use a valid ${selectedInfo.short} school email (e.g., *@${selectedInfo.domains[0]}).`,
      });
      inputRef.current?.focus();
      return;
    }
    if (!selectedInfo.enabled) {
      setMsg({ type: "error", text: `${selectedInfo.short} is coming soon.` });
      return;
    }

    setSubmitting(true);
    try {
      const url = import.meta?.env?.VITE_WAITLIST_URL;
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, school: selectedInfo.key }),
        });
      }
      setSchool?.(selectedInfo.key);
      setMsg({
        type: "success",
        text: `You're on the waitlist for ${selectedInfo.short}. We'll email you soon.`,
      });
      setEmail("");
    } catch {
      setMsg({ type: "error", text: "Something went wrong. Please try again later." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      {/* ====== Sc1. HERO ====== */}
      <HeroRed>
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="mt-1 text-[54px] leading-[1.06] sm:text-[80px] font-black text-white">
            Your Campus,<br className="hidden sm:block" /> Closer than ever
          </h1>
        </div>
      </HeroRed>

      {/* ====== Sc2. Why CNAPSS (익명 + 인증 강조) ====== */}
      <Band bg="white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[18px] font-extrabold tracking-wide text-red-600">
            Why CNAPSS
          </p>
          <h2 className="mt-3 max-w-4xl text-[44px] sm:text-[52px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
            Real students. Real voices. Always anonymous.
          </h2>
          <p className="mt-6 max-w-3xl text-[18px] leading-[1.9]" style={{ color: TOKENS.sub }}>
            Only verified students can join — so you know it’s your peers. Share freely,
            ask openly, stay anonymous.
          </p>
        </div>
      </Band>

      {/* ====== Sc3. Campus Boards (카피/보드명 교체) ====== */}
      <Band bg="gray">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-4xl">
            <p className="text-[18px] font-extrabold tracking-wide text-red-600">
              Campus Board
            </p>
            <h2 className="mt-3 text-[44px] sm:text-[52px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
              Ask anything — campus life & academics, all anonymous
            </h2>
            <p className="mt-6 text-[20px] leading-[1.9]" style={{ color: TOKENS.sub }}>
              Campus Boards combine everyday conversations and academic discussions — all under the safety of anonymity.
              From casual tips to course advice and career paths, connect with peers freely.
            </p>
          </div>

          {/* 보드 카드: General / Academic */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <BoardCard
              accent={TOKENS.blue}
              title="General Board"
              threads={[
                { title: "Best late-night study spots on campus?", meta: "24 replies · 1h ago" },
                { title: "Anyone up for basketball tomorrow? 🏀", meta: "8 replies · 3h ago" },
                { title: "Can I bring an air fryer to dorms?", meta: "5 replies · 5h ago" },
              ]}
            />
            <BoardCard
              accent={TOKENS.sky}
              title="Academic Board"
              threads={[
                { title: "NYC SWE internships: prep for tech screens?", meta: "Thread · 9 replies" },
                { title: "Share your behavioral interview notes", meta: "6 replies · 1d ago" },
                { title: "CS-UY networking events this week", meta: "3 replies · 20m ago" },
              ]}
            />
          </div>
        </div>
      </Band>

      {/* ====== Sc4. CourseHub — phone mock (이전 유지) ====== */}
      <Band bg="white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 md:grid-cols-12">
          <div className="md:col-span-6 max-w-xl">
            <p className="text-[18px] font-extrabold tracking-wide text-red-600">CourseHub</p>
            <h2 className="mt-3 text-[44px] sm:text-[52px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
              Find classmates by course. <br className="hidden sm:block"/>Connect in chat — not in storage.
            </h2>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.95]" style={{ color: TOKENS.sub }}>
              Discover threads and people for a specific class. CNAPSS doesn’t host or sell files —
              it simply connects you so you can coordinate how to share and discuss.
            </p>
          </div>

          <div className="md:col-span-6 justify-self-center">
            <PhoneFrame3D>
              <CoursehubChatScreen />
            </PhoneFrame3D>
          </div>
        </div>
      </Band>

      {/* ====== Sc5. Marketplace (유지) ====== */}
      <Band bg="gray">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-16 px-4 md:grid-cols-12">
          <div className="md:col-span-6 max-w-xl">
            <p className="text-[18px] font-extrabold tracking-wide text-red-600">Marketplace</p>
            <h2 className="mt-3 text-[44px] sm:text-[52px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
              Meet the right buyer or seller
            </h2>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.95]" style={{ color: TOKENS.sub }}>
              Students match — then agree on price, place, and details in chat.
              No in-app payment or escrow. Simple, direct, student to student.
            </p>
          </div>

          <div className="md:col-span-6">
            <DealCard
              headline="Match found"
              lines={[
                "Item · MATH-UA 120 Textbook — $15",
                "Next steps · Decide time & place in chat",
              ]}
              bubbles={[
                { who: "You",  text: "Union Square works for me. 6pm today?" },
                { who: "Alex", text: "Perfect — NYU Bookstore entrance?" },
                { who: "You",  text: "Sounds good. I’ll pay via Venmo." },
              ]}
              badges={["Student verified", "No in-app payment"]}
            />
          </div>
        </div>
      </Band>

      {/* ====== Sc6. Meet the Founders (신규) ====== */}
      <Band bg="white">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[18px] font-extrabold tracking-wide text-red-600">
            Meet the Founders
          </p>
          <h2 className="mt-3 max-w-4xl text-[44px] sm:text-[52px] font-black leading-[1.08]" style={{ color: TOKENS.text }}>
            We’re students — just like you
          </h2>
          <p className="mt-6 max-w-3xl text-[18px] leading-[1.9]" style={{ color: TOKENS.sub }}>
            CNAPSS was born from our own campus experience. As fellow students, we wanted a space
            to connect, ask, and share safely.
          </p>
        </div>
      </Band>

      {/* ====== Sc7. WAITLIST (유지, Founders 뒤) ====== */}
      <Band bg="white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-[34px] sm:text-[42px] font-black" style={{ color: TOKENS.text }}>
            Join the waitlist
          </h2>
          <p className="mt-4 text-center text-[16px]" style={{ color: TOKENS.sub }}>
            Choose your school and enter your school email. We’ll notify you when it’s ready.
          </p>

          <div
            className="mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-sm ring-1"
            style={{ borderColor: TOKENS.border }}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {SCHOOLS.map((s) => {
                const active = selected === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSelected(s.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      active ? "bg-red-50 border-red-200 text-red-700" : "bg-white hover:bg-black/5"
                    } ${!s.enabled ? "opacity-60" : ""}`}
                    style={{ borderColor: TOKENS.border }}
                    title={s.enabled ? s.name : "Coming soon"}
                  >
                    {s.short}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleJoin} className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={`Enter your ${selectedInfo.short} school email`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3.5 text-[15px] outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border }}
                />
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: TOKENS.sub }}
                >
                  @{selectedInfo.domains[0]}
                </span>
              </div>
              <Primary type="submit" disabled={submitting || !selectedInfo.enabled}>
                {submitting ? "Joining..." : "Join"}
              </Primary>
            </form>

            {msg.text && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-5 rounded-xl px-3 py-2 text-sm ${
                  msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </Band>
    </div>
  );
}

/* ================== Layout helpers ================== */
function Band({ children, bg = "white" }) {
  const isGray = bg === "gray";
  return (
    <section className="w-full" style={{ background: isGray ? TOKENS.bandGray : TOKENS.white }}>
      <div className="py-24 sm:py-28">{children}</div>
    </section>
  );
}

/* HERO: red gradient + soft white radial (no eyebrow) */
function HeroRed({ children }) {
  return (
    <section
      className="w-full relative"
      style={{ background: `linear-gradient(180deg, ${TOKENS.red} 0%, ${TOKENS.redSoft} 100%)` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[420px] w-[860px] -translate-x-1/2 rounded-full blur-3xl opacity-30"
        style={{
          background: "radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div className="py-24 sm:py-28">{children}</div>
    </section>
  );
}

/* ================== Reusable cards & mocks ================== */
function VerifyCard({ icon, title, desc }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1" style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-[18px] font-bold" style={{ color: TOKENS.text }}>{title}</h3>
      </div>
      <p className="mt-2 text-[15px]" style={{ color: TOKENS.sub }}>{desc}</p>
    </div>
  );
}

function BoardCard({ accent = TOKENS.blue, title, threads = [] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1" style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: accent }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 15v5l4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8z" stroke="currentColor" strokeWidth="2"/>
        </svg>
        {title}
      </div>
      <ul className="mt-3 divide-y" style={{ borderColor: TOKENS.border }}>
        {threads.map((t, i) => (
          <li key={i} className="py-3">
            <p className="text-[15px] font-semibold text-slate-900 line-clamp-1">“{t.title}”</p>
            <p className="mt-1 text-xs text-slate-500">{t.meta}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Phone with darker, strong borders everywhere + reversed tilt (kept from prior tweak) */
function PhoneFrame3D({ children }) {
  return (
    <div style={{ perspective: "1200px" }}>
      <div
        className="relative w-[300px] sm:w-[340px]"
        style={{
          transform: "rotateY(-12deg) rotateX(3deg)",
          transformStyle: "preserve-3d",
          borderRadius: "34px",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          boxShadow: "0 30px 80px rgba(15,23,42,0.25), inset 0 0 0 2px rgba(15,23,42,0.85)",
        }}
      >
        <div
          className="mx-auto my-4 h-[560px] w-[92%] overflow-hidden rounded-[28px] bg-white ring-1"
          style={{ borderColor: "rgba(15,23,42,0.85)", boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.85)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ====== CourseHub chat screen (buyer starts; You = seller) ====== */
function CoursehubChatScreen() {
  return (
    <div className="h-full w-full">
      {/* top bar: course only */}
      <div className="flex h-10 items-center justify-center text-xs font-bold text-red-700 bg-red-50"
           style={{ boxShadow: "inset 0 -1px 0 0 rgba(15,23,42,0.85)" }}>
        DS-UA 201
      </div>

      <div className="space-y-3 p-3">
        <Bubble who="Alex" tone="neutral">Hi! I’m looking for the “Midterm Notes.” Is it still available?</Bubble>
        <Bubble who="You"  tone="me">Yep — I’m selling it. If you want, we can meet so you can look through it first.</Bubble>
        <Bubble who="Alex" tone="neutral">I prefer in-person. Could we meet and I’ll decide after checking the notes?</Bubble>
        <Bubble who="You"  tone="me">Sure. Bobst Library works for me. When are you free?</Bubble>
        <Bubble who="Alex" tone="neutral">Tomorrow 3pm at the main entrance?</Bubble>
        <Bubble who="You"  tone="me">Perfect. See you there. Cash or Venmo both work.</Bubble>
        <Bubble who="Alex" tone="neutral">Great — I’ll see you then!</Bubble>
      </div>
    </div>
  );
}

function Bubble({ who, children, tone = "neutral" }) {
  const common = "max-w-[80%] rounded-2xl px-3 py-2 text-[13px] ring-1";
  const mine   = "self-end bg-red-50 text-red-900 ring-red-800";
  const other  = "self-start bg-slate-50 text-slate-900 ring-slate-800";
  return (
    <div className={`flex ${tone === "me" ? "justify-end" : "justify-start"}`}>
      <div className={`${common} ${tone === "me" ? mine : other}`}>
        <span className="font-bold">{who}: </span>{children}
      </div>
    </div>
  );
}

/* ====== Marketplace “deal” card ====== */
function DealCard({ headline, lines = [], bubbles = [], badges = [] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1" style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center gap-2 text-[15px] font-bold text-green-700">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
          ✓
        </span>
        {headline}
      </div>

      <ul className="mt-2 text-[14px] text-slate-600">
        {lines.map((l, i) => <li key={i} className="leading-relaxed">{l}</li>)}
      </ul>

      <div className="mt-4 space-y-2">
        {bubbles.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1 inline-flex h-5 w-5 shrink-0 select-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
              {b.who[0]}
            </span>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-[14px] text-slate-900 ring-1" style={{ borderColor: TOKENS.border }}>
              <span className="font-bold">{b.who}: </span>{b.text}
            </div>
          </div>
        ))}
      </div>

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((t, i) => (
            <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1"
                  style={{ borderColor: TOKENS.border }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====== Primary button ====== */
function Primary({ children, ...rest }) {
  return (
    <button
      {...rest}
      className="rounded-xl bg-black px-5 py-3 text-white font-semibold hover:bg-black/90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}








