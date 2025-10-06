// frontend/src/pages/academic/AcademicDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { getAcademicPost } from "../../api/academic";
import CommentSection from "../../components/CommentSection";
import RequestPanel from "./RequestPanel"; // ← 같은 폴더로 이동한 컴포넌트

const TOPIC_EMOJI = {
  course_planning: "📚",
  homework_help: "🧩",
  exam_prep: "📝",
  internships: "💼",
  job_search: "💻",
  visa_opt_cpt: "🪪",
  housing: "🏠",
  scholarships: "🎓",
};

export default function AcademicDetail() {
  const { school } = useSchool();
  const { id } = useParams();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        const data = await getAcademicPost({ school, id });
        if (!alive) return;
        setPost(data);
      } catch (e) {
        console.error("load academic post failed", e);
        if (alive) setErr("Failed to load post.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, id]);

  const mode = useMemo(() => {
    const m = String(
      post?.mode || post?.kind || post?.type || (post?.lookingFor ? "looking_for" : "general")
    ).toLowerCase();
    return m === "looking_for" ? "looking_for" : "general";
  }, [post]);

  const isGeneral = mode === "general";
  const isLooking = mode === "looking_for";

  const kind = (post?.kind || post?.category || post?.meta?.kind || "").toLowerCase();
  const generalEmoji = TOPIC_EMOJI[kind] || "❓";
  const lookingEmoji = kind === "study_group" ? "👥" : kind === "coffee_chat" ? "☕️" : "📝";
  const leadingEmoji = isGeneral ? generalEmoji : lookingEmoji;

  return (
    <div className="mx-auto max-w-3xl p-4">
      {!post && !err && <div className="text-sm text-gray-600">Loading…</div>}
      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {post && (
        <>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white font-bold">
                {leadingEmoji}
              </span>
              <span className="rounded-full border px-2 py-0.5 text-xs">
                Academic • {isGeneral ? "General question" : "Looking for"}
              </span>
              {kind && <span className="rounded-full border px-2 py-0.5 text-xs">{String(kind).replace(/_/g, " ")}</span>}
            </div>

            <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
            {post.images?.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {post.images.map((src) => (
                  <img key={src} src={src} alt="" className="rounded-lg border object-cover" />
                ))}
              </div>
            )}
            <div className="mt-4 whitespace-pre-wrap text-sm text-gray-800">{post.content}</div>
          </div>

          {isLooking ? (
            <div className="mt-6">
              <RequestPanel postId={post._id} authorEmail={post.email} />
            </div>
          ) : (
            <CommentSection postId={post._id} authorEmail={post.email} />
          )}
        </>
      )}
    </div>
  );
}

