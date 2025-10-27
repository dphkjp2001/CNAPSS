
// frontend/src/pages/dashboard/Dashboard.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";

import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

import { createPost, getPublicPosts } from "../../api/posts";
import {
  createAcademicPost,
  getPublicAcademicPosts,
} from "../../api/academicPosts";

// ✅ 아이콘 (outline)
import { Bookmark, Repeat2, Share, Send, MessageSquare } from "lucide-react";

/* ===== Design tokens ===== */
const TOKENS = {
  pageBg: "#FAFAFA",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#111827",
  pink: "#FF6B8A",
  red: "#FF7A70",
};

/* ===== Course-materials options (composer 전용) ===== */
const MATERIAL_OPTIONS = [
  { key: "lecture_notes", label: "Lecture Notes" },
  { key: "syllabus", label: "Syllabus" },
  { key: "past_exams", label: "Past Exams" },
  { key: "quiz_prep", label: "Quiz Prep" },
];

/* ===== utils (type/kind normalization) ===== */
const toSlug = (v = "") =>
  String(v).toLowerCase().trim().replace(/[\s_-]+/g, "_");
const toFlat = (v = "") => String(v).toLowerCase().replace(/[\s_\-]/g, "");
const normalizeType = (raw = {}) => {
  const t =
    raw.postType ||
    raw.type ||
    raw.mode ||
    (raw.lookingFor ? "seeking" : "question") ||
    "";
  const k = String(t).toLowerCase();
  if (k === "looking_for" || k === "seeking" || k === "lf") return "seeking";
  return "question";
};
const normalizeKind = (raw = {}) => {
  const explicit = toSlug(raw.kind || "");
  if (explicit) return explicit;
  const bag = [
    raw.kind,
    ...(Array.isArray(raw.tags) ? raw.tags : []),
    raw.title,
    raw.content,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /(course\s*materials?|syllabus|notes?|exam|midterm|final|assignment|hw|homework)/.test(
      bag
    )
  )
    return "course_materials";
  if (/(study\s*(mate|group)|\bstudy\b|team\s*up)/.test(bag)) return "study_mate";
  if (/(coffee\s*chat|coffee\s*time|\bchat\b)/.test(bag)) return "coffee_chat";
  return "";
};

