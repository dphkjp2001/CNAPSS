// // frontend/src/pages/dashboard/Dashboard.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import { useSchool } from "../../contexts/SchoolContext";
// import { useAuth } from "../../contexts/AuthContext";
// import { useSchoolPath } from "../../utils/schoolPath";

// /* APIs */
// import { listPosts, getPublicPosts, createPost } from "../../api/posts";
// import {
//   listCareerPosts,
//   getPublicCareerPosts,
//   createCareerPost,
// } from "../../api/careerPosts";

// /* ====== Tokens ====== */
// const TOKENS = {
//   pageBg: "#F7F8FA",
//   text: "#0F172A",
//   sub: "#475569",
//   red: "#EF4444",
//   redSoft: "#F87171",
//   border: "rgba(15,23,42,0.16)",
//   white: "#FFFFFF",
//   blue: "#2563EB",
//   sky: "#0EA5E9",
//   softBlue: "#4F7DF3",
// };

// /* ===== UI helpers ===== */
// function Card({ children, className = "" }) {
//   return (
//     <div
//       className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${className}`}
//       style={{ borderColor: TOKENS.border }}
//     >
//       {children}
//     </div>
//   );
// }

// function ListSkeleton({ rows = 5 }) {
//   return (
//     <ul className="animate-pulse space-y-3">
//       {Array.from({ length: rows }).map((_, i) => (
//         <li key={i} className="h-4 w-full rounded bg-slate-100" />
//       ))}
//     </ul>
//   );
// }

// /* ===== PAGE ===== */
// export default function Dashboard() {
//   const navigate = useNavigate();
//   const { school } = useSchool();
//   const { user } = useAuth();
//   const schoolPath = useSchoolPath();

//   const isAuthed = !!user;
//   const schoolKey = school || "nyu";

//   /* lists */
//   const [general, setGeneral] = useState({ loading: true, items: [] });
//   const [academic, setAcademic] = useState({ loading: true, items: [] });

//   /* compose */
//   const [targetBoard, setTargetBoard] = useState("general"); // "general" | "academic"
//   const [title, setTitle] = useState("");
//   const [content, setContent] = useState("");
//   const [posting, setPosting] = useState(false);
//   const [msg, setMsg] = useState({ type: "", text: "" });

//   /* fetch lists */
//   useEffect(() => {
//     let alive = true;
//     async function run() {
//       setGeneral((s) => ({ ...s, loading: true }));
//       setAcademic((s) => ({ ...s, loading: true }));
//       try {
//         const [gen, acad] = await Promise.all([
//           isAuthed
//             ? listPosts({ school: schoolKey, limit: 5, sort: "new" })
//             : getPublicPosts({ school: schoolKey, limit: 5, sort: "new" }),
//           isAuthed
//             ? listCareerPosts({ school: schoolKey, limit: 5, sort: "new" })
//             : getPublicCareerPosts({ school: schoolKey, limit: 5, sort: "new" }),
//         ]);
//         if (!alive) return;
//         setGeneral({ loading: false, items: normalizePosts(gen) });
//         setAcademic({ loading: false, items: normalizePosts(acad) });
//       } catch {
//         if (!alive) return;
//         setGeneral({ loading: false, items: [] });
//         setAcademic({ loading: false, items: [] });
//       }
//     }
//     run();
//     return () => { alive = false; };
//   }, [isAuthed, schoolKey]);

//   /* nav (schoolPath가 prefix를 붙여줌) */
//   const goGeneral = () => navigate(schoolPath("/freeboard"));
//   const goAcademic = () => navigate(schoolPath("/career"));

//   /* compose submit */
//   const canPost = isAuthed && title.trim() && content.trim();
//   const submitPost = async (e) => {
//     e.preventDefault();
//     setMsg({ type: "", text: "" });
//     if (!isAuthed) {
//       setMsg({ type: "error", text: "Login required to post." });
//       return;
//     }
//     if (!canPost) {
//       setMsg({ type: "error", text: "Please enter title and content." });
//       return;
//     }
//     setPosting(true);
//     try {
//       if (targetBoard === "general") {
//         await createPost({ school: schoolKey, title: title.trim(), content: content.trim() });
//         setMsg({ type: "success", text: "Posted to Freeboard! Redirecting..." });
//         setTimeout(goGeneral, 400);
//       } else {
//         await createCareerPost({ school: schoolKey, title: title.trim(), content: content.trim() });
//         setMsg({ type: "success", text: "Posted to Academic Board! Redirecting..." });
//         setTimeout(goAcademic, 400);
//       }
//       setTitle("");
//       setContent("");
//     } catch {
//       setMsg({ type: "error", text: "Failed to post. Please try again." });
//     } finally {
//       setPosting(false);
//     }
//   };

