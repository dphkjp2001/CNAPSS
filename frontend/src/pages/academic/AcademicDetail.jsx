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
import RequestOfferPanel from "../../components/RequestOfferPanel";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

dayjs.extend(relativeTime);
dayjs.locale("en");

console.log("🔵 AcademicList.jsx mounted");


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

  const [state, setState] = useState({ loading: true, error: "", post: null });

  // 1) Load public detail first
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPublicAcademicPost({ school, id });
        if (!alive) return;
        setState({ loading: false, error: "", post: p });
      } catch (err) {
        if (!alive) return;
        setState({ loading: false, error: err?.message || "Failed to load post.", post: null });
      }
    })();
    return () => { alive = false; };
  }, [school, id]);

  // 2) If logged in, hydrate with protected detail (myVote/isMine etc.)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const pr = await getAcademicPost({ school, id });
        if (!alive) return;
        setState((s) => ({ ...s, post: pr || s.post }));
      } catch {/* ignore */}
    })();
    return () => { alive = false; };
  }, [user, school, id]);

  if (state.loading) return <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-600">Loading…</div>;
  if (state.error) return <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-red-600">{state.error}</div>;
  if (!state.post) return <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-slate-600">Post not found.</div>;

  const p = state.post;
  const mode = (p.mode || p.postType || p.type || (p.lookingFor ? "looking_for" : "general")).toString().toLowerCase();
  const isSeeking = mode === "seeking" || mode === "looking_for";
  const isGeneral = !isSeeking;

  const upCount = Number(p.upCount || p.counts?.up || 0);
  const downCount = Number(p.downCount || p.counts?.down || 0);
  const myVote = p.myVote ?? null;

  const isAuthor =
    user &&
    [p.author?._id, p.author?.id, p.userId, p.authorId]
      .filter(Boolean)
      .map(String)
      .some((aid) => String(aid) === String(user._id || user.id));

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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="grid gap-6 md:grid-cols-[1fr,360px]">
        {/* Left: Article */}
        <article className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <header className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <span>{isSeeking ? kindEmoji(p.kind) : "💬"}</span>
                    <span className="font-medium">
                      {isSeeking ? "Seeking" : "General question"}
                    </span>
                    {p.kind && (
                      <span className="text-slate-400">• {String(p.kind).replace(/_/g, " ")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <time dateTime={p.createdAt}>{dayjs(p.createdAt).fromNow()}</time>
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

                <h1 className="mt-2 text-2xl font-semibold text-slate-900">{p.title}</h1>
              </div>

              {/* Right-top: Vote (ONLY for general question) */}
              {isGeneral && (
                <VoteButtons
                  school={school}
                  postId={p._id || id}
                  initialCounts={{ up: upCount, down: downCount }}
                  initialVote={myVote}
                  disabled={!!isAuthor}
                  className="shrink-0"
                />
              )}
            </div>
          </header>

          <div className="px-5 py-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
            {p.content}
          </div>

          {/* Comments: only on general question */}
          {isGeneral && (
            <div className="px-5 py-5 border-t border-slate-200 bg-white">
              <CommentSection postId={p._id || id} />
            </div>
          )}
        </article>

        {/* Right: Request / Offer panel for seeking posts */}
        {isSeeking ? (
          <RequestOfferPanel
            school={school}
            postId={p._id || id}
            kind={String(p.kind || "").toLowerCase().replace(/[\s-]+/g, "_")}
          />
        ) : null}
      </div>
    </div>
  );
}
