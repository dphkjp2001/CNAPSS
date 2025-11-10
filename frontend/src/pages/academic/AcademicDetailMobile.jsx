// frontend/src/pages/academic/AcademicDetailMobile.jsx
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
import RequestOfferPanel from "../../components/RequestOfferPanel";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Coffee,
  GraduationCap,
  MoreVertical,
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

const showVal = (v) => (v && String(v).trim() !== "" ? String(v) : "Not specified");

export default function AcademicDetailMobile() {
  const { school: schoolFromPath, id } = useParams();
  const navigate = useNavigate();
  const { school: ctxSchool } = useSchool();
  const school = schoolFromPath || ctxSchool || "nyu";
  const { user } = useAuth();

  const [state, setState] = useState({ loading: true, error: "", post: null });
  const [sheetOpen, setSheetOpen] = useState(false);


  // data load: public
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPublicAcademicPost({ school, id });
        if (!alive) return;
        console.log("✅ Public post loaded:", p);
        setState({ loading: false, error: "", post: p });
      } catch (err) {
        if (!alive) return;
        console.error("❌ Failed public load:", err);
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

  // hydrate with protected
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

  // body scroll lock for bottom sheet
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetOpen]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-red-600">{state.error}</div>
      </div>
    );
  }
  if (!state.post) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-gray-600">Post not found.</div>
      </div>
    );
  }

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

    // sections
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
                ? p.materials.map(m => m.replace(/_/g, " ")).join(", ")
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

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* mobile top bar */}
      <div className="sticky top-0 z-30 bg-[#F8F9FA]/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() =>
              navigate(`/${encodeURIComponent(school)}/dashboard?tab=academic`)
            }
            className="inline-flex items-center gap-2 text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          {isAuthor && (
            <button className="text-gray-500">
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* content */}
      <div className="px-4 pb-24">
        {/* header card */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-semibold text-gray-900">{authorName}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {dayjs(p.createdAt).fromNow()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Academic Board</span>
                  {isSeeking && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                        style={{ backgroundColor: TOKENS.accent }}
                      >
                        <span>{kindEmoji(p.kind)}</span>
                        <span>Seeking</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <h1 className="mt-3 text-xl font-bold text-gray-900 leading-snug">
              {p.title || "Untitled"}
            </h1>

            {!isSeeking && (
              <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-700">General Question</span>
              </div>
            )}
          </div>

          {/* key sections */}
          <div className="px-4 pb-4">
            <ul className="divide-y divide-gray-100">
              {sections.map((sec, idx) => {
                const IconComponent = sec.icon || BookOpen;
                return (
                  <li key={idx} className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500">{sec.label}</p>
                        <p className="mt-0.5 text-[15px] text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {sec.value}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {isAuthor && (
              <div className="pt-4">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 active:scale-[0.98] transition-all shadow-sm"
                >
                  Delete Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* comments always visible */}
        {!isSeeking && (
          <div className="mt-6">
            <CommentSection postId={p._id || id} />
          </div>
        )}
        {isSeeking && (
          <div className="mt-6">
            <CommentSection postId={p._id || id} />
          </div>
        )}
      </div>

      {/* bottom fixed action for seeking posts */}
      {isSeeking && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-3">
            <button
              onClick={() => setSheetOpen(true)}
              className="w-full rounded-xl bg-gray-900 text-white font-semibold py-3 hover:bg-black"
            >
              View Request / Offer
            </button>
          </div>
        </div>
      )}

      {/* bottom sheet modal */}
      {isSeeking && sheetOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSheetOpen(false)}
          />
          {/* sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl border-t border-gray-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-4 pt-3 pb-2">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Respond to this post
                </h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="text-sm text-gray-600 underline"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="px-4 pb-6">
              <RequestOfferPanel
                school={school}
                postId={p._id || id}
                kind={String(p.kind || "").toLowerCase().replace(/[\s-]+/g, "_")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