//   /* academic quick templates (유도용) */
//   const ACADEMIC_TEMPLATES = [
//     'Anyone has [COURSE] midterm notes?',
//     'Looking to buy [COURSE] textbook',
//     'Selling [COURSE] study guide (cheap)',
//     'Forming study group for [COURSE]',
//     'Which prof is better for [COURSE]?',
//   ];
//   const [selectedTemplate, setSelectedTemplate] = useState("");

//   /* dynamic placeholders */
//   const placeholders = useMemo(() => {
//     if (targetBoard === "general") {
//       return {
//         title: `e.g. "Best late-night study spots near Bobst?"`,
//         body: `Share details or ask a follow-up.\nExamples:\n• “Can I bring an air fryer to dorms?”\n• “Any CS-UY networking events this week?”`,
//         footer: <>Posting to <strong>Freeboard</strong> as anonymous.</>,
//       };
//     }
//     return {
//       title: `e.g. "NYC SWE internships: prep for tech screens?"`,
//       body: `Share details or ask a follow-up.\nExamples:\n• “Share your behavioral interview notes”\n• “Which prof is better for DS-UA 201?”`,
//       footer: <>Posting to <strong>Academic Board</strong> as anonymous.</>,
//     };
//   }, [targetBoard]);

//   return (
//     <div style={{ background: TOKENS.pageBg }}>
//       {/* ===== Section 1: Compose (centered, compact) ===== */}
//       <section
//         className="w-full relative"
//         style={{ background: `linear-gradient(180deg, ${TOKENS.red} 0%, ${TOKENS.redSoft} 100%)` }}
//       >
//         <div
//           aria-hidden
//           className="pointer-events-none absolute left-1/2 top-[-120px] h-[320px] w-[720px] -translate-x-1/2 rounded-full blur-3xl opacity-30"
//           style={{
//             background:
//               "radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)",
//           }}
//         />
//         <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
//           {/* 중앙 정렬 래퍼 */}
//           <div className="mx-auto max-w-4xl text-center">
//             <p className="text-white/95 text-[18px] sm:text-[20px]">
//               Ask classmates, share your thoughts, and even earn pocket money by safely trading notes and materials.
//             </p>

//             {/* board selector – 중앙 정렬 */}
//             <div
//               className="mt-5 inline-flex rounded-full bg-white/30 p-1 backdrop-blur"
//               role="tablist"
//               aria-label="Select board to post"
//             >
//               <button
//                 role="tab"
//                 aria-selected={targetBoard === "general"}
//                 onClick={() => setTargetBoard("general")}
//                 className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
//                   targetBoard === "general" ? "bg-white text-slate-900 shadow-sm" : "text-white/90 hover:text-white"
//                 }`}
//               >
//                 Freeboard
//               </button>
//               <button
//                 role="tab"
//                 aria-selected={targetBoard === "academic"}
//                 onClick={() => setTargetBoard("academic")}
//                 className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
//                   targetBoard === "academic" ? "bg-white text-slate-900 shadow-sm" : "text-white/90 hover:text-white"
//                 }`}
//               >
//                 Academic Board
//               </button>
//             </div>
//           </div>

//           {/* compose card (centered) */}
//           <div className="mt-5">
//             <Card className="mx-auto max-w-3xl p-4">
//               <form onSubmit={submitPost} className="space-y-3">
//                 {/* Academic 전용 유도 드롭다운 */}
//                 {targetBoard === "academic" && (
//                   <div className="flex flex-wrap items-center gap-2">
//                     <label className="text-xs text-slate-600">Quick starter</label>
//                     <select
//                       value={selectedTemplate}
//                       onChange={(e) => {
//                         const v = e.target.value;
//                         setSelectedTemplate(v);
//                         if (v) setTitle(v); // 제목 자동 채움
//                       }}
//                       className="rounded-full border px-3 py-1.5 text-sm bg-white"
//                       style={{ borderColor: TOKENS.border }}
//                     >
//                       <option value="">Choose a template…</option>
//                       {ACADEMIC_TEMPLATES.map((t) => (
//                         <option key={t} value={t}>{t}</option>
//                       ))}
//                     </select>
//                     <span className="text-xs text-slate-500">
//                       Replace <code>[COURSE]</code> with your code (e.g., <code>DS-UA 201</code>)
//                     </span>
//                   </div>
//                 )}

