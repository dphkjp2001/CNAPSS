// frontend/src/pages/dashboard/Dashboard.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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

import { Bookmark, Repeat2, Share, Send, MessageSquare } from "lucide-react";

/* ===== Design tokens ===== */
const TOKENS = {
  pageBg: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#111827",
  pink: "#FF6B8A",
  red: "#FF7A70",
};

/* ===== utils (type/kind normalization) ===== */
const toSlug = (v = "") =>
  String(v).toLowerCase().trim().replace(/[\s_-]+/g, "_");
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
  if (diffHours < 24) return `${diffHours} hs ago`;
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

/* ⬇️ PostRow (미리보기 한 줄 + 간격 조정) */
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
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
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

/* ===================== Main ===================== */
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useSchool();
  const { user } = useAuth();
  const schoolPath = useSchoolPath();

const schoolKey = (typeof school === "string" && school ? school.toLowerCase() : "nyu");

  /* ---------- 탭/검색 상태: URL 파라미터만 사용 (Layout이 관리) ---------- */
  const getParamsState = () => {
    const p = new URLSearchParams(location.search);
    const active = p.get("tab") === "free" ? "general" : "academic";
    const freeQuery = { q: p.get("q") || "" };
    const acadQuery = {
      q: p.get("q") || "",
      type: p.get("type") || "all",
      kind: p.get("kind") || "",
    };
    return { active, freeQuery, acadQuery };
  };
  const [{ active, freeQuery, acadQuery }, setUiState] = useState(getParamsState());
  useEffect(() => setUiState(getParamsState()), [location.search]);

  /* ---------- FREEBOARD ---------- */
  const [generalRaw, setGeneralRaw] = useState({
    loading: true,
    items: [],
    error: "",
  });
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

  // 수정본
const fetchAcademicPage = useCallback(
  async (page = 1, append = false) => {
    // schoolKey 준비 안 됐으면 호출 보류
    if (!schoolKey || schoolKey === "undefined") {
      setAcad((s) => ({ ...s, loading: false, loadingMore: false }));
      return;
    }

    const params = {
      school: schoolKey,
      page,
      limit: acad.limit,
      q: acadQuery.q || "",
      sort: "new",
    };

    // type이 all이 아닐 때만 보냄
    if (acadQuery.type && acadQuery.type !== "all") {
      params.type = acadQuery.type;
    }

    // seeking일 때 kind가 있으면 보냄
    if (acadQuery.type === "seeking" && acadQuery.kind) {
      params.kind = acadQuery.kind;
    }

    const res = await getPublicAcademicPosts(params);
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
  // 🔧 의존성 최소화: 함수 재생성으로 인한 무한 루프 방지
  [schoolKey, acadQuery]
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
  }, [schoolKey, acadQuery.q, acadQuery.type, acadQuery.kind, fetchAcademicPage]);

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

  // Academic 전용: General question / Seeking 모드
  const [mode, setMode] = useState("question"); // 'question' | 'seeking'
  const [lookingKind, setLookingKind] = useState("course_materials"); // course_materials | study_mate | coffee_chat

  // Seeking: Course Materials 세부 필드
  const [professor, setProfessor] = useState("");
  const [materials, setMaterials] = useState([]); // array of keys
  const MATERIAL_OPTIONS = [
    { key: "lecture_notes", label: "Lecture Notes" },
    { key: "syllabus", label: "Syllabus" },
    { key: "past_exams", label: "Past Exams" },
    { key: "quiz_prep", label: "Quiz Prep" },
  ];
  const toggleMaterial = (k) =>
    setMaterials((arr) => (arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]));

  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const canPostGeneral =
    !!user && title.trim() && (content.trim() || images.length);
  const canPostAcademic =
    !!user &&
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
    if (!user) {
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
            title: title.trim(),      // 코스명으로 사용
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
              {/* 헤더: placeholder가 탭/모드에 맞춰 변경 */}
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

              <div className="p-4 space-y-4">
                {/* Academic일 때 상단 모드 토글 */}
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

                {/* 본문/세부필드 */}
                {active === "academic" &&
                mode === "seeking" &&
                lookingKind === "course_materials" ? (
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

                {/* Images: freeboard 전용 업로드 등은 기존 유지할 수 있게 자리만 남김 */}
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
