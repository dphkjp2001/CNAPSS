// frontend/src/components/Layout.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import useNotificationsPolling from "../hooks/useNotificationsPolling";
import { useSchoolPath } from "../utils/schoolPath";

/* ------------ 작은 유틸/토큰 ------------ */
const TOKENS = { pink: "#FF6B8A", red: "#FF7A70" };

function Initials({ name = "GU", bg = "#f1ecff" }) {
  const text = String(name || "GU").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-gray-900"
      style={{ background: bg }}
    >
      {text}
    </div>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm ${
          isActive ? "bg-red-50 text-red-600 font-semibold" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/* ------------ 상단 탭 ------------ */
function Segmented({ value, onChange }) {
  const isGeneral = value === "general";
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [underline, setUnderline] = useState({ w: 0, x: 0 });

  useEffect(() => {
    const measure = () => {
      const l = leftRef.current, r = rightRef.current;
      if (!l || !r) return;
      const el = isGeneral ? l : r;
      setUnderline({ w: el.offsetWidth, x: el.offsetLeft - l.offsetLeft });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (leftRef.current?.parentElement) ro.observe(leftRef.current.parentElement);
    return () => ro.disconnect();
  }, [isGeneral]);

  return (
    <>
      <style>{`
        @keyframes wiggleScale {
          0% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-2px) scale(1.03); }
          50% { transform: translateY(0.5px) scale(1.01); }
          75% { transform: translateY(-1px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="w-full flex justify-center">
        <div className="relative inline-flex items-center gap-8">
          <span
            aria-hidden
            className="absolute -bottom-2 h-[3px] rounded-full transition-transform duration-300 ease-out"
            style={{
              width: underline.w || 0,
              transform: `translateX(${underline.x || 0}px)`,
              background: `linear-gradient(90deg, ${TOKENS.pink}, ${TOKENS.red})`,
            }}
          />
          <button
            ref={leftRef}
            type="button"
            onClick={() => onChange("general")}
            className={`text-[22px] font-bold flex items-center gap-2 transition-all ${
              isGeneral ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            } ${isGeneral ? "animate-[wiggleScale_360ms_ease-in-out]" : ""}`}
            aria-pressed={isGeneral}
          >
            <span aria-hidden>💬</span>
            <span>General</span>
          </button>
          <button
            ref={rightRef}
            type="button"
            onClick={() => onChange("academic")}
            className={`text-[22px] font-bold flex items-center gap-2 transition-all ${
              !isGeneral
                ? "text-slate-900 animate-[wiggleScale_360ms_ease-in-out]"
                : "text-slate-400 hover:text-slate-600"
            }`}
            aria-pressed={!isGeneral}
          >
            <span aria-hidden>🎓</span>
            <span>Academic</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------ 검색바들 (Expanded) ------------ */
function FreeSearchBar({ value, onSubmit, onReset, compact }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const handle = (e) => { e.preventDefault(); onSubmit(local); };
  return (
    <form
      onSubmit={handle}
      className={`mx-auto ${compact ? "mt-1" : "mt-4"} w-full max-w-[860px] rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.06)] bg-white border border-slate-200 overflow-hidden`}
    >
      <div className="grid grid-cols-[1fr_auto] items-stretch">
        <div className="px-5 py-3">
          <div className="text-[11px] font-semibold text-slate-500">Keyword</div>
          <input
            value={local.q || ""}
            onChange={(e) => setLocal({ q: e.target.value })}
            placeholder="Search posts…"
            className="w-full bg-transparent text-[14px] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 px-3">
          <button type="button" onClick={() => onReset()} className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100">
            Reset
          </button>
          <button type="submit" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold">
            Search
          </button>
        </div>
      </div>
    </form>
  );
}

function AcademicSearchBar({ value, onSubmit, onReset, compact }) {
  const [local, setLocal] = useState(value);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("type"); // "type" | "kind"
  const anchorRef = useRef(null);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, bottom: 0 });

  useEffect(() => setLocal(value), [value]);

  const measure = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, bottom: r.bottom });
  };

  useEffect(() => {
    measure();
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (e.target.closest?.("[data-acad-popover]")) return;
      setOpen(false); setStep("type");
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const set = (patch) => setLocal((v) => ({ ...v, ...patch }));
  const TYPE_ROWS = [
    { key: "question", title: "General question", desc: "Ask about courses, careers, visa, housing…", icon: "❓" },
    { key: "seeking",  title: "Seeking",            desc: "Find materials, study mates, or coffee chats", icon: "📄" },
  ];
  const KIND_ROWS = [
    { key: "course_materials", title: "Course Materials", desc: "Syllabus, notes, exams…", emoji: "📝" },
    { key: "study_mate",       title: "Study Mate",       desc: "Find peers to study together", emoji: "👥" },
    { key: "coffee_chat",      title: "Coffee Chat",      desc: "Casual chat / mentoring", emoji: "☕️" },
  ];

  const Panel = () => {
    const maxW = 520, minW = 300, pad = 16;
    const width = Math.min(maxW, Math.max(minW, rect.width - pad * 2, 0), window.innerWidth - 32);
    const left = Math.round(rect.left + (rect.width - width) / 2);
    const top  = Math.round(rect.bottom + 8);
    return (
      <div data-acad-popover className="z-50 fixed" style={{ left, top, width }}>
        <div className="rounded-[24px] bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto p-3">
            <div className="px-1 pb-2 text-[11.5px] font-semibold text-slate-500">
              {step === "type" ? "Type" : "Seeking · choose kind"}
            </div>

            {step === "type" && (
              <div className="space-y-2">
                {TYPE_ROWS.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      if (row.key === "question") {
                        const next = { ...local, type: "question", kind: "" };
                        setLocal(next); onSubmit(next); setOpen(false); setStep("type"); return;
                      }
                      setStep("kind");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition text-left
                      ${ (local.type || "question") === row.key
                        ? "bg-slate-50 border border-slate-300 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
                        : "hover:bg-slate-50 border border-transparent" }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-base">{row.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[14.5px] text-slate-900 truncate">{row.title}</div>
                      <div className="text-[12.5px] text-slate-500 truncate">{row.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === "kind" && (
              <div className="space-y-2">
                {KIND_ROWS.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      const next = { ...local, type: "seeking", kind: row.key };
                      setLocal(next); onSubmit(next); setOpen(false); setStep("type");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition text-left
                      ${
                        local.type === "seeking" && local.kind === row.key
                          ? "bg-slate-50 border border-slate-300 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-base">{row.emoji}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[14.5px] text-slate-900 truncate">{row.title}</div>
                      <div className="text-[12.5px] text-slate-500 truncate">{row.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(local); setOpen(false); setStep("type"); };

  return (
    <div className={`mx-auto ${compact ? "mt-1" : "mt-4"} w-full max-w-[960px]`} ref={anchorRef}>
      <form
        onSubmit={handleSubmit}
        className="rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.06)] bg-white border border-slate-200 overflow-hidden"
      >
        <div className="grid grid-cols-[1.2fr_0.9fr_auto] items-stretch">
          <div className="px-5 py-3 border-r">
            <div className="text-[11px] font-semibold text-slate-500">Keyword</div>
            <input
              value={local.q || ""}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search academic posts…"
              className="w-full bg-transparent text-[14px] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => { measure(); setOpen(true); setStep("type"); }}
            className="px-5 text-left py-3 border-r hover:bg-slate-50"
          >
            <div className="text-[11px] font-semibold text-slate-500">Type</div>
            <div className="text-[14px]">
              {local.type === "seeking" ? "Seeking" : "General Question"}
            </div>
          </button>
          <div className="flex items-center gap-2 px-3">
            <button
              type="button"
              onClick={() => { onReset?.(); }}
              className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100"
            >
              Reset
            </button>
            <button type="submit" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold">
              Search
            </button>
          </div>
        </div>
      </form>
      {open && <Panel />}
    </div>
  );
}

/* --------- General: 컴팩트 pill --------- */
function CollapsedGeneral({ value, onSubmit, onReset, onOpenExpanded, right }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const submit = (e) => { e.preventDefault(); onSubmit(local); };

  return (
    <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-3">
      <form
        onSubmit={submit}
        className="flex-1 max-w-[720px] rounded-full border border-slate-300 bg-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        <div className="flex items-center">
          <div
            className="flex items-center gap-2 pl-4 pr-3 py-2.5 flex-1"
            onClick={onOpenExpanded}
            title="Open expanded search"
          >
            <span className="text-base">💬</span>
            <input
              value={local.q || ""}
              onChange={(e) => setLocal({ q: e.target.value })}
              placeholder="Search…"
              className="w-full bg-transparent text-[14px] focus:outline-none placeholder:text-slate-400/80"
            />
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2 pl-3 pr-3">
            <button
              type="button"
              onClick={() => onReset?.()}
              className="px-2 py-1.5 rounded-full text-[13px] text-slate-700 hover:bg-slate-100"
              title="Reset"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-full bg-black text-white text-[13px] font-semibold"
              title="Search"
            >
              Search
            </button>
          </div>
        </div>
      </form>
      <div className="shrink-0 flex items-center gap-2">{right}</div>
    </div>
  );
}

function CompactAcademicBar({ value, onSubmit, onReset, onOpenExpanded, right }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("type");
  const anchorRef = useRef(null);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, bottom: 0 });

  const measure = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, bottom: r.bottom });
  };
  useEffect(() => {
    measure();
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (e.target.closest?.("[data-acad-popover]")) return;
      setOpen(false); setStep("type");
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const submit = (e) => { e.preventDefault(); onSubmit(local); };

  const Panel = () => {
    const maxW = 420, minW = 280, pad = 16;
    const width = Math.min(maxW, Math.max(minW, rect.width - pad * 2, 0), window.innerWidth - 32);
    const left = Math.round(rect.left + (rect.width - width) / 2);
    const top  = Math.round(rect.bottom + 6);
    const TYPE_ROWS = [
      { key: "question", title: "General question", icon: "❓" },
      { key: "seeking",  title: "Seeking", icon: "📄" },
    ];
    const KIND_ROWS = [
      { key: "course_materials", title: "Course Materials", emoji: "📝" },
      { key: "study_mate",       title: "Study Mate",       emoji: "👥" },
      { key: "coffee_chat",      title: "Coffee Chat",      emoji: "☕️" },
    ];
    return (
      <div data-acad-popover className="z-50 fixed" style={{ left, top, width }}>
        <div className="rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto p-2">
            {step === "type" ? (
              <div className="space-y-1">
                {TYPE_ROWS.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      if (row.key === "question") {
                        const next = { ...local, type: "question", kind: "" };
                        setLocal(next); onSubmit(next); setOpen(false); setStep("type"); return;
                      }
                      setStep("kind");
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left
                      ${ (local.type || "question") === row.key
                        ? "bg-slate-50 border border-slate-300"
                        : "hover:bg-slate-50 border border-transparent" }`}
                  >
                    <span className="text-sm">{row.icon}</span>
                    <span className="text-[13px]">{row.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {KIND_ROWS.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      const next = { ...local, type: "seeking", kind: row.key };
                      setLocal(next); onSubmit(next); setOpen(false); setStep("type");
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left
                      ${ local.type === "seeking" && local.kind === row.key
                        ? "bg-slate-50 border border-slate-300"
                        : "hover:bg-slate-50 border border-transparent" }`}
                  >
                    <span className="text-sm">{row.emoji}</span>
                    <span className="text-[13px]">{row.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-3">
      <form
        ref={anchorRef}
        onSubmit={submit}
        className="flex-1 max-w-[720px] rounded-full border border-slate-300 bg-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        <div className="flex items-center">
          <div
            className="flex items-center gap-2 pl-4 pr-3 py-2.5 flex-1"
            onClick={onOpenExpanded}
            title="Open expanded search"
          >
            <span className="text-base">🎓</span>
            <input
              value={local.q || ""}
              onChange={(e) => setLocal({ ...local, q: e.target.value })}
              placeholder="Search…"
              className="w-full bg-transparent text-[14px] focus:outline-none placeholder:text-slate-400/80"
            />
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => { measure(); setOpen(true); setStep("type"); }}
            className="px-3 py-2.5 text-[13px] text-slate-700 min-w-[150px] text-center hover:bg-slate-50"
            title="Choose type"
          >
            {local.type === "seeking" ? "Seeking" : "General Question"}
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2 pl-3 pr-3">
            <button
              type="button"
              onClick={() => { onReset?.(); }}
              className="px-2 py-1.5 rounded-full text-[13px] text-slate-700 hover:bg-slate-100"
              title="Reset"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-full bg-black text-white text-[13px] font-semibold"
              title="Search"
            >
              Search
            </button>
          </div>
        </div>
      </form>
      <div className="shrink-0 flex items-center gap-2">{right}</div>
      {/* 간단 팝오버 */}
      {open && <Panel />}
    </div>
  );
}

/* ------------------------ 메인 Layout ------------------------ */
export default function Layout() {
  const { user, logout } = useAuth();
  const { school } = useSchool();
  const navigate = useNavigate();
  const location = useLocation();
  const schoolPath = useSchoolPath();

  const { items, count } = useNotificationsPolling(user?.email, 5000, 60000, 5);

  const [showNoti, setShowNoti] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const onLogout = async () => { await logout(); navigate("/login"); };
  const nickname = user?.nickname || (user?.email ? user.email.split("@")[0] : "GU");

  /* ----- 탭/검색 상태 (URL 동기화) ----- */
  const params = new URLSearchParams(location.search);
  const [active, setActive] = useState(params.get("tab") === "free" ? "general" : "academic");
  const [freeQuery, setFreeQuery] = useState({ q: params.get("q") || "" });
  const [acadQuery, setAcadQuery] = useState({
    q: params.get("q") || "",
    type: params.get("type") || "all",
    kind: params.get("kind") || "",
  });

  // ✅ 현재 경로가 dashboard인지 판별
  const isDashboard = /\/dashboard(?:\/)?$/.test(location.pathname);

  // 쿼리스트링 생성 공통 함수
  const buildSearchParams = (next = {}) => {
    const p = new URLSearchParams(location.search);
    const tab = next.active ?? active;
    p.set("tab", tab === "general" ? "free" : "academic");
    if (tab === "general") {
      const q = next.freeQuery?.q ?? freeQuery.q;
      if (q) p.set("q", q); else p.delete("q");
      p.delete("type"); p.delete("kind");
    } else {
      const q  = next.acadQuery?.q   ?? acadQuery.q;
      const tp = next.acadQuery?.type ?? acadQuery.type;
      const kd = next.acadQuery?.kind ?? acadQuery.kind;
      if (q) p.set("q", q); else p.delete("q");
      if (tp) p.set("type", tp); else p.delete("type");
      if (tp === "seeking" && kd) p.set("kind", kd); else p.delete("kind");
    }
    return p;
  };

  // 기존 syncUrl 유지 + 필요시 대시보드로 라우팅
  const syncUrl = (next = {}, { forceToDashboard = false } = {}) => {
    const p = buildSearchParams(next);
    const targetPath = forceToDashboard || !isDashboard ? schoolPath("/dashboard") : location.pathname;
    navigate(`${targetPath}?${p.toString()}`, { replace: true });
  };

  const onTabChange = (v) => { setActive(v); syncUrl({ active: v }); };

  /* ----- 스크롤 시 컴팩트 전환 ----- */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ 대시보드가 아니면 항상 컴팩트 모드 강제
  const isCompact = !isDashboard || scrolled;

  /* ----- 확장 모달 (컴팩트에서만) ----- */
  const [openSearch, setOpenSearch] = useState(false);

  /* ----- 🔔 + 프로필 공통 뷰 ----- */
  const RightUserArea = (
    <>
      <button
        type="button"
        onClick={() => { setShowNoti((v) => !v); setShowProfile(false); }}
        className="relative ml-1 px-3 py-2 text-base rounded-md hover:bg-violet-50"
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="text-xl leading-none">🔔</span>
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] text-white"
            style={{ backgroundColor: "#7c3aed" }}
          >
            {count}
          </span>
        )}
      </button>

      {user?.email ? (
        <ProfileMenu
          nickname={nickname}
          email={user.email}
          onLogout={onLogout}
          schoolPath={schoolPath}
          showProfile={showProfile}
          setShowProfile={setShowProfile}
        />
      ) : (
        <>
          <Link to="/login" className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md">
            Log in
          </Link>
          <Link to="/register" className="px-3 py-2 text-sm text-gray-700 hover:text-violet-700 hover:bg-violet-50 rounded-md">
            Register
          </Link>
        </>
      )}
    </>
  );

  /* ---------- 렌더 ---------- */
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-white">
        <div className="p-6 border-b flex flex-col items-start">
          <Link
            to={school ? schoolPath("/dashboard") : "/"}
            className="font-extrabold text-[30px] tracking-wide text-[#E54848] hover:opacity-90 transition-opacity"
          >
            CNAPSS
          </Link>
          {school && <div className="mt-1 text-xs text-gray-500 truncate">{String(school)}</div>}
        </div>
        <nav className="p-3 space-y-1">
          <NavItem to={schoolPath("/dashboard")}>Dashboard</NavItem>
          <NavItem to={schoolPath("/messages")}>Messages</NavItem>
        </nav>
        <div className="mt-auto p-3 text-[11px] text-gray-400">Stay anonymous. Be kind.</div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 헤더: compact일 땐 숨김(General/Academic 모두) */}
        {!isCompact && (
          <header className="w-full bg-white border-none shadow-none mt-2 md:mt-3 lg:mt-3">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-end gap-3">
              {RightUserArea}
            </div>
          </header>
        )}

        {/* 전역 스티키 바 */}
        <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur transition-all">
          <div className={`${isCompact ? "py-1.5" : "py-3"} transition-all`}>
            {isCompact ? (
              // ✅ 컴팩트 모드: 대시보드 외 페이지에서도 항상 표시
              active === "general" ? (
                <CollapsedGeneral
                  value={freeQuery}
                  onSubmit={(v) => {
                    setFreeQuery(v);
                    // ✅ 대시보드가 아니면 대시보드로 이동 + 쿼리반영
                    syncUrl({ active, freeQuery: v }, { forceToDashboard: !isDashboard });
                  }}
                  onReset={() => {
                    const v = { q: "" };
                    setFreeQuery(v);
                    syncUrl({ active, freeQuery: v }, { forceToDashboard: !isDashboard });
                  }}
                  // ✅ 대시보드 아닐 땐 확장 모달 열지 않음(compact only 정책)
                  onOpenExpanded={() => { if (isDashboard) setOpenSearch(true); }}
                  right={RightUserArea}
                />
              ) : (
                <CompactAcademicBar
                  value={acadQuery}
                  onSubmit={(v) => {
                    setAcadQuery(v);
                    syncUrl({ active, acadQuery: v }, { forceToDashboard: !isDashboard });
                  }}
                  onReset={() => {
                    const v = { q: "", type: "all", kind: "" };
                    setAcadQuery(v);
                    syncUrl({ active, acadQuery: v }, { forceToDashboard: !isDashboard });
                  }}
                  onOpenExpanded={() => { if (isDashboard) setOpenSearch(true); }}
                  right={RightUserArea}
                />
              )
            ) : (
              // (확장형은 오직 Dashboard에서만 보임)
              <div className="mx-auto max-w-6xl px-4 flex flex-col gap-2">
                <Segmented value={active} onChange={onTabChange} />
                {active === "general" ? (
                  <FreeSearchBar
                    value={freeQuery}
                    onSubmit={(v) => { setFreeQuery(v); syncUrl({ active, freeQuery: v }); }}
                    onReset={() => { const v = { q: "" }; setFreeQuery(v); syncUrl({ active, freeQuery: v }); }}
                    compact={false}
                  />
                ) : (
                  <div className="sticky top-[0px]">
                    <AcademicSearchBar
                      value={acadQuery}
                      onSubmit={(v) => { setAcadQuery(v); syncUrl({ active, acadQuery: v }); }}
                      onReset={() => {
                        const v = { q: "", type: "all", kind: "" };
                        setAcadQuery(v);
                        syncUrl({ active, acadQuery: v });
                      }}
                      compact={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 확장 모달 (Dashboard에서만 사용) */}
        {openSearch && isDashboard && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex items-start justify-center pt-10 md:pt-14"
            onClick={() => setOpenSearch(false)}
          >
            <div className="w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex-1 flex justify-center">
                  <Segmented value={active} onChange={onTabChange} />
                </div>
                <div className="hidden md:flex items-center gap-2">{RightUserArea}</div>
              </div>

              {active === "general" ? (
                <FreeSearchBar
                  value={freeQuery}
                  onSubmit={(v) => { setFreeQuery(v); syncUrl({ active, freeQuery: v }); setOpenSearch(false); }}
                  onReset={() => { const v = { q: "" }; setFreeQuery(v); syncUrl({ active, freeQuery: v }); setOpenSearch(false); }}
                  compact={false}
                />
              ) : (
                <AcademicSearchBar
                  value={acadQuery}
                  onSubmit={(v) => { setAcadQuery(v); syncUrl({ active, acadQuery: v }); setOpenSearch(false); }}
                  onReset={() => {
                    const v = { q: "", type: "all", kind: "" };
                    setAcadQuery(v);
                    syncUrl({ active, acadQuery: v });
                    setOpenSearch(false);
                  }}
                  compact={false}
                />
              )}
            </div>
          </div>
        )}

        {/* Pages */}
        <main className="flex-1 pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProfileMenu({ nickname, email, onLogout, schoolPath, showProfile, setShowProfile }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowProfile((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-violet-50"
      >
        <Initials name={nickname} />
        <span className="hidden sm:inline text-[15px] font-medium text-gray-700">{nickname}</span>
        <svg className={`h-4 w-4 text-gray-500 transition ${showProfile ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {showProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow-lg">
            <div className="px-3 py-2 border-b">
              <div className="text-sm font-semibold">{nickname}</div>
              <div className="text-xs text-gray-500 truncate">{email}</div>
            </div>
            <div className="p-1 text-sm">
              <MenuItem to={schoolPath("/dashboard")} onClick={() => setShowProfile(false)}>Dashboard</MenuItem>
              <MenuItem to={schoolPath("/myposts")} onClick={() => setShowProfile(false)}>My Posts</MenuItem>
              <MenuItem to={schoolPath("/liked")} onClick={() => setShowProfile(false)}>Liked</MenuItem>
              <MenuItem to={schoolPath("/commented")} onClick={() => setShowProfile(false)}>Commented</MenuItem>
              <MenuItem to={schoolPath("/messages")} onClick={() => setShowProfile(false)}>Messages</MenuItem>
              <MenuItem to={schoolPath("/market")} onClick={() => setShowProfile(false)}>Marketplace</MenuItem>
            </div>
            <div className="border-t p-1">
              <button onClick={onLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ to, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2 hover:bg-violet-50 text-gray-700">
      {children}
    </Link>
  );
}

