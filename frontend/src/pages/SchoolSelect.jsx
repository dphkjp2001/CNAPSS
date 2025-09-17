// frontend/src/pages/SchoolSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../contexts/SchoolContext";

/* Light theme tokens (match current landing) */
const TOKENS = {
  bg: "#FFFFFF",
  text: "#111111",
  sub: "#6B7280",
  red: "#EF4444",
  border: "rgba(0,0,0,0.1)",
  soft: "rgba(17,17,17,0.05)",
};

/* Enable/disable schools here */
const SCHOOLS = [
  { key: "nyu", short: "NYU", name: "New York University", enabled: true,  domains: ["nyu.edu"] },
  { key: "columbia", short: "Columbia", name: "Columbia University", enabled: false, domains: ["columbia.edu"] },
  { key: "boston", short: "Boston", name: "Boston University", enabled: false, domains: ["bu.edu", "boston.edu"] },
];

export default function SchoolSelect() {
  const nav = useNavigate();
  const { setSchool } = useSchool();

  const [selected, setSelected] = useState("nyu");
  const selectedInfo = useMemo(
    () => SCHOOLS.find((s) => s.key === selected) || SCHOOLS[0],
    [selected]
  );

  // ===== Waitlist form state =====
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const inputRef = useRef(null);

  useEffect(() => {
    // reset message when school switches
    setMsg({ type: "", text: "" });
  }, [selected]);

  // Basic domain check against the selected school
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
      setMsg({
        type: "error",
        text: "Something went wrong. Please try again a bit later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goPreview = () => {
    setSchool?.(selectedInfo.key);
    nav(`/${encodeURIComponent(selectedInfo.key)}/dashboard`);
  };

  return (
    <div className="min-h-screen" style={{ background: TOKENS.bg }}>
      <main className="mx-auto max-w-6xl px-4">
        {/* ===== HERO (clean, no phone preview on top) ===== */}
        <section className="py-12 sm:py-16">
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-black">
            Your campus, <span className="text-red-600">closer</span>
            <br className="hidden sm:block" /> than ever.
          </h1>
          <p className="mt-4 text-lg sm:text-xl leading-relaxed" style={{ color: TOKENS.sub }}>
            CNAPSS is a private community app for your university. Share materials, post on the free
            board, buy & sell on the marketplace, and connect with classmates — all verified by school email.
          </p>

          {/* ===== Waitlist box ===== */}
          <div className="mt-7 rounded-2xl border bg-white p-5" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-black">Join the waitlist</div>
                <p className="mt-1 text-sm" style={{ color: TOKENS.sub }}>
                  Choose your school and enter your school email. We’ll notify you when it’s ready.
                </p>
              </div>
            </div>

            {/* school choices */}
            <div className="mt-3 flex flex-wrap gap-2">
              {SCHOOLS.map((s) => {
                const active = selected === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSelected(s.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
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

            {/* email + join */}
            <form onSubmit={handleJoin} className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={`Enter your ${selectedInfo.short} school email`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border }}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: TOKENS.sub }}>
                  @{selectedInfo.domains[0]}
                </span>
              </div>
              <Primary type="submit" disabled={submitting || !selectedInfo.enabled}>
                {submitting ? "Joining..." : "Join"}
              </Primary>
            </form>

            {/* helper row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: TOKENS.sub }}>
              <button type="button" onClick={goPreview} className="underline underline-offset-2">
                Or explore the web preview
              </button>
              <span className="opacity-60">·</span>
              <span>We only accept verified school emails.</span>
            </div>

            {/* message */}
            {msg.text && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </section>

        {/* ===== What you can do (feature + phone previews) ===== */}
        <section className="pb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-black">What you can do</h2>

          <FeatureRow
            title="CourseHub"
            desc="Find and share materials by course, professor, or semester."
            cta="Browse CourseHub"
            onClick={() => goPreview()} // lightweight path; full experience in app
            phone={<PhoneCoursehub />}
          />

          <FeatureRow
            title="Free Board"
            desc="Ask questions, swap tips, and keep up with your campus."
            cta="Open Free Board"
            onClick={() => goPreview()}
            reverse
            phone={<PhoneFreeboard />}
          />

          <FeatureRow
            title="Marketplace"
            desc="Buy & sell textbooks, furniture, and more — student to student."
            cta="Explore Marketplace"
            onClick={() => goPreview()}
            phone={<PhoneMarket />}
          />

          <p className="mt-8 text-center text-xs" style={{ color: TOKENS.sub }}>
            * Web provides a limited preview. Use the mobile app for the full experience.
          </p>
        </section>
      </main>
    </div>
  );
}

/* ========================= Shared UI Bits ========================= */
function Primary({ children, onClick, type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition
                  ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow"} `}
      style={{ background: TOKENS.red }}
    >
      {children}
    </button>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M7 12h10M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function FeatureRow({ title, desc, cta, onClick, phone, reverse = false }) {
  return (
    <div className={`mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <div className="text-xl font-extrabold text-black">{title}</div>
        <p className="mt-1 text-sm" style={{ color: TOKENS.sub }}>
          {desc}
        </p>
        <button onClick={onClick} className="mt-4 inline-flex items-center gap-1 text-sm font-bold" style={{ color: TOKENS.red }}>
          {cta} <ArrowRight />
        </button>
      </div>
      <div className="justify-self-center">{phone}</div>
    </div>
  );
}

/* ========================= Phone mocks ========================= */
function PhoneFrame({ children }) {
  return (
    <div className="relative w-[280px] sm:w-[320px]">
      <div className="rounded-[36px] border bg-white p-4 shadow-sm" style={{ borderColor: TOKENS.border }}>
        <div className="mx-auto h-[540px] w-full overflow-hidden rounded-[28px] border" style={{ borderColor: TOKENS.border }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PhoneCoursehub() {
  return (
    <PhoneFrame>
      <div className="h-12 w-full bg-red-50 flex items-center justify-center text-red-700 text-xs font-bold">CourseHub</div>
      <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
        {[
          { code: "CS-UY 1114", title: "Intro to CS", sub: "Prof. Smith · Fall 2024", price: "$10" },
          { code: "MATH-UA 120", title: "Calculus II", sub: "Prof. Lee · Spring 2024", price: "Free" },
          { code: "DS-UA 201", title: "Data Structures", sub: "Prof. Chen · Fall 2024", price: "$5" },
        ].map((m, i) => (
          <li key={i} className="p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-black line-clamp-1">
                {m.code} — {m.title}
              </div>
              <div className="text-[11px]" style={{ color: TOKENS.sub }}>{m.sub}</div>
            </div>
            <span className="shrink-0 rounded px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: TOKENS.red }}>
              {m.price}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto h-10 w-full border-t bg-white flex items-center justify-center text-[11px]" style={{ borderColor: TOKENS.border, color: TOKENS.sub }}>
        Preview only · Get the app
      </div>
    </PhoneFrame>
  );
}

function PhoneFreeboard() {
  return (
    <PhoneFrame>
      <div className="h-12 w-full bg-red-50 flex items-center justify-center text-red-700 text-xs font-bold">Free Board</div>
      <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
        {[
          "Best study spots on campus?",
          "Selling Calc textbook",
          "Looking for CS tutor",
          "Where to eat near library?",
        ].map((t, i) => (
          <li key={i} className="p-3">
            <div className="text-[13px] font-semibold text-black line-clamp-1">{t}</div>
            <div className="text-[11px]" style={{ color: TOKENS.sub }}>2h ago · by Student {i + 1}</div>
          </li>
        ))}
      </ul>
      <div className="mt-auto h-10 w-full border-t bg-white flex items-center justify-center text-[11px]" style={{ borderColor: TOKENS.border, color: TOKENS.sub }}>
        Preview only · Get the app
      </div>
    </PhoneFrame>
  );
}

function PhoneMarket() {
  return (
    <PhoneFrame>
      <div className="h-12 w-full bg-red-50 flex items-center justify-center text-red-700 text-xs font-bold">Marketplace</div>
      <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
        {[
          { title: "iPad Air (64GB)", price: "$280", who: "Student A" },
          { title: "Calculus Textbook", price: "$15", who: "Student B" },
          { title: "Dorm Mini Fridge", price: "$60", who: "Student C" },
        ].map((m, i) => (
          <li key={i} className="p-3 flex items-center gap-3">
            <div className="h-12 w-16 rounded bg-neutral-100" />
            <div className="min-w-0 grow">
              <div className="text-[13px] font-semibold text-black line-clamp-1">{m.title}</div>
              <div className="text-[11px]" style={{ color: TOKENS.sub }}>by {m.who}</div>
            </div>
            <span className="shrink-0 text-[12px] font-bold" style={{ color: TOKENS.red }}>{m.price}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto h-10 w-full border-t bg-white flex items-center justify-center text-[11px]" style={{ borderColor: TOKENS.border, color: TOKENS.sub }}>
        Preview only · Get the app
      </div>
    </PhoneFrame>
  );
}