//                 <input
//                   type="text"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   placeholder={placeholders.title}
//                   className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
//                   style={{ borderColor: TOKENS.border }}
//                 />
//                 <textarea
//                   value={content}
//                   onChange={(e) => setContent(e.target.value)}
//                   rows={4}
//                   placeholder={placeholders.body}
//                   className="w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
//                   style={{ borderColor: TOKENS.border }}
//                 />
//                 <div className="flex items-center justify-between">
//                   <span className="text-xs text-white/80">{placeholders.footer}</span>
//                   <div className="flex gap-2">
//                     <button
//                       type="button"
//                       onClick={() => { setTitle(""); setContent(""); setMsg({ type: "", text: "" }); }}
//                       className="rounded-xl border px-3.5 py-2 text-sm font-semibold hover:bg-black/5"
//                       style={{ borderColor: TOKENS.border }}
//                     >
//                       Clear
//                     </button>
//                     <button
//                       type="submit"
//                       disabled={!canPost || posting}
//                       className="rounded-xl px-4 py-2 text-white text-sm font-semibold disabled:opacity-50"
//                       style={{ background: TOKENS.softBlue }}
//                     >
//                       {posting ? "Posting..." : "Post"}
//                     </button>
//                   </div>
//                 </div>
//                 {msg.text && (
//                   <div
//                     className={`mt-1 rounded-xl px-3 py-2 text-sm ${
//                       msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
//                     }`}
//                   >
//                     {msg.text}
//                   </div>
//                 )}
//               </form>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* ===== Section 2: Boards preview (white) ===== */}
//       <section className="w-full">
//         <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
//           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
//             {/* Freeboard */}
//             <Card>
//               <button
//                 onClick={goGeneral}
//                 className="group flex items-center gap-2 text-sm font-bold text-left"
//                 style={{ color: TOKENS.blue }}
//                 title="Open Freeboard"
//               >
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
//                   <path d="M4 15v5l4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8z" stroke="currentColor" strokeWidth="2" />
//                 </svg>
//                 <span className="underline-offset-4 group-hover:underline">Freeboard</span>
//               </button>

//               <div className="mt-3">
//                 {general.loading ? (
//                   <ListSkeleton />
//                 ) : general.items.length ? (
//                   <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
//                     {general.items.map((p) => (
//                       <li key={p._id} className="py-3">
//                         <div className="flex items-center justify-between gap-3">
//                           <p className="text-[15px] font-semibold text-slate-900 line-clamp-1">{p.title}</p>
//                           <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
//                             <span className="inline-flex items-center gap-1">
//                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
//                                 <path d="M4 15v5l4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8z" stroke="currentColor" strokeWidth="2"/>
//                               </svg>
//                               {p.comments}
//                             </span>
//                             <span className="inline-flex items-center gap-1">
//                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
//                                 <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" stroke="currentColor" strokeWidth="2"/>
//                               </svg>
//                               {p.likes}
//                             </span>
//                           </div>
//                         </div>
//                         <div className="mt-1 text-xs text-slate-500">{p.ago}</div>
//                       </li>
//                     ))}
//                   </ul>
//                 ) : (
//                   <p className="text-sm text-slate-500">No recent threads yet.</p>
//                 )}
//               </div>
//             </Card>

//             {/* Academic */}
//             <Card>
//               <button
//                 onClick={goAcademic}
//                 className="group flex items-center gap-2 text-sm font-bold text-left"
//                 style={{ color: TOKENS.sky }}
//                 title="Open Academic Board"
//               >
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
//                   <path d="M4 15v5l4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8z" stroke="currentColor" strokeWidth="2" />
//                 </svg>
//                 <span className="underline-offset-4 group-hover:underline">Academic Board</span>
//               </button>

