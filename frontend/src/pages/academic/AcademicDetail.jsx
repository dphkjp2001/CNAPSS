// // frontend/src/pages/academic/AcademicDetail.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useSchool } from "../../contexts/SchoolContext";
// import { useAuth } from "../../contexts/AuthContext";
// import {
//   getPublicAcademicPost,
//   getAcademicPost,         // ✅ 보호 상세 추가
//   deleteAcademicPost,
// } from "../../api/academicPosts";
// import { createRequest, checkRequestExists } from "../../api/request";
// import CommentSection from "../../components/CommentSection";
// import VoteButtons from "../../components/VoteButtons";
// import UserBadge from "../../components/UserBadge";

// const MATERIAL_LABELS = {
//   lecture_notes: "Lecture Notes",
//   syllabus: "Syllabus",
//   past_exams: "Past Exams",
//   quiz_prep: "Quiz Prep",
// };

// function kindEmoji(kind = "") {
//   const k = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");
//   if (k.includes("course_material")) return "📝";
//   if (k.includes("study")) return "👥";
//   if (k.includes("coffee")) return "☕️";
//   return "📌";
// }

// export default function AcademicDetail() {
//   const { school: schoolFromPath, id } = useParams();
//   const navigate = useNavigate();
//   const { school: ctxSchool } = useSchool();
//   const school = schoolFromPath || ctxSchool || "nyu";
//   const { user } = useAuth();

//   const [state, setState] = useState({ loading: true, error: "", post: null });
//   const [reqMsg, setReqMsg] = useState("");
//   const [reqSending, setReqSending] = useState(false);
//   const [flash, setFlash] = useState("");
//   const [requested, setRequested] = useState(false);

//   // 1) 누구나 볼 수 있는 공개 상세 먼저
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const p = await getPublicAcademicPost({ school, id });
//         if (!alive) return;
//         setState({ loading: false, error: "", post: p });
//       } catch (err) {
//         if (!alive) return;
//         setState({
//           loading: false,
//           error: err?.message || "Failed to load post.",
//           post: null,
//         });
//       }
//     })();
//     return () => { alive = false; };
//   }, [school, id]);

//   // 2) 로그인했다면 보호 상세로 보강(작성자 여부 / myVote 등 포함)
//   useEffect(() => {
//     if (!user) return;
//     let alive = true;
//     (async () => {
//       try {
//         const pr = await getAcademicPost({ school, id });
//         if (!alive) return;
//         // 보호 상세가 성공하면 그 데이터로 덮어써서 isMine/author 정보 가시화
//         setState((s) => ({ ...s, post: pr || s.post }));
//       } catch {
//         // 보호 실패는 조용히 무시 (공개 상세는 이미 있음)
//       }
//     })();
//     return () => { alive = false; };
//   }, [user, school, id]);

//   // 3) 요청 보낸 적이 있는지 체크(로그인 시)
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         if (!user) return;
//         const res = await checkRequestExists({ school, targetId: id });
//         if (!alive) return;
//         setRequested(!!res?.exists);
//       } catch {}
//     })();
//     return () => { alive = false; };
//   }, [school, id, user]);

//   const meta = useMemo(() => {
//     const p = state.post || {};
//     const mode = (
//       p.mode ||
//       p.postType ||
//       p.type ||
//       (p.lookingFor ? "looking_for" : "general") ||
//       "general"
//     )
//       .toString()
//       .toLowerCase();
//     return { isSeeking: mode === "looking_for" || mode === "seeking", mode, kind: p.kind || "" };
//   }, [state.post]);

//   // ✅ 작성자 판별: email / id / isMine 모두 대응
//   const isAuthor = useMemo(() => {
//     const p = state.post;
//     const u = user;
//     if (!p || !u) return false;

//     const myEmail = String(u.email || "").toLowerCase();
//     const myIds = [u.id, u._id].filter(Boolean).map(String);

//     const authorEmails = [
//       p.email,
//       p.authorEmail,
//       p.userEmail,
//       p.author?.email,
//     ]
//       .filter(Boolean)
//       .map((e) => String(e).toLowerCase());

//     const authorIds = [
//       p.userId,
//       p.authorId,
//       p.author?._id,
//       p.author?.id,
//     ]
//       .filter(Boolean)
//       .map(String);

//     const emailMatch = myEmail && authorEmails.includes(myEmail);
//     const idMatch = authorIds.some((id) => myIds.includes(id));
//     const flagMatch = Boolean(p.isMine); // ← 보호 상세에서 주는 플래그

//     return emailMatch || idMatch || flagMatch;
//   }, [user, state.post]);

