// frontend/src/components/PostItem.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";

const KIND_EMOJI = {
  course_materials: "📝",
  study_group: "👥",
  coffee_chat: "☕️",
};

export default function PostItem({ post }) {
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const isLooking = post?.type === "looking_for" || post?.lookingFor === true;
  const kind = post?.lookingForKind || "course_materials";
  const emoji = KIND_EMOJI[kind] || "🔎";

  const goDetail = () => {
    if (isLooking) {
      navigate(schoolPath(`/academic/requests/${post._id || post.id}`));
    } else {
      navigate(schoolPath(`/freeboard/${post._id || post.id}`));
    }
  };

  return (
    <li>
      <button
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
        onClick={goDetail}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[15px]">
          {isLooking ? emoji : "?"}
        </div>

        <div className="min-w-0 grow">
          <div className="truncate text-[15px] font-semibold text-gray-900">
            {post.title || "(untitled)"}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span>{post.anonymous ? "anonymous" : post.authorName || "unknown"}</span>
            {post.createdAt && (
              <>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </button>
      <div className="mx-3 border-b border-gray-200" />
    </li>
  );
}