//               <div className="mt-3">
//                 {academic.loading ? (
//                   <ListSkeleton />
//                 ) : academic.items.length ? (
//                   <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
//                     {academic.items.map((p) => (
//                       <li key={p._id} className="py-3">
//                         <div className="flex items-center justify-between gap-3">
//                           <p className="text-[15px] font-semibold text-slate-900 line-clamp-1">{p.title}</p>
//                           <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
//                             <span className="inline-flex items-center gap-1">
//                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
//                                 <path d="M4 15v5l4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v8z" stroke="currentColor" strokeWidth="2"/>
//                               </svg>
//                               {p.comments}
//                             </span>
//                             <span className="inline-flex items-center gap-1">
//                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
//                                 <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" stroke="currentColor" strokeWidth="2"/>
//                               </svg>
//                               {p.likes}
//                             </span>
//                           </div>
//                         </div>
//                         <div className="mt-1 text-xs text-slate-500">{p.ago}</div>
//                       </li>
//                     ))}
//                   </ul>
//                 ) : (
//                   <p className="text-sm text-slate-500">No recent threads yet.</p>
//                 )}
//               </div>
//             </Card>
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }

// /* ===== helpers ===== */
// function normalizePosts(res) {
//   const arr =
//     (Array.isArray(res?.items) && res.items) ||
//     (Array.isArray(res?.data) && res.data) ||
//     (Array.isArray(res) && res) ||
//     [];
//   return arr.slice(0, 5).map((p) => {
//     const comments =
//       (typeof p.commentsCount === "number" && p.commentsCount) ||
//       (Array.isArray(p.comments) ? p.comments.length : 0) ||
//       (typeof p.replies === "number" ? p.replies : 0);
//     const likes =
//       (typeof p.likesCount === "number" && p.likesCount) ||
//       (Array.isArray(p.likes) ? p.likes.length : 0) ||
//       (typeof p.upvotes === "number" ? p.upvotes : 0);
//     return {
//       _id: p._id || p.id || Math.random().toString(36).slice(2),
//       title: p.title || p.content || "Untitled",
//       comments,
//       likes,
//       ago: p.createdAt ? timeAgo(p.createdAt) : "",
//     };
//   });
// }

// function timeAgo(iso) {
//   try {
//     const d = new Date(iso);
//     const s = Math.floor((Date.now() - d.getTime()) / 1000);
//     if (s < 60) return `${s}s ago`;
//     if (s < 3600) return `${Math.floor(s / 60)}m ago`;
//     if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
//     return `${Math.floor(s / 86400)}d ago`;
//   } catch {
//     return "";
//   }
// }

// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary"; // named export

/* APIs */
import { listPosts, getPublicPosts, createPost } from "../../api/posts";
import {
  listCareerPosts,
  getPublicCareerPosts,
  createCareerPost,
} from "../../api/careerPosts";

/* ===== Design tokens ===== */
const TOKENS = {
  pageBg: "#FAFAFA",
  text: "#0F172A",
  sub: "#64748B",
  border: "rgba(0,0,0,0.12)",
  primary: "#111827",
  pink: "#FF6B8A",
  red: "#FF7A70",
};

/* ===== Avatar icon (anonymous unified) ===== */
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#cbd5e1" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#cbd5e1" />
    </svg>
  );
}