//   const handleDelete = async () => {
//     if (!isAuthor) return;
//     if (!window.confirm("Delete this post?")) return;
//     try {
//       await deleteAcademicPost({ school, id });
//       alert("Post deleted.");
//       navigate(`/${school}/academic`);
//     } catch (err) {
//       alert("Delete failed: " + (err?.message || "Unknown error"));
//     }
//   };

//   if (state.loading) return <div className="p-6 text-gray-500">Loading…</div>;
//   if (state.error) return <div className="p-6 text-red-600">{state.error}</div>;
//   if (!state.post) return <div className="p-6 text-gray-500">Post not found.</div>;

//   const { title, content, createdAt, kind, professor, materials = [] } = state.post;
//   const isCourseMaterials =
//     String(kind || "").toLowerCase().replace(/[\s-]+/g, "_") === "course_materials";
//   const materialLabels = (Array.isArray(materials) ? materials : [])
//     .map((k) => MATERIAL_LABELS[k] || k)
//     .filter(Boolean);

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-6">
//       <article className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
//         <header className="px-5 py-4 border-b border-slate-200">
//           <div className="flex items-center justify-between text-sm text-slate-500">
//             <div className="inline-flex items-center gap-2">
//               <span>{meta.isSeeking ? kindEmoji(kind) : "💬"}</span>
//               <span className="font-medium">
//                 {meta.isSeeking ? "Seeking" : "General question"}
//               </span>
//               {isCourseMaterials && (
//                 <span className="text-slate-400">• Course Materials</span>
//               )}
//             </div>

//             <div className="flex items-center gap-3">
//               <time dateTime={createdAt}>{new Date(createdAt).toLocaleString()}</time>

//               {/* ✅ 작성자에게만 삭제 버튼 노출 (보호 상세 불러오면 isAuthor가 true로 계산됨) */}
//               {isAuthor && (
//                 <button
//                   onClick={handleDelete}
//                   className="ml-2 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
//                   title="Delete this post"
//                 >
//                   Delete
//                 </button>
//               )}
//             </div>
//           </div>

//           <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>

//           {/* Author & Voting */}
//           <div className="mt-3 flex items-center justify-between">
//             <UserBadge
//               username={state.post.nickname}
//               tier={state.post.authorTier}
//               className="text-sm"
//             />
//             <VoteButtons
//               targetType="Post"
//               targetId={id}
//               initialCounts={state.post.counts}
//               initialVote={state.post.myVote}
//               className="scale-90"
//             />
//           </div>

//           {/* materials & professor badges */}
//           {isCourseMaterials && (materialLabels.length || professor) ? (
//             <div className="mt-3 flex flex-wrap items-center gap-2">
//               {materialLabels.map((lbl) => (
//                 <span
//                   key={lbl}
//                   className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
//                 >
//                   {lbl}
//                 </span>
//               ))}
//               {professor && (
//                 <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
//                   Professor: {professor}
//                 </span>
//               )}
//             </div>
//           ) : null}
//         </header>

//         <div className="px-5 py-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
//           {content}
//         </div>

//         {meta.isSeeking ? (
//           <div className="px-5 py-5 border-t border-slate-200 bg-slate-50">
//             <h2 className="text-lg font-semibold mb-2">Send a Request</h2>
//             <p className="text-sm text-slate-600 mb-3">
//               This post doesn’t have comments. Send a private request to the author instead.
//             </p>
//             <form onSubmit={async (e) => {
//               e.preventDefault();
//               if (!user) return setFlash("Please log in to send a request.");
//               if (!reqMsg.trim()) return setFlash("Please write a short message.");
//               setReqSending(true);
//               setFlash("");
//               try {
//                 await createRequest({ school, targetId: id, message: reqMsg.trim() });
//                 setReqMsg("");
//                 setRequested(true);
//                 setFlash("Request sent! Check Messages.");
//               } catch (err) {
//                 setFlash(err?.message || "Failed to send request.");
//               } finally {
//                 setReqSending(false);
//               }
//             }} className="space-y-3">
//               <textarea
//                 value={reqMsg}
//                 onChange={(e) => setReqMsg(e.target.value)}
//                 placeholder="Write a short message (who you are / what you need)…"
//                 rows={4}
//                 className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-slate-900/10"
//                 disabled={requested}
//               />
//               <div className="flex items-center justify-between">
//                 <p className="text-xs text-slate-500">
//                   Target: <strong>Academic · {kind || "general"}</strong>
//                 </p>
//                 <button
//                   type="submit"
//                   disabled={reqSending || requested || !reqMsg.trim()}
//                   className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
//                 >
//                   {requested ? "Already requested" : reqSending ? "Sending…" : "Send request"}
//                 </button>
//               </div>
//               {!!flash && (
//                 <div
//                   className={`text-sm px-3 py-2 rounded-lg border ${
//                     flash.includes("sent")
//                       ? "border-green-200 bg-green-50 text-green-700"
//                       : "border-red-200 bg-red-50 text-red-700"
//                   }`}
//                 >
//                   {flash}
//                 </div>
//               )}
//             </form>
//           </div>
//         ) : (
//           <div className="px-5 py-5 border-t border-slate-200 bg-white">
//             <CommentSection postId={id} />
//           </div>
//         )}
//       </article>
//     </div>
//   );
// }