/* ===== 상대 시간 포맷 ===== */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hs ago`; // 요청: hs 표기

  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

/* ===== UI bits ===== */
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#cbd5e1" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#cbd5e1" />
    </svg>
  );
}
function CardBox({ children }) {
  return (
    <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
      {children}
    </div>
  );
}
function Segmented({ value, onChange }) {
  const isGeneral = value === "general";
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [underline, setUnderline] = useState({ w: 0, x: 0 });
  const measure = () => {
    const l = leftRef.current,
      r = rightRef.current;
    if (!l || !r) return;
    const el = isGeneral ? l : r;
    setUnderline({ w: el.offsetWidth, x: el.offsetLeft - l.offsetLeft });
  };
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (leftRef.current?.parentElement)
      ro.observe(leftRef.current.parentElement);
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

// ⬇️ PostRow
function PostRow({
  post,
  onOpenDetail,
  showBadge,
  showActionsBar = false,
  commentCount = 0,
}) {
  const raw = post.raw || {};
  const t = normalizeType(raw);
  const k = normalizeKind(raw);

  const badge =
    t === "seeking"
      ? k === "course_materials"
        ? "📝"
        : k === "study_mate"
        ? "👥"
        : k === "coffee_chat"
        ? "☕️"
        : "📌"
      : "";

  const MATERIAL_LABELS = {
    lecture_notes: "Lecture Notes",
    syllabus: "Syllabus",
    past_exams: "Past Exams",
    quiz_prep: "Quiz Prep",
  };
  const materials =
    Array.isArray(raw.materials) && k === "course_materials" ? raw.materials : [];
  const materialLabels = materials.map((m) => MATERIAL_LABELS[m] || m);

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full text-left py-4 px-3 hover:bg-slate-50 transition"
    >
      <div className="flex items-start gap-3">
        {showBadge ? (
          <span className="text-[18px] w-6 text-center mt-[2px]">{badge}</span>
        ) : (
          <span className="w-6" />
        )}

        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center mt-[2px]">
          <PersonIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="truncate font-semibold text-slate-900">{post.title}</div>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              {formatRelativeTime(post.createdAt)}
            </div>
          </div>

          {/* ✨ 글 미리보기 한 줄 추가 */}
          {post.raw?.content && (
            <p className="mt-1 text-[13.5px] text-slate-600 line-clamp-1">
              {post.raw.content}
            </p>
          )}

          {materialLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {materialLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-50 px-2.5 py-[3px] text-[11px] text-slate-700"
                >
                  {lbl}
                </span>
              ))}
            </div>
          )}


          {/* 하단 액션바 (필요할 때만 표시) */}
          {showActionsBar && (
            <div className="flex items-center justify-between mt-2 pr-1 pl-[0px] text-slate-500 text-[13px]">
              <div className="flex items-center gap-6">
                <Bookmark size={18} className="hover:text-slate-800 cursor-pointer" />
                <Repeat2 size={18} className="hover:text-slate-800 cursor-pointer" />
                <Share size={18} className="hover:text-slate-800 cursor-pointer" />
                <div className="flex items-center gap-1">
                  <Send size={17} className="hover:text-slate-800 cursor-pointer" />
                  <span className="text-xs font-medium">DM</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <MessageSquare size={17} className="hover:text-slate-800 cursor-pointer" />
                <span>{commentCount ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ===== generic list helpers ===== */
const pluckArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items))
    return payload.data.items;
  return [];
};
const normalizePosts = (res) =>
  pluckArray(res).map((p) => ({
    _id: p._id || p.id,
    title:
      p.title ||
      (typeof p.content === "string" ? p.content.slice(0, 80) : "Untitled"),
    createdAt: p.createdAt || p.updatedAt || new Date().toISOString(),
    raw: p,
  }));

/* ===== Search bars ===== */
function FreeSearchBar({ value, onSubmit, onReset }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const handle = (e) => {
    e.preventDefault();
    onSubmit(local);
  };
  return (
    <form
      onSubmit={handle}
      className="mx-auto mt-5 w-full max-w-[700px] rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.06)] bg-white border border-slate-200 overflow-hidden"
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
          <button
            type="button"
            onClick={() => onReset()}
            className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}

function AcademicSearchBar({ value, onSubmit, onReset }) {
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

  useLayoutEffect(() => {
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
      setOpen(false);
      setStep("type");
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
    {
      key: "question",
      title: "General question",
      desc: "Ask about courses, careers, visa, housing…",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" className="text-slate-700">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".08" />
          <path
            d="M9.5 9.5a2.5 2.5 0 1 1 3.9 2l-.8.5a1.6 1.6 0 0 0-.6 1.2v.3"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "seeking",
      title: "Seeking",
      desc: "Find materials, study mates, or coffee chats",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" className="text-slate-700">
          <rect x="4" y="5" width="16" height="12" rx="2" fill="currentColor" opacity=".08" />
          <path
            d="M5.5 8h13M7 12h10M9 16h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const KIND_ROWS = [
    { key: "course_materials", title: "Course Materials", desc: "Syllabus, notes, exams…", emoji: "📝" },
    { key: "study_mate", title: "Study Mate", desc: "Find peers to study together", emoji: "👥" },
    { key: "coffee_chat", title: "Coffee Chat", desc: "Casual chat / mentoring", emoji: "☕️" },
  ];

  const Row = ({ leading, title, desc, selected, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition text-left
        ${
          selected
            ? "bg-slate-50 border border-slate-300 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
            : "hover:bg-slate-50 border border-transparent"
        }`}
    >
      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
        {leading}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-[14.5px] text-slate-900 truncate">{title}</div>
        <div className="text-[12.5px] text-slate-500 truncate">{desc}</div>
      </div>
    </button>
  );

  const Panel = () => {
    const maxW = 520;
    const minW = 300;
    const pad = 16;
    const width = Math.min(
      maxW,
      Math.max(minW, rect.width - pad * 2, 0),
      window.innerWidth - 32
    );
    const left = Math.round(rect.left + (rect.width - width) / 2);
    const top = Math.round(rect.bottom + 8);

    return createPortal(
      <div data-acad-popover className="z-50 fixed" style={{ left, top, width }}>
        <div className="rounded-[24px] bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto p-3">
            <div className="px-1 pb-2 text-[11.5px] font-semibold text-slate-500">
              {step === "type" ? "Type" : "Seeking · choose kind"}
            </div>

            {step === "type" && (
              <div className="space-y-2">
                {TYPE_ROWS.map((row) => (
                  <Row
                    key={row.key}
                    leading={row.icon}
                    title={row.title}
                    desc={row.desc}
                    selected={(local.type || "question") === row.key}
                    onClick={() => {
                      if (row.key === "question") {
                        const next = { ...local, type: "question", kind: "" };
                        setLocal(next);
                        onSubmit(next);
                        setOpen(false);
                        setStep("type");
                        return;
                      }
                      setStep("kind");
                    }}
                  />
                ))}
              </div>
            )}

            {step === "kind" && (
              <div className="space-y-2">
                {KIND_ROWS.map((row) => (
                  <Row
                    key={row.key}
                    leading={<span className="text-base">{row.emoji}</span>}
                    title={row.title}
                    desc={row.desc}
                    selected={local.type === "seeking" && local.kind === row.key}
                    onClick={() => {
                      const next = { ...local, type: "seeking", kind: row.key };
                      setLocal(next);
                      onSubmit(next);
                      setOpen(false);
                      setStep("type");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(local);
    setOpen(false);
    setStep("type");
  };

  return (
    <div className="mx-auto mt-5 w-full max-w-[860px]" ref={anchorRef}>
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
            onClick={() => {
              measure();
              setOpen(true);
              setStep("type");
            }}
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
              onClick={() => {
                const next = { q: "", type: "question", kind: "" };
                setLocal(next);
                onReset?.();
              }}
              className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold"
            >
              Search
            </button>
          </div>
        </div>
      </form>
      {open && <Panel />}
    </div>
  );
}

/* ===== Composer header ===== */
function ComposerHeader({ title, setTitle, active, mode, lookingKind }) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-slate-200">
      <div className="shrink-0 h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <circle cx="12" cy="8" r="4" fill="#cbd5e1" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#cbd5e1" />
        </svg>
      </div>
      <div className="flex-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            active === "general"
              ? "Write a catchy title for your post…"
              : mode === "question"
              ? "Ask an academic/career question…"
              : lookingKind === "course_materials"
              ? "Course name (e.g., STAT101)"
              : "Seeking… (short title)"
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
        />
        <p className="mt-1 text-xs text-slate-500">
          Posting as <span className="font-medium">anonymous</span>
        </p>
      </div>
    </div>
  );
}

/* ===== Main ===== */
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useSchool();
  const { user } = useAuth();
  const schoolPath = useSchoolPath();

  const schoolKey = school || "nyu";
  const isAuthed = !!user;

  /* ---------- tabs ---------- */
  const [active, setActive] = useState("academic");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const tab = (p.get("tab") || "").toLowerCase();
    if (tab === "free") setActive("general");
    else if (tab === "academic") setActive("academic");
  }, [location.search]);

  /* ---------- FREEBOARD ---------- */
  const [generalRaw, setGeneralRaw] = useState({
    loading: true,
    items: [],
    error: "",
  });
  const [freeQuery, setFreeQuery] = useState({ q: "" });
  const [freeVisible, setFreeVisible] = useState(12);

  const filteredGeneral = useMemo(() => {
    const { q } = freeQuery;
    let list = generalRaw.items;
    if (q) {
      const key = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(key) ||
          (p.raw?.content || "").toLowerCase().includes(key)
      );
    }
    return list;
  }, [generalRaw.items, freeQuery]);

  const general = {
    loading: generalRaw.loading,
    error: generalRaw.error,
    items: filteredGeneral.slice(0, freeVisible),
    hasMore: filteredGeneral.length > freeVisible,
  };

  /* ---------- ACADEMIC ---------- */
  const [acadQuery, setAcadQuery] = useState({ q: "", type: "all", kind: "" });
  const [acad, setAcad] = useState({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    loading: true,
    loadingMore: false,
    hasMore: true,
    error: "",
  });

  const fetchAcademicPage = useCallback(
    async (page = 1, append = false) => {
      const q = acadQuery.q || "";
      const type = acadQuery.type === "all" ? "" : acadQuery.type;
      const kind = acadQuery.type === "seeking" ? acadQuery.kind : "";
      const res = await getPublicAcademicPosts({
        school: schoolKey,
        page,
        limit: acad.limit,
        q,
        sort: "new",
        type,
        kind,
      });
      const items = normalizePosts(res);
      const total =
        typeof res?.total === "number"
          ? res.total
          : typeof res?.paging?.total === "number"
          ? res.paging.total
          : append
          ? acad.total
          : items.length;
      const limit =
        typeof res?.limit === "number"
          ? res.limit
          : typeof res?.paging?.limit === "number"
          ? res.paging.limit
          : acad.limit;
      const merged = append ? [...acad.items, ...items] : items;
      setAcad({
        items: merged,
        page,
        limit,
        total,
        loading: false,
        loadingMore: false,
        hasMore: merged.length < total && items.length > 0,
        error: "",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schoolKey, acadQuery, acad.items, acad.limit, acad.total]
  );

  /* ---------- initial fetches ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const genRaw = await getPublicPosts({
          school: schoolKey,
          limit: 200,
          sort: "new",
        });
        if (!alive) return;
        setGeneralRaw({
          loading: false,
          items: normalizePosts(genRaw),
          error: "",
        });
      } catch (err) {
        if (!alive) return;
        setGeneralRaw({
          loading: false,
          items: [],
          error: err?.message || "Failed to load posts.",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [schoolKey]);

  useEffect(() => {
    setAcad((s) => ({ ...s, loading: true, error: "", page: 1 }));
    fetchAcademicPage(1, false).catch((err) =>
      setAcad((s) => ({
        ...s,
        loading: false,
        error: err?.message || "Failed to load posts.",
      }))
    );
  }, [schoolKey, acadQuery.q, acadQuery.type, acadQuery.kind]);

  /* ---------- intersection observers ---------- */
  const freeSentinelRef = useRef(null);
  const acadSentinelRef = useRef(null);

  useEffect(() => {
    if (!freeSentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) setFreeVisible((n) => n + 10);
      },
      { rootMargin: "400px 0px 400px 0px" }
    );
    io.observe(freeSentinelRef.current);
    return () => io.disconnect();
  }, [filteredGeneral.length]);

  useEffect(() => {
    if (!acadSentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && acad.hasMore && !acad.loading && !acad.loadingMore) {
          setAcad((s) => ({ ...s, loadingMore: true }));
          fetchAcademicPage(acad.page + 1, true).catch((err) =>
            setAcad((s) => ({
              ...s,
              loadingMore: false,
              error: err?.message || "Failed to load more.",
            }))
          );
        }
      },
      { rootMargin: "600px 0px 600px 0px" }
    );
    io.observe(acadSentinelRef.current);
    return () => io.disconnect();
  }, [acad.hasMore, acad.loading, acad.loadingMore, acad.page, fetchAcademicPage]);

  /* ---------- navigation helpers ---------- */
  const goDetail = (post, tab) => {
    const id = post.raw?._id || post._id || post.raw?.id || post.id;
    if (!id) return;
    const to = tab === "general" ? `/freeboard/${id}` : `/academic/${id}`;
    navigate(schoolPath(to));
  };

  /* ---------- composer states ---------- */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);

  const [mode, setMode] = useState("question"); // 'question' | 'seeking'
  const [lookingKind, setLookingKind] = useState("course_materials");

  // ✅ course materials 전용 상태
  const [professor, setProfessor] = useState("");
  const [materials, setMaterials] = useState([]); // array of keys
  const toggleMaterial = (k) =>
    setMaterials((arr) => (arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]));

  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const canPostGeneral =
    isAuthed && title.trim() && (content.trim() || images.length);
  const canPostAcademic =
    isAuthed &&
    (mode === "question"
      ? title.trim() && content.trim()
      : lookingKind === "course_materials"
      ? title.trim() && materials.length > 0
      : title.trim());

  const uploadFiles = async (files) => {
    const urls = [];
    for (const file of files) {
      try {
        const res = await uploadToCloudinary(file);
        if (res?.secure_url || res?.url) urls.push(res.secure_url || res.url);
      } catch {}
    }
    return urls;
  };

  const submitPost = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (!isAuthed) {
      setMsg({ type: "error", text: "Login required to post." });
      return;
    }

    setPosting(true);
    try {
      if (active === "general") {
        if (!canPostGeneral) throw new Error("Missing fields");
        let imageUrls = [];
        if (images.length) imageUrls = await uploadFiles(images);
        await createPost({
          school: schoolKey,
          title: title.trim(),
          content: content.trim(),
          images: imageUrls,
        });
        setGeneralRaw((s) => ({
          ...s,
          items: [
            {
              _id: Math.random().toString(36).slice(2),
              title: title.trim(),
              createdAt: new Date().toISOString(),
              raw: { title: title.trim(), content: content.trim() },
            },
            ...s.items,
          ],
        }));
      } else {
        if (!canPostAcademic) throw new Error("Missing fields");
        const base = { school: schoolKey };

        if (mode === "question") {
          await createAcademicPost({
            ...base,
            title: title.trim(),
            content: content.trim(),
            postType: "question",
          });
        } else if (lookingKind === "course_materials") {
          await createAcademicPost({
            ...base,
            title: title.trim(),
            content: "",
            postType: "seeking",
            kind: "course_materials",
            courseName: title.trim(),
            professor: professor.trim(),
            materials,
            tags: ["seeking", "course_materials"],
          });
        } else {
          await createAcademicPost({
            ...base,
            title: title.trim(),
            content: content.trim(),
            postType: "seeking",
            kind: lookingKind,
            tags: ["seeking", lookingKind],
          });
        }

        setAcad((s) => ({ ...s, loading: true }));
        await fetchAcademicPage(1, false);
      }

      // reset
      setTitle("");
      setContent("");
      setImages([]);
      setMode("question");
      setLookingKind("course_materials");
      setProfessor("");
      setMaterials([]);

      setMsg({ type: "success", text: "Posted!" });
      setTimeout(() => setMsg({ type: "", text: "" }), 1200);
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to post." });
    } finally {
      setPosting(false);
    }
  };

  /* ---------- render ---------- */
  const currentList =
    active === "general"
      ? {
          loading: general.loading,
          items: general.items,
          hasMore: general.hasMore,
          error: general.error,
        }
      : {
          loading: acad.loading,
          items: acad.items,
          hasMore: acad.hasMore,
          error: acad.error,
          loadingMore: acad.loadingMore,
        };

  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[minmax(620px,700px)_380px] gap-10">
        {/* FEED */}
        <section className="md:col-start-1">
          <Segmented value={active} onChange={setActive} />

          {active === "general" ? (
            <FreeSearchBar
              value={freeQuery}
              onSubmit={(v) => {
                setFreeQuery(v);
                setFreeVisible(12);
              }}
              onReset={() => {
                setFreeQuery({ q: "" });
                setFreeVisible(12);
              }}
            />
          ) : (
            <AcademicSearchBar
              value={{ q: acadQuery.q, type: acadQuery.type, kind: acadQuery.kind }}
              onSubmit={(v) => setAcadQuery(v)}
              onReset={() => setAcadQuery({ q: "", type: "all", kind: "" })}
            />
          )}

          {/* list */}
          {currentList.loading ? (
            <ul className="mt-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <li
                  key={i}
                  className="h-16 rounded-xl bg-white/70 border border-slate-200 animate-pulse"
                />
              ))}
            </ul>
          ) : currentList.items.length ? (
            <>
              <ul className="mt-5 mx-auto max-w-[700px] px-2 space-y-4">
                {currentList.items.map((p) => {
                  const actionsForThis =
                    active === "general" ||
                    (active === "academic" &&
                      normalizeType(p.raw || {}) === "question");

                  const comments =
                    p.raw?.commentCount ??
                    p.raw?.commentsCount ??
                    (Array.isArray(p.raw?.comments) ? p.raw.comments.length : 0);

                  return (
                    <li key={p._id || Math.random()}>
                      <div className="mx-6 border-b border-slate-300/80 py-3">
                        <PostRow
                          post={p}
                          onOpenDetail={() => goDetail(p, active)}
                          showBadge={active === "academic"}
                          showActionsBar={actionsForThis}
                          commentCount={comments}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* sentinel */}
              <div className="flex justify-center py-6">
                <div
                  ref={active === "general" ? freeSentinelRef : acadSentinelRef}
                  className="h-6 w-6 rounded-full border-2 border-dashed border-slate-300"
                  aria-hidden
                />
              </div>

              {/* loading more indicator for academic */}
              {active === "academic" && currentList.loadingMore && (
                <div className="text-center pb-8 text-slate-500 text-sm">
                  Loading more…
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-[700px] text-center py-16">
              <p className="text-[15px] text-slate-600">
                {currentList.error || "No posts yet."}
              </p>
            </div>
          )}
        </section>

        {/* COMPOSER */}
        <aside className="md:col-start-2 md:sticky md:top-[24px] self-start">
          <CardBox>
            <form onSubmit={submitPost}>
              <ComposerHeader
                title={title}
                setTitle={setTitle}
                active={active}
                mode={mode}
                lookingKind={lookingKind}
              />

              <div className="p-4 space-y-4">
                {active === "academic" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("question")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        mode === "question"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                      aria-pressed={mode === "question"}
                    >
                      General question
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("seeking")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        mode === "seeking"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                      aria-pressed={mode === "seeking"}
                    >
                      Seeking 📥
                    </button>

                    {mode === "seeking" && (
                      <select
                        value={lookingKind}
                        onChange={(e) => setLookingKind(e.target.value)}
                        className="ml-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm"
                      >
                        <option value="course_materials">Course Materials</option>
                        <option value="study_mate">Study Mate</option>
                        <option value="coffee_chat">Coffee Chat</option>
                      </select>
                    )}
                  </div>
                )}

                {/* Body fields */}
                {active === "academic" && mode === "seeking" && lookingKind === "course_materials" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Professor (optional)
                      </label>
                      <input
                        type="text"
                        value={professor}
                        onChange={(e) => setProfessor(e.target.value)}
                        placeholder="Professor name (optional)"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Personal Materials (choose one or more)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {MATERIAL_OPTIONS.map((opt) => (
                          <label
                            key={opt.key}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                              materials.includes(opt.key)
                                ? "border-slate-900 bg-slate-900/5"
                                : "border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={materials.includes(opt.key)}
                              onChange={() => toggleMaterial(opt.key)}
                              className="accent-black"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        You can select multiple. Title will be used as course name.
                      </p>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      active === "general"
                        ? "Write your content here…"
                        : mode === "question"
                        ? "Describe your academic/career question…"
                        : lookingKind === "study_mate"
                        ? "Describe schedule, level, topic…"
                        : "Say hello and what you'd like to chat about…"
                    }
                    className="w-full min-h-[120px] rounded-xl border border-slate-300 px-3 py-2 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                )}

                {/* Images: freeboard 전용 (주석 유지) */}
                {/* ... */}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-slate-500">
                    Posting to{" "}
                    <strong>
                      {active === "general"
                        ? "Freeboard"
                        : mode === "question"
                        ? "Academic"
                        : `Seeking: ${
                            lookingKind === "course_materials"
                              ? "Course Materials"
                              : lookingKind === "study_mate"
                              ? "Study Mate"
                              : "Coffee Chat"
                          }`}
                    </strong>
                    .
                  </p>

                  {active === "academic" && mode === "seeking" ? (
                    <div className="flex flex-col items-end">
                      <button
                        type="submit"
                        disabled={!canPostAcademic || posting}
                        className="rounded-xl bg-[#3044f0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2433c4] active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                      >
                        {posting ? (
                          "Posting…"
                        ) : (
                          <>
                            Post{" "}
                            <span className="line-through text-[11px] text-gray-400 ml-1">
                              6 C point
                            </span>
                          </>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-400 mt-[2px]">
                        0 point during beta season
                      </span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        posting ||
                        (active === "general" ? !canPostGeneral : !canPostAcademic)
                      }
                      className="rounded-xl bg-[#3044f0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2433c4] active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                    >
                      {posting ? "Posting…" : "Post"}
                    </button>
                  )}
                </div>

                {!!msg.text && (
                  <div
                    className={`text-sm rounded-lg px-3 py-2 ${
                      msg.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            </form>
          </CardBox>
        </aside>
      </main>
    </div>
  );
}