/* ===== Segmented (outline-only, sliding border, no fill) ===== */
function Segmented({ value, onChange }) {
  const isGeneral = value === "general";
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [thumb, setThumb] = useState({ w: 0, x: 0 });
  const [wiggle, setWiggle] = useState(null);

  const measure = () => {
    const gap = 8;
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    const w = (isGeneral ? l.offsetWidth : r.offsetWidth) || 0;
    const x = isGeneral ? 0 : (l.offsetWidth || 0) + gap;
    setThumb({ w, x });
  };

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (leftRef.current) ro.observe(leftRef.current);
    if (rightRef.current) ro.observe(rightRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneral]);

  const clickGeneral = () => {
    onChange("general");
    setWiggle("general");
    setTimeout(() => setWiggle(null), 360);
  };
  const clickAcademic = () => {
    onChange("academic");
    setWiggle("academic");
    setTimeout(() => setWiggle(null), 360);
  };

  return (
    <>
      <style>{`
        @keyframes nudge {0%{transform:translateY(0) rotate(0)}
          28%{transform:translateY(-2px) rotate(-4deg) scale(1.02)}
          56%{transform:translateY(1px) rotate(3deg)}
          84%{transform:translateY(-1px) rotate(-2deg) scale(1.01)}
          100%{transform:translateY(0) rotate(0)}}
        .emoji-wiggle{animation:nudge 340ms ease-in-out}
      `}</style>
      <div className="w-full flex justify-center">
        <div className="relative inline-flex items-center gap-2 p-1 rounded-full">
          {/* sliding outline (transparent fill) */}
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full transition-transform duration-300 ease-out pointer-events-none"
            style={{
              width: thumb.w || 148,
              transform: `translateX(${thumb.x || 0}px)`,
              background: "transparent",
              borderStyle: "solid",
              borderWidth: 2,
              borderImageSlice: 1,
              borderImageSource: `linear-gradient(90deg, ${TOKENS.pink}, ${TOKENS.red})`,
            }}
          />
          <button
            ref={leftRef}
            type="button"
            onClick={clickGeneral}
            className={`relative z-10 h-11 px-5 rounded-full text-[15px] transition-colors ${
              isGeneral ? "text-slate-900" : "text-slate-600 hover:text-slate-800"
            }`}
            style={{ background: "transparent" }}
            aria-pressed={isGeneral}
          >
            <span className={`inline-block mr-1 ${wiggle === "general" ? "emoji-wiggle" : ""}`} aria-hidden>💬</span>
            <span className="transition-[font-weight] duration-200" style={{ fontWeight: isGeneral ? 700 : 600 }}>
              Freeboard
            </span>
          </button>
          <button
            ref={rightRef}
            type="button"
            onClick={clickAcademic}
            className={`relative z-10 h-11 px-5 rounded-full text-[15px] transition-colors ${
              !isGeneral ? "text-slate-900" : "text-slate-600 hover:text-slate-800"
            }`}
            style={{ background: "transparent" }}
            aria-pressed={!isGeneral}
          >
            <span className={`inline-block mr-1 ${wiggle === "academic" ? "emoji-wiggle" : ""}`} aria-hidden>🎓</span>
            <span className="transition-[font-weight] duration-200" style={{ fontWeight: !isGeneral ? 700 : 600 }}>
              Academic
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ===== Phone Frame UI for composer ===== */
function PhoneFrame({ children }) {
  return (
    <div className="mx-auto w-[360px]">
      <div className="relative rounded-[36px] border-[10px] border-black/90 bg-black/90 shadow-2xl">
        {/* notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 h-6 w-24 rounded-b-2xl bg-black/70" />
        {/* inner screen */}
        <div className="m-2 rounded-[26px] overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ===== Freeboard form (title, content, photos) ===== */
function FreeboardForm({ title, setTitle, content, setContent, images, setImages }) {
  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files].slice(0, 6));
  };
  const removeAt = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="p-4">
      <div className="text-[13px] font-semibold text-slate-700 mb-2">Write to Freeboard</div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`e.g. "Best late-night study spots near Bobst?"`}
        className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
        style={{ borderColor: TOKENS.border }}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder={`Share details or ask a follow-up.`}
        className="mt-3 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
        style={{ borderColor: TOKENS.border }}
      />
      {/* photos */}
      <div className="mt-3">
        <label className="block text-[12px] font-medium text-slate-600 mb-1">Photos (up to 6)</label>
        <input type="file" accept="image/*" multiple onChange={onPick} />
        {!!images.length && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {images.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="aspect-square w-full object-cover rounded-lg" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/70 text-white text-xs px-1.5 py-0.5"
                  onClick={() => removeAt(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Posting as anonymous.</p>
    </div>
  );
}

/* ===== Academic form: Question vs Looking for ===== */
function AcademicForm({
  mode, setMode,
  title, setTitle,
  content, setContent,
  courseCode, setCourseCode,
  materialType, setMaterialType,
  extraNote, setExtraNote,
}) {
  return (
    <div className="p-4">
      <div className="text-[13px] font-semibold text-slate-700 mb-2">Write to Academic</div>

      {/* internal segmented for mode */}
      <div className="mb-3 inline-flex rounded-full border border-slate-200 p-1 bg-white">
        <button
          type="button"
          onClick={() => setMode("question")}
          className={`h-9 px-4 rounded-full text-sm ${mode === "question" ? "font-semibold text-slate-900" : "text-slate-600"}`}
          style={mode === "question"
            ? { background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg,#FF6B8A,#FF7A70) border-box", border: "2px solid transparent" }
            : {}}
        >
          Question
        </button>
        <button
          type="button"
          onClick={() => setMode("looking_for")}
          className={`h-9 px-4 rounded-full text-sm ${mode === "looking_for" ? "font-semibold text-slate-900" : "text-slate-600"}`}
          style={mode === "looking_for"
            ? { background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg,#FF6B8A,#FF7A70) border-box", border: "2px solid transparent" }
            : {}}
        >
          Looking for
        </button>
      </div>

      {/* shared title/content */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={mode === "question" ? `e.g. "Which prof is better for DS-UA 201?"` : `e.g. "Looking for DS-UA 201 midterm review"`}
        className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
        style={{ borderColor: TOKENS.border }}
      />

      {/* mode-specific fields */}
      {mode === "question" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder={`Share details or ask a follow-up.\n• Interview prep notes?\n• Advice for course planning?`}
          className="mt-3 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
          style={{ borderColor: TOKENS.border }}
        />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Course</label>
              {/* simple input (you can swap to your CourseCodePicker here) */}
              <input
                type="text"
                inputMode="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. DS-UA 201"
                className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
                style={{ borderColor: TOKENS.border }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Material type</label>
              <input
                type="text"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. syllabus, midterm review, past exams"
                className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
                style={{ borderColor: TOKENS.border }}
              />
            </div>
          </div>
          <textarea
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            rows={4}
            placeholder="Any extra details (links allowed)"
            className="mt-3 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
            style={{ borderColor: TOKENS.border }}
          />
          <p className="mt-2 text-[11px] text-slate-500">This post will be highlighted as <strong>Looking for</strong> in the feed.</p>
        </>
      )}
    </div>
  );
}

/* ===== Skeleton (thicker separators) ===== */
function FeedSkeleton({ rows = 8 }) {
  return (
    <ul className="mx-auto max-w-[700px] px-2 py-2 divide-y-2 divide-slate-300/90">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="py-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ===== Post row (full-clickable) ===== */
function PostRow({ post, onOpenDetail }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenDetail()}
      className="mx-auto max-w-[700px] px-2 focus:outline-none"
    >
      <div className="group -mx-2 px-2 py-5 hover:bg-slate-50 transition">
        {/* top: avatar left, time right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
              <PersonIcon />
            </div>
          </div>
          <time className="text-[12px] text-slate-500">{post.ago}</time>
        </div>

        {/* title line with badge (Looking for) */}
        <div className="mt-2 flex items-start gap-2 flex-wrap">
          {post.lookingFor && (
            <span className="inline-flex items-center text-white text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF7A70]">
              Looking for{post.courseCode ? ` · ${post.courseCode}` : ""}
            </span>
          )}
          {post.title ? (
            <h3 className="text-[16px] font-semibold text-slate-900 leading-snug break-words">
              {post.title}
            </h3>
          ) : null}
        </div>

        {/* first url */}
        {post.firstUrl && (
          <span className="mt-1 block text-[14px] text-blue-600 underline-offset-2 group-hover:underline break-all">
            {post.firstUrl}
          </span>
        )}

        {/* preview */}
        {post.preview && (
          <p className="mt-1 text-[14px] text-slate-800 whitespace-pre-line break-words">
            {post.preview}
          </p>
        )}

        {/* meta */}
        <div className="mt-3 flex items-center gap-6 text-[13px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M21 15a4 4 0 0 1-4 4H9l-6 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {post.comments}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ===== Page ===== */
export default function Dashboard() {
  const navigate = useNavigate();
  const { school } = useSchool();
  const { user } = useAuth();
  const schoolPath = useSchoolPath();

  const isAuthed = !!user;
  const schoolKey = school || "nyu";

  const [active, setActive] = useState("general"); // "general" | "academic"
  const [general, setGeneral] = useState({ loading: true, items: [] });
  const [academic, setAcademic] = useState({ loading: true, items: [] });

  // compose states (shared)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // freeboard only
  const [images, setImages] = useState([]);

  // academic only
  const [mode, setMode] = useState("question"); // "question" | "looking_for"
  const [courseCode, setCourseCode] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [extraNote, setExtraNote] = useState("");

  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  /* fetch posts */
  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      setGeneral((s) => ({ ...s, loading: true }));
      setAcademic((s) => ({ ...s, loading: true }));
      try {
        const [gen, acad] = await Promise.all([
          isAuthed
            ? listPosts({ school: schoolKey, limit: 30, sort: "new" })
            : getPublicPosts({ school: schoolKey, limit: 30, sort: "new" }),
          isAuthed
            ? listCareerPosts({ school: schoolKey, limit: 30, sort: "new" })
            : getPublicCareerPosts({ school: schoolKey, limit: 30, sort: "new" }),
        ]);
        if (!alive) return;
        setGeneral({ loading: false, items: normalizePosts(gen) });
        setAcademic({ loading: false, items: normalizePosts(acad) });
      } catch {
        if (!alive) return;
        setGeneral({ loading: false, items: [] });
        setAcademic({ loading: false, items: [] });
      }
    }
    fetchAll();
    return () => { alive = false; };
  }, [isAuthed, schoolKey]);

  const current = active === "general" ? general : academic;

  const goGeneral = () => navigate(schoolPath("/freeboard"));
  const goAcademic = () => navigate(schoolPath("/career"));
  const openDetail = (post) => {
    const id = post.slug || post._id || post.id;
    if (!id) return (active === "general" ? goGeneral() : goAcademic());
    const to =
      active === "general"
        ? schoolPath(`/freeboard/${id}`)
        : schoolPath(`/career/${id}`);
    navigate(to);
  };

  /* compose handlers */
  const canPostGeneral = isAuthed && title.trim() && (content.trim() || images.length);
  const canPostAcademic =
    isAuthed &&
    title.trim() &&
    (mode === "question"
      ? content.trim()
      : courseCode.trim() && materialType.trim());

  const uploadFiles = async (files) => {
    const urls = [];
    for (const file of files) {
      try {
        const res = await uploadToCloudinary(file);
        if (res?.secure_url || res?.url) urls.push(res.secure_url || res.url);
      } catch {
        // ignore individual failures
      }
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
        setMsg({ type: "success", text: "Posted to Freeboard! Redirecting…" });
        setTimeout(goGeneral, 400);
      } else {
        if (!canPostAcademic) throw new Error("Missing fields");
        const base = { school: schoolKey, title: title.trim() };
        if (mode === "question") {
          await createCareerPost({ ...base, content: content.trim(), postType: "question" });
        } else {
          await createCareerPost({
            ...base,
            content: (content || extraNote).trim(),
            postType: "looking_for",
            kind: "looking_for",
            category: "looking_for",
            lookingFor: true,
            isLookingFor: true,
            courseCode: courseCode.trim(),
            materialType: materialType.trim(),
            meta: { courseCode: courseCode.trim(), materialType: materialType.trim() },
          });
        }
        setMsg({ type: "success", text: "Posted to Academic! Redirecting…" });
        setTimeout(goAcademic, 400);
      }
      // reset
      setTitle("");
      setContent("");
      setImages([]);
      setCourseCode("");
      setMaterialType("");
      setExtraNote("");
      setMode("question");
    } catch {
      setMsg({ type: "error", text: "Failed to post. Please check required fields." });
    } finally {
      setPosting(false);
    }
  };

  const placeholders = useMemo(() => {
    return active === "general"
      ? {
          footer: <>Posting to <strong>Freeboard</strong> as anonymous.</>,
        }
      : {
          footer: <>Posting to <strong>Academic Board</strong> as anonymous.</>,
        };
  }, [active]);

  return (
    <div className="min-h-screen" style={{ background: TOKENS.pageBg }}>
      {/* Two columns: feed + phone composer */}
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-[minmax(620px,700px)_380px] gap-10">
        {/* FEED */}
        <section className="md:col-start-1">
          <Segmented value={active} onChange={setActive} />
          {current.loading ? (
            <FeedSkeleton rows={10} />
          ) : current.items.length ? (
            <ul className="mt-3 mx-auto max-w-[700px] px-2 divide-y-2 divide-slate-300/90">
              {current.items.map((p) => (
                <li key={p._id}>
                  <PostRow post={p} onOpenDetail={() => openDetail(p)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-[700px] text-center py-16">
              <p className="text-[15px] text-slate-600">No posts yet.</p>
              <button
                type="button"
                onClick={active === "general" ? goGeneral : goAcademic}
                className="mt-4 px-4 py-2 rounded-xl bg-black text-white text-[14px] font-semibold"
              >
                Open {active === "general" ? "Freeboard" : "Academic Board"}
              </button>
            </div>
          )}
        </section>

        {/* PHONE COMPOSER (right) */}
        <aside className="md:col-start-2 md:sticky md:top-[24px] self-start">
          <PhoneFrame>
            <form onSubmit={submitPost}>
              {active === "general" ? (
                <FreeboardForm
                  title={title} setTitle={setTitle}
                  content={content} setContent={setContent}
                  images={images} setImages={setImages}
                />
              ) : (
                <AcademicForm
                  mode={mode} setMode={setMode}
                  title={title} setTitle={setTitle}
                  content={content} setContent={setContent}
                  courseCode={courseCode} setCourseCode={setCourseCode}
                  materialType={materialType} setMaterialType={setMaterialType}
                  extraNote={extraNote} setExtraNote={setExtraNote}
                />
              )}

              {/* footer actions inside phone */}
              <div className="px-4 pb-4 pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">{placeholders.footer}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(""); setContent(""); setImages([]);
                      setCourseCode(""); setMaterialType(""); setExtraNote(""); setMode("question");
                      setMsg({ type: "", text: "" });
                    }}
                    className="rounded-xl border px-3.5 py-2 text-sm font-semibold hover:bg-black/5"
                    style={{ borderColor: TOKENS.border }}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={posting || (active === "general" ? !canPostGeneral : !canPostAcademic)}
                    className="rounded-xl px-4 py-2 text-white text-sm font-semibold disabled:opacity-50"
                    style={{ background: TOKENS.primary }}
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {msg.text && (
                <div
                  className={`mx-4 mb-4 rounded-xl px-3 py-2 text-sm ${
                    msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </form>
          </PhoneFrame>
        </aside>
      </main>
    </div>
  );
}

/* ===== helpers (normalizer shows the L/F badge) ===== */
function normalizePosts(res) {
  const arr =
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res) && res) ||
    [];

  return arr.slice(0, 50).map((p) => {
    const title = (p.title || p.subject || "").toString().trim();
    const body = (p.content || p.text || p.body || "").toString();

    const firstUrl = extractFirstUrl([p.link, p.url, p.sourceUrl, body]);
    const cleaned = body.replace(/https?:\/\/[^\s)]+/gi, "").trim();
    const preview = dedupeTitleFromBody(title, cleaned).slice(0, 240);

    const comments =
      (typeof p.commentsCount === "number" && p.commentsCount) ||
      (Array.isArray(p.comments) ? p.comments.length : 0) ||
      (typeof p.replies === "number" ? p.replies : 0);

    const likes =
      (typeof p.likesCount === "number" && p.likesCount) ||
      (Array.isArray(p.likes) ? p.likes.length : 0) ||
      (typeof p.upvotes === "number" ? p.upvotes : 0);

    const lookingFor =
      p.lookingFor ||
      p.isLookingFor ||
      p.kind === "looking_for" ||
      p.category === "looking_for" ||
      p.postType === "looking_for" ||
      p.type === "looking_for";

    return {
      _id: p._id || p.id || Math.random().toString(36).slice(2),
      slug: p.slug,
      title,
      preview,
      firstUrl,
      comments,
      likes,
      ago: p.createdAt ? timeAgo(p.createdAt) : "",
      lookingFor: !!lookingFor,
      courseCode: p.courseCode || p.course || p.course_code || "",
    };
  });
}
function extractFirstUrl(sources) {
  const text = sources.filter(Boolean).join(" ");
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : null;
}
function dedupeTitleFromBody(title, body) {
  if (!title) return body;
  const t = title.trim();
  const b = body.trim();
  if (!b) return "";
  if (b.toLowerCase().startsWith(t.toLowerCase())) return b.slice(t.length).trim();
  return b;
}
function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ""; }
}
