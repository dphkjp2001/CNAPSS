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
  const { user, token } = useAuth();

  const [state, setState] = useState({ loading: true, error: "", post: null });
  const [sheetOpen, setSheetOpen] = useState(false);
  console.log("✅ Rendering AcademicDetailMobile");


  // data load: public
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getPublicAcademicPost({ school, id });
        if (!alive) return;
        console.log("✅ Public post loaded:", p);
        setState({ loading: false, error: "", post: p });
        // if logged in and token present, hydrate with private data
        if (user && token) {
            const pr = await getAcademicPost({ school, id });
            if (!alive) return;
            setState((s) => ({ ...s, post: pr || s.post }));
        }
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
  }, [user, token, school, id]);

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
    <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center px-3 py-2">
            <button
            onClick={() => navigate(`/${encodeURIComponent(school)}/dashboard?tab=academic`)}
            className="flex items-center text-gray-700"
            >
            <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="ml-3 text-base font-semibold text-gray-900 truncate">
            Academic Detail
            </h1>
        </div>
        </div>

        {/* Main content */}
        <div className="px-3 py-4">
        {/* Author + time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <span>{authorName}</span>
            <span>•</span>
            <span>{dayjs(p.createdAt).fromNow()}</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{p.title}</h2>

        {/* Tags */}
        {!isSeeking && (
            <span className="mt-1 inline-block text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
            General Question
            </span>
        )}

        {/* Content sections */}
        <ul className="mt-4 space-y-3">
            {sections.map((sec, idx) => {
            const Icon = sec.icon || BookOpen;
            return (
                <li key={idx} className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 text-gray-500" />
                <div>
                    <p className="text-xs text-gray-500">{sec.label}</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{sec.value}</p>
                </div>
                </li>
            );
            })}
        </ul>

        {/* Comments */}
        <div className="mt-6">
            <CommentSection postId={p._id || id} />
        </div>
        </div>
    </div>
    );
}