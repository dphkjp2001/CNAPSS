// frontend/src/components/PostItem.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSchoolPath } from "../utils/schoolPath";

/**
 * Generic post card for feeds/lists.
 * - Freeboard post → navigate to /:school/freeboard/:id
 * - Academic Looking For → navigate to /:school/academic/:id
 * - Academic General Question → also /:school/academic/:id
 *
 * Expected "post" shape (backwards-compatible):
 * {
 *   _id: string,
 *   id?: string,
 *   board?: 'free' | 'academic',
 *   mode?: 'general' | 'looking_for',
 *   lookingFor?: boolean,                // legacy flag
 *   lookingForKind?: 'course_materials'|'study_group'|'coffee_chat',
 *   title: string,
 *   content?: string,
 *   images?: string[],
 *   email?: string,                       // author
 *   thumbsCount?: number,
 *   commentsCount?: number,
 *   createdAt?: string | Date,
 * }
 */
const KIND_EMOJI = {
  course_materials: "📝",
  study_group: "👥",
  coffee_chat: "☕️",
};

export default function PostItem({ post }) {
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const id = post?._id || post?.id;
  const board = String(post?.board || "").toLowerCase();
  const modeRaw =
    post?.mode || post?.type || (post?.lookingFor ? "looking_for" : "general");
  const mode = String(modeRaw || "general").toLowerCase();

  const isAcademic = board === "academic" || post?.lookingFor != null; // legacy-friendly
  const isLooking = isAcademic && mode === "looking_for";
  const kind = String(post?.lookingForKind || "course_materials");
  const emoji = isAcademic ? (isLooking ? (KIND_EMOJI[kind] || "🔎") : "❓") : "📝";

  const goDetail = () => {
    if (!id) return;
    if (isAcademic) {
      navigate(schoolPath(`/academic/${id}`));
    } else {
      navigate(schoolPath(`/freeboard/${id}`));
    }
  };

  return (
    <li>
      <button
        onClick={goDetail}
        className="w-full text-left py-3 hover:bg-gray-50 transition rounded-lg"
      >
        <div className="px-3 flex items-start gap-3">
          <div className="mt-1 text-xl leading-none">{emoji}</div>

          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="flex flex-wrap items-center gap-2">
              {isAcademic && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-700">
                  Academic • {isLooking ? "Looking for" : "General"}
                </span>
              )}
              {isLooking && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-700">
                  {kind.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2">
              {post?.title || "(no title)"}
            </h3>

            {/* Content preview */}
            {post?.content && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {post.content}
              </p>
            )}

            {/* Images preview (small) */}
            {Array.isArray(post?.images) && post.images.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {post.images.slice(0, 3).map((src, i) => (
                  <img
                    key={`${id}-img-${i}`}
                    src={src}
                    alt=""
                    className="h-20 w-full rounded-md object-cover border"
                  />
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {typeof post?.thumbsCount === "number" && (
                <span>👍 {post.thumbsCount}</span>
              )}
              {typeof post?.commentsCount === "number" && (
                <span>💬 {post.commentsCount}</span>
              )}
              {post?.createdAt && (
                <span>
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
      <div className="mx-3 border-b border-gray-200" />
    </li>
  );
}