// frontend/src/pages/academic/AcademicDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPublicAcademicPost,
  getAcademicPost,
  deleteAcademicPost,
} from "../../api/academicPosts";
import CommentSection from "../../components/CommentSection";
import VoteButtons from "../../components/VoteButtons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

dayjs.extend(relativeTime);
dayjs.locale("en");

// Optional: small helper for emoji by kind (kept from your previous version)
function kindEmoji(kind = "") {
  const k = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (k.includes("course_material")) return "📝";
  if (k.includes("study")) return "👥";
  if (k.includes("coffee")) return "☕️";
  return "📌";
}

export default function AcademicDetail() {
  const { school: schoolFromPath, id } = useParams();
  const navigate = useNavigate();
  const { school: ctxSchool } = useSchool();
  const school = schoolFromPath || ctxSchool || "nyu";
  const { user } = useAuth();

  const [state, setState] = useState({
    loading: true,
    error: "",
    post: null,
  });

  // 1) 공개 상세 먼저 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPublicAcademicPost({ school, id });
        if (!alive) return;
        setState({ loading: false, error: "", post: p });
      } catch (err) {
        if (!alive) return;
        setState({
          loading: false,
          error: err?.message || "Failed to load post.",
          post: null,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, id]);

  // 2) 로그인 상태면 보호 상세로 보강(myVote 포함)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const pr = await getAcademicPost({ school, id });
        if (!alive) return;
        setState((s) => ({ ...s, post: pr || s.post }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, school, id]);

  if (state.loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-600">
        Loading…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-sm text-red-600">
        {state.error}
      </div>
    );
  }
  if (!state.post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-600">
        Post not found.
      </div>
    );
  }

  // ---- Derived meta ----
  const p = state.post;
  const mode = (
    p.mode ||
    p.postType ||
    p.type ||
    (p.lookingFor ? "looking_for" : "general")
  )
    .toString()
    .toLowerCase();

  const isGeneral = mode === "general" || mode === "question"; // ✅ general question만 투표 허용
  const isAuthor =
    user &&
    [p.author?._id, p.author?.id, p.userId, p.authorId]
      .filter(Boolean)
      .map(String)
      .some((aid) => String(aid) === String(user._id || user.id));

  const upCount = Number(p.upCount || 0);
  const downCount = Number(p.downCount || 0);
  const myVote = p.myVote ?? null;

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteAcademicPost({ school, id });
      alert("Post deleted.");
      navigate(`/${encodeURIComponent(school)}/dashboard?tab=academic`);
    } catch (err) {
      alert("Delete failed: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <article className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-start gap-4">
            {/* Left: title/meta */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <div className="inline-flex items-center gap-2">
                  <span>{isGeneral ? "💬" : kindEmoji(p.kind)}</span>
                  <span className="font-medium">
                    {isGeneral ? "General question" : "Seeking"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <time dateTime={p.createdAt}>
                    {dayjs(p.createdAt).fromNow()}
                  </time>
                  {isAuthor && (
                    <button
                      onClick={handleDelete}
                      className="ml-2 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                      title="Delete this post"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                {p.title}
              </h1>
            </div>

            {/* Right: vote widget — ✅ general question에만 노출 */}
            {isGeneral && (
              <VoteButtons
                school={school}
                postId={p._id || id}
                initialCounts={{ up: upCount, down: downCount }}
                initialVote={myVote}
                disabled={!!isAuthor} // 작성자는 투표 금지
                className="shrink-0"
              />
            )}
          </div>
        </header>

        {/* Body */}
        <div className="px-5 py-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
          {p.content}
        </div>

        {/* Comments: 기존 정책 유지 (general은 활성 / seeking은 비활성 혹은 읽기) */}
        <div className="px-5 py-5 border-t border-slate-200 bg-white">
          {isGeneral ? (
            <CommentSection postId={p._id || id} />
          ) : (
            <CommentSection postId={p._id || id} disabled />
          )}
        </div>
      </article>
    </div>
  );
}
