// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";

import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

/* Read / Write API */
import { createPost, getPublicPosts } from "../../api/posts";
import { createAcademicPost, getPublicAcademicPosts } from "../../api/academicPosts"; // << here

/* ===== Design tokens ===== */
const TOKENS = {
  pageBg: "#FAFAFA",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#111827",
  pink: "#FF6B8A",
  red: "#FF7A70",
};

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#cbd5e1" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#cbd5e1" />
    </svg>
  );
}

/* ... (생략 없이 기존 컴포넌트/헬퍼 그대로) ... */
/* 아래 파일 전체를 그대로 교체하면 돼. 차이점은 API 호출부와 submit 로직뿐이야. */

function Segmented({ value, onChange }) {
  const isGeneral = value === "general";
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [underline, setUnderline] = useState({ w: 0, x: 0 });

  const measure = () => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    const el = isGeneral ? l : r;
    const w = el.offsetWidth;
    const x = el.offsetLeft - l.offsetLeft;
    setUnderline({ w, x });
  };

  useLayoutEffect(() => {
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
              !isGeneral ? "text-slate-900 animate-[wiggleScale_360ms_ease-in-out]" : "text-slate-400 hover:text-slate-600"
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

function CardBox({ children }) {
  return <div className="rounded-2xl bg-white shadow-lg overflow-hidden">{children}</div>;
}

/* ===== Helpers ===== */
function pluckArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  return [];
}
function normalizePosts(res) {
  const arr = pluckArray(res);
  return arr.map((p) => {
    const id = p._id || p.id;
    const title = p.title || (typeof p.content === "string" ? p.content.slice(0, 80) : "Untitled");
    const createdAt = p.createdAt || p.updatedAt || new Date().toISOString();
    const raw = p;
    return { _id: id, title, createdAt, raw };
  });
}

/* === Badge logic (Seeking만 표시) === */
function mapKindToEmoji(kind = "") {
  const k = String(kind || "").toLowerCase().replace(/[-\s]/g, "_");
  if (k.includes("course_material")) return "📝";
  if (k.includes("study_mate") || k.includes("study_group") || k.includes("study")) return "👥";
  if (k.includes("coffee")) return "☕️";
  return "";
}
function academicBadge(post) {
  const r = post.raw || {};
  let type =
    (r.postType || r.type || (r.lookingFor ? "seeking" : "question") || "")
      .toString()
      .toLowerCase()
      .replace("looking_for", "seeking");
  if (!type || (type !== "seeking" && type !== "question")) {
    const blob = `${r.title || ""} ${r.content || ""}`.toLowerCase();
    type = /seeking|looking\s*for/.test(blob) ? "seeking" : "question";
  }
  if (type !== "seeking") return "";
  const kindSource =
    r.kind ||
    (Array.isArray(r.tags) ? r.tags.find((x) => /materials|study|coffee/i.test(String(x))) : "") ||
    (() => {
      const text = `${r.title || ""} ${r.content || ""}`.toLowerCase();
      if (/coffee/.test(text)) return "coffee_chat";
      if (/study\s*(mate|group)|study\b/.test(text)) return "study_mate";
      if (/material|syllabus|note|exam|homework|assignment/.test(text)) return "course_materials";
      return "";
    })();
  return mapKindToEmoji(kindSource);
}

function PostRow({ post, onOpenDetail, showBadge }) {
  const badge = showBadge ? academicBadge(post) : "";
  return (
    <button type="button" onClick={onOpenDetail} className="w-full text-left py-4 px-3 hover:bg-slate-50 transition">
      <div className="flex items-center gap-3">
        {badge ? <span className="text-[18px] w-6 text-center">{badge}</span> : <span className="w-6" />}
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
          <PersonIcon />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">{post.title}</div>
          <div className="text-xs text-slate-500">
            Posted by anonymous • {new Date(post.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </button>
  );
}

function FreeSearchBar({ value, onSubmit, onReset }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const handle = (e) => { e.preventDefault(); onSubmit(local); };
  return (
    <form onSubmit={handle} className="mx-auto mt-5 w-full max-w-[700px] rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.06)] bg-white border border-slate-200 overflow-hidden">
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
          <button type="button" onClick={() => onReset()} className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100">Reset</button>
          <button type="submit" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold">Search</button>
        </div>
      </div>
    </form>
  );
}

function AcademicSearchBar({ value, onSubmit, onReset }) {
  const [local, setLocal] = useState(value);
  const [open, setOpen] = useState(false);
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
      const el = e.target.closest?.("[data-acad-popover]");
      if (el) return;
      setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(local); setOpen(false); };
  const set = (patch) => setLocal((v) => ({ ...v, ...patch }));

  const QUESTION_TOPICS = [
    { key: "course_planning", label: "Course planning", emoji: "📚", desc: "What to take / prereqs" },
    { key: "homework_help", label: "Homework help", emoji: "🧩", desc: "Concepts & hints (no full answers)" },
    { key: "exam_prep", label: "Exam prep", emoji: "📝", desc: "Study strategies / past exams" },
    { key: "internships", label: "Internships", emoji: "💼", desc: "Applications / referrals / experiences" },
    { key: "job_search", label: "Job search", emoji: "💻", desc: "Interviews / resume / networking" },
    { key: "visa_opt_cpt", label: "Visa · OPT · CPT", emoji: "🪪", desc: "International student topics" },
    { key: "housing", label: "Housing", emoji: "🏠", desc: "On/off campus housing" },
    { key: "scholarships", label: "Scholarships", emoji: "🎓", desc: "Aid / scholarships / grants" },
  ];

  const Panel = () =>
    createPortal(
      <div data-acad-popover className="z-50 fixed" style={{ left: Math.round(rect.left), top: Math.round(rect.bottom + 8), width: Math.round(rect.width), maxWidth: 860 }}>
        <div className="rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr]">
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-slate-200">
              <div className="text-[12px] font-semibold text-slate-500 mb-2">Type</div>
              <div className="flex sm:block">
                {[
                  { key: "all", label: "All" },
                  { key: "question", label: "General Question ﹖" },
                  { key: "seeking", label: "Seeking" },
                ].map((opt) => {
                  const active = local.type === opt.key || (!local.type && opt.key === "all");
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        set({
                          type: opt.key,
                          kind: opt.key === "seeking"
                            ? (local.kind && ["course_materials", "study_mate", "coffee_chat"].includes(local.kind)
                                ? local.kind
                                : "course_materials")
                            : "",
                        })
                      }
                      className={`w-full text-left px-3 py-2 rounded-xl text-[14px] transition ${
                        active ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4">
              {local.type === "seeking" ? (
                <>
                  <div className="text-[12px] font-semibold text-slate-500 mb-2">Seeking · kind</div>
                  {[
                    { key: "course_materials", label: "Course Materials", emoji: "📝", desc: "Syllabus, notes, exams…" },
                    { key: "study_mate", label: "Study Mate", emoji: "👥", desc: "Find peers to study together" },
                    { key: "coffee_chat", label: "Coffee Chat", emoji: "☕️", desc: "Casual chat / mentoring" },
                  ].map((opt) => {
                    const active = local.kind === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => set({ kind: opt.key, type: "seeking" })}
                        className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-3 mb-2 text-left transition ${
                          active ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xl leading-6">{opt.emoji}</span>
                        <span>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[12px] text-slate-500">{opt.desc}</div>
                        </span>
                      </button>
                    );
                  })}
                  <div className="pt-2 flex justify-end">
                    <button type="button" onClick={() => { onReset(); setOpen(false); }} className="px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-100 mr-2">Reset</button>
                    <button type="button" onClick={() => { onSubmit(local); setOpen(false); }} className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold">Apply</button>
                  </div>
                </>
              ) : local.type === "question" ? (
                <>
                  <div className="text-[12px] font-semibold text-slate-500 mb-2">Question · topic</div>
                  <div className="max-h-[280px] overflow-auto pr-1">
                    {QUESTION_TOPICS.map((opt) => {
                      const active = local.kind === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => set({ kind: opt.key, type: "question" })}
                          className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-3 mb-2 text-left transition ${
                            active ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-xl leading-6">{opt.emoji}</span>
                          <span>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-[12px] text-slate-500">{opt.desc}</div>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="button" onClick={() => { onReset(); setOpen(false); }} className="px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-100 mr-2">Reset</button>
                    <button type="button" onClick={() => { onSubmit(local); setOpen(false); }} className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold">Apply</button>
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-slate-500">Choose a type on the left to refine your search.</div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="mx-auto mt-5 w-full max-w-[860px]" ref={anchorRef}>
      <form onSubmit={handleSubmit} className="rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.06)] bg-white border border-slate-200 overflow-hidden">
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
          <button type="button" onClick={() => { measure(); setOpen(true); }} className="px-5 text-left py-3 border-r hover:bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500">Type</div>
            <div className="text-[14px]">
              {local.type === "seeking" ? "Seeking" : local.type === "question" ? "General Question" : "All"}
            </div>
          </button>
          <div className="flex items-center gap-2 px-3">
            <button type="button" onClick={() => { onReset(); setOpen(false); }} className="px-3 py-2 rounded-full text-sm text-slate-700 hover:bg-slate-100">Reset</button>
            <button type="submit" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold">Search</button>
          </div>
        </div>
      </form>
      {open && <Panel />}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useSchool();
  const { user } = useAuth();
  const schoolPath = useSchoolPath();

  const isAuthed = !!user;
  const schoolKey = school || "nyu";

  const [active, setActive] = useState("general");
  const [general, setGeneral] = useState({ loading: true, items: [], error: "" });
  const [academic, setAcademic] = useState({ loading: true, items: [], error: "" });

  // composer
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // freeboard
  const [images, setImages] = useState([]);

  // academic
  const [mode, setMode] = useState("question"); // 'question' | 'seeking'
  const [lookingKind, setLookingKind] = useState("course_materials");

  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const tab = (p.get("tab") || "").toLowerCase();
    if (tab === "free") setActive("general");
    else if (tab === "academic") setActive("academic");
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      setGeneral({ loading: true, items: [], error: "" });
      setAcademic({ loading: true, items: [], error: "" });
      try {
        const [genRaw, acadRaw] = await Promise.all([
          getPublicPosts({ school: schoolKey, limit: 50, sort: "new" }),
          getPublicAcademicPosts({ school: schoolKey, limit: 50, sort: "new" }), // << here
        ]);
        if (!alive) return;
        const gen = normalizePosts(genRaw);
        const acad = normalizePosts(acadRaw);
        setGeneral({ loading: false, items: gen, error: gen.length ? "" : "No posts yet." });
        setAcademic({ loading: false, items: acad, error: acad.length ? "" : "No posts yet." });
      } catch (err) {
        if (!alive) return;
        const msg = err?.message || "Failed to load posts.";
        setGeneral({ loading: false, items: [], error: msg });
        setAcademic({ loading: false, items: [], error: msg });
      }
    }
    fetchAll();
    return () => { alive = false; };
  }, [schoolKey]);

  const [freeQuery, setFreeQuery] = useState({ q: "" });
  const [acadQuery, setAcadQuery] = useState({ q: "", type: "all", kind: "" });

  const filteredGeneral = useMemo(() => {
    const { q } = freeQuery;
    let list = general.items;
    if (q) {
      const key = q.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(key) || (p.raw?.content || "").toLowerCase().includes(key));
    }
    return list;
  }, [general.items, freeQuery]);

  const filteredAcademic = useMemo(() => {
    const { q, type, kind } = acadQuery;
    let list = academic.items;
    if (q) {
      const key = q.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(key) || (p.raw?.content || "").toLowerCase().includes(key));
    }
    if (type !== "all") {
      list = list.filter((p) => {
        const t = p.raw?.postType || p.raw?.type || (p.raw?.lookingFor ? "seeking" : "question");
        return String(t).toLowerCase().replace("looking_for", "seeking") === type;
      });
    }
    if (type === "seeking" && kind) {
      list = list.filter((p) => {
        const k = (p.raw?.kind || (Array.isArray(p.raw?.tags) ? p.raw.tags.join(" ") : "") || "").toLowerCase();
        const needle = String(kind).replace(/_/g, " ");
        return k.includes(needle);
      });
    }
    if (type === "question" && kind) {
      const needle = String(kind).replace(/_/g, " ").toLowerCase();
      list = list.filter((p) => {
        const blob = [
          p.raw?.topic,
          p.raw?.category,
          p.raw?.kind,
          ...(Array.isArray(p.raw?.tags) ? p.raw.tags : []),
        ].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(needle);
      });
    }
    return list;
  }, [academic.items, acadQuery]);

  const current = active === "general" ? { ...general, items: filteredGeneral } : { ...academic, items: filteredAcademic };

  const schoolNavigate = (p) => navigate(schoolPath(p));
  const goDashboardFree = () => schoolNavigate("/dashboard?tab=free");
  const goDashboardAcademic = () => schoolNavigate("/dashboard?tab=academic");

  const openDetail = (post) => {
    const id = post.raw?._id || post._id || post.raw?.id || post.id;
    if (!id) return active === "general" ? goDashboardFree : goDashboardAcademic();
    const to = active === "general" ? schoolPath(`/freeboard/${id}`) : schoolPath(`/academic/${id}`); // << here
    navigate(to);
  };

  const canPostGeneral = isAuthed && title.trim() && (content.trim() || images.length);
  const canPostAcademic = isAuthed && title.trim() && (mode === "question" ? content.trim() : true);

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
    if (!isAuthed) { setMsg({ type: "error", text: "Login required to post." }); return; }

    setPosting(true);
    try {
      if (active === "general") {
        if (!canPostGeneral) throw new Error("Missing fields");
        let imageUrls = [];
        if (images.length) imageUrls = await uploadFiles(images);
        await createPost({ school: schoolKey, title: title.trim(), content: content.trim(), images: imageUrls });
        setMsg({ type: "success", text: "Posted to Freeboard! Redirecting…" });
        setTimeout(goDashboardFree, 400);
      } else {
        if (!canPostAcademic) throw new Error("Missing fields");
        const base = { school: schoolKey, title: title.trim(), content: content.trim() };

        if (mode === "question") {
          await createAcademicPost({ ...base, postType: "question" }); // server → mode='general'
        } else {
          await createAcademicPost({
            ...base,
            postType: "seeking",             // alias (server가 mode=looking_for로 정규화)
            kind: lookingKind,               // 'course_materials' | 'study_mate' | 'coffee_chat'
            tags: ["seeking", lookingKind],
          });
        }

        setMsg({ type: "success", text: "Posted to Academic! Redirecting…" });
        setTimeout(goDashboardAcademic, 400);
      }

      setTitle(""); setContent(""); setImages([]);
      setMode("question"); setLookingKind("course_materials");
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Failed to post. Please check required fields." });
    } finally {
      setPosting(false);
    }
  };

  /* ... 아래 렌더 영역은 기존과 동일 ... */
  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[minmax(620px,700px)_380px] gap-10">
        {/* FEED */}
        <section className="md:col-start-1">
          <Segmented value={active} onChange={setActive} />

          {active === "general" ? (
            <FreeSearchBar value={freeQuery} onSubmit={setFreeQuery} onReset={() => setFreeQuery({ q: "" })} />
          ) : (
            <AcademicSearchBar
              value={{ q: acadQuery.q, type: acadQuery.type, kind: acadQuery.kind }}
              onSubmit={setAcadQuery}
              onReset={() => setAcadQuery({ q: "", type: "all", kind: "" })}
            />
          )}

          {current.loading ? (
            <ul className="mt-4 space-y-3">{Array.from({ length: 10 }).map((_, i) => (<li key={i} className="h-16 rounded-xl bg-white/70 border border-slate-200 animate-pulse" />))}</ul>
          ) : current.items.length ? (
            <ul className="mt-5 mx-auto max-w-[700px] px-2">
              {current.items.map((p) => (
                <li key={p._id || Math.random()}>
                  <div className="mx-6 border-b border-slate-300/80">
                    <PostRow post={p} onOpenDetail={() => openDetail(p)} showBadge={active === "academic"} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-[700px] text-center py-16">
              <p className="text-[15px] text-slate-600">{current.error || "No posts yet."}</p>
              <button
                type="button"
                onClick={active === "general" ? () => schoolNavigate("/dashboard?tab=free") : () => schoolNavigate("/dashboard?tab=academic")}
                className="mt-4 px-4 py-2 rounded-xl bg-black text-white text-[14px] font-semibold"
              >
                Open {active === "general" ? "Freeboard" : "Academic Board"}
              </button>
            </div>
          )}
        </section>

        {/* COMPOSER */}
        <aside className="md:col-start-2 md:sticky md:top-[24px] self-start">
          <CardBox>
            <form onSubmit={submitPost}>
              {ComposerHeader}

              <div className="p-4 space-y-4">
                {active === "academic" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("question")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${mode === "question" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                      aria-pressed={mode === "question"}
                    >
                      General question
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("seeking")}
                      className={`px-3 py-1.5 rounded-full text-sm border ${mode === "seeking" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
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

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    active === "general"
                      ? "Write your content here…"
                      : mode === "question"
                      ? "Describe your academic/career question…"
                      : lookingKind === "course_materials"
                      ? "Describe what you need or any context…"
                      : lookingKind === "study_mate"
                      ? "Describe schedule, level, topic…"
                      : "Say hello and what you'd like to chat about…"
                  }
                  className="w-full min-h-[120px] rounded-xl border border-slate-300 px-3 py-2 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />

                {active === "general" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setImages(Array.from(e.target.files || []))}
                      className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
                    />
                    {!!images.length && (
                      <div className="grid grid-cols-3 gap-2">
                        {images.map((f, idx) => (
                          <div key={idx} className="h-24 rounded-lg overflow-hidden border border-slate-200">
                            <img src={URL.createObjectURL(f)} alt={`selected-${idx}`} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-slate-500">
                    Posting to{" "}
                    <strong>
                      {active === "general"
                        ? "Freeboard"
                        : mode === "question"
                        ? "Academic"
                        : `Seeking: ${lookingKind === "course_materials" ? "Course Materials" : lookingKind === "study_mate" ? "Study Mate" : "Coffee Chat"}`}
                    </strong>
                    .
                  </p>
                  <button
                    type="submit"
                    disabled={posting || (active === "general" ? !canPostGeneral : !canPostAcademic)}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-900 disabled:opacity-60"
                  >
                    {posting ? "Posting…" : "Post"}
                  </button>
                </div>

                {!!msg.text && (
                  <div className={`text-sm rounded-lg px-3 py-2 ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
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









