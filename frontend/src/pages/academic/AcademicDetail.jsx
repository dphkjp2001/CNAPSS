// frontend/src/pages/academic/AcademicDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  getPublicAcademicPost,
  getAcademicPost,
  deleteAcademicPost,
} from "../../api/academicPosts";
import CommentSection from "../../components/CommentSection";
import RequestOfferPanel from "../../components/RequestOfferPanel";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import {
  GraduationCap,
  Clock,
  BookOpen,
  Coffee,
  MoreVertical,
  ArrowLeft,
  User,
} from "lucide-react";

dayjs.extend(relativeTime);
dayjs.locale("en");

const TOKENS = { accent: "#FF7A70", accentHover: "#FF6B61" };

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

  // Load public post
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

  // If logged in, hydrate with protected
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
    return () => {
      alive = false;
    };
  }, [user, school, id]);

  if (state.loading)
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  if (state.error)
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-red-600">{state.error}</div>
      </div>
    );
  if (!state.post)
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Post not found.</div>
      </div>
    );

  const p = state.post;
  const mode = (p.mode || p.postType || p.type || "").toString().toLowerCase();
  const isSeeking = mode === "seeking" || mode === "looking_for";
  const isGeneral = !isSeeking;

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

  const showVal = (v) => (v && String(v).trim() !== "" ? String(v) : "Not specified");

  // === Section build per type ===
  let sections = [];
  if (isGeneral) {
    sections = [
      { label: "Related Course", value: showVal(p.courseName), icon: GraduationCap },
      { label: "Question Details", value: showVal(p.content), icon: BookOpen },
    ];
  } else {
    const kind = String(p.kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (kind === "course_materials") {
      sections = [
        { label: "Course Name", value: showVal(p.title || p.courseName), icon: BookOpen },
        { label: "Professor", value: showVal(p.professor), icon: GraduationCap },
        { label: "Semester", value: showVal(p.semester), icon: Clock },
        {
          label: "Looking for Materials",
          value:
            Array.isArray(p.materials) && p.materials.length
              ? p.materials.map(m => m.replace(/_/g, ' ')).join(", ")
              : "Not specified",
          icon: BookOpen,
        },
      ];
    } else if (kind === "coffee_chat") {
      sections = [
        { label: "Title", value: showVal(p.title), icon: Coffee },
        { label: "Topic", value: showVal(p.content), icon: BookOpen },
      ];
    } else if (kind === "study_mate") {
      sections = [
        { label: "Class", value: showVal(p.courseName), icon: GraduationCap },
        { label: "Topic", value: showVal(p.content), icon: BookOpen },
      ];
    } else {
      sections = [{ label: "Content", value: showVal(p.content), icon: BookOpen }];
    }
  }

  const authorName = p.author?.name || p.author?.username || "Anonymous";
  const kindLabel = isSeeking 
    ? String(p.kind || "").replace(/_/g, " ")
    : "General Question";

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() =>
            navigate(`/${encodeURIComponent(school)}/dashboard?tab=academic`)
          }
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Academic Board</span>
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left article */}
          <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{authorName}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        {dayjs(p.createdAt).fromNow()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">Academic Board</span>
                      {isSeeking && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: TOKENS.accent }}>
                            <span>{kindEmoji(p.kind)}</span>
                            <span>Seeking</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {isAuthor && (
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {p.title || "Untitled"}
              </h1>
              
              {isGeneral && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-base">💬</span>
                  <span className="text-sm font-medium text-blue-700">General Question</span>
                </div>
              )}
            </header>

            {/* Body - Sections */}
            <div className="px-6 py-6">
              <div className="space-y-6">
                {sections.map((sec, idx) => {
                  const IconComponent = sec.icon || BookOpen;
                  return (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1.5">
                          {sec.label}
                        </p>
                        <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {sec.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isAuthor && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 active:scale-[0.98] transition-all shadow-sm"
                  >
                    Delete Post
                  </button>
                </div>
              )}
            </div>

            {/* Comments for General Q&A */}
            {!isSeeking && (
              <div className="border-t border-gray-200 bg-gray-50/50">
                <div className="px-6 py-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
                  <CommentSection postId={p._id || id} />
                </div>
              </div>
            )}
          </article>

          {/* Right panel for Seeking posts */}
          {isSeeking && (
            <div className="lg:sticky lg:top-24 self-start">
              <RequestOfferPanel
                school={school}
                postId={p._id || id}
                kind={String(p.kind || "").toLowerCase().replace(/[\s-]+/g, "_")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
