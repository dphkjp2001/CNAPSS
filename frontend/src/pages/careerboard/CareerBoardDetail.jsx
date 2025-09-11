// frontend/src/pages/careerboard/CareerBoardDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { getCareerPost, deleteCareerPost, toggleCareerThumbs, updateCareerPost } from "../../api/careerPosts";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { apiFetch } from "../../api/http";

dayjs.extend(relativeTime);
dayjs.locale("en");

export default function CareerBoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  // inline edit
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPost = async () => {
    try {
      const data = await getCareerPost({ school, id });
      setPost(data);
      setEditTitle(data?.title || "");
      setEditContent(data?.content || "");
    } catch (err) {
      setError(err.message || "Failed to load the post.");
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, school]);

  // mark notification read (same as FreeBoard)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const nid = sp.get("nid");
    async function markRead() {
      if (!nid || !user?.email || !school) return;
      try {
        const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
        await apiFetch(`${base}/${school}/notification/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { commentId: nid, email: user.email },
        });
      } catch {
        // ignore
      }
    }
    markRead();
  }, [location.search, user?.email, school]);

  const isAuthor = useMemo(
    () => (user?.email || "").toLowerCase() === (post?.email || "").toLowerCase(),
    [user, post]
  );

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteCareerPost({ school, id: post._id });
      alert("Post deleted.");
      navigate(schoolPath("/career"));
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  const handleThumb = async () => {
    try {
      await toggleCareerThumbs({ school, id: post._id });
      // optimistic toggle then reload for consistency
      setPost((p) =>
        !p
          ? p
          : {
              ...p,
              thumbsUpUsers: (p.thumbsUpUsers || []).includes((user?.email || "").toLowerCase())
                ? p.thumbsUpUsers.filter(
                    (e) => e.toLowerCase() !== (user?.email || "").toLowerCase()
                  )
                : [...(p.thumbsUpUsers || []), (user?.email || "").toLowerCase()],
            }
      );
      await loadPost();
    } catch (err) {
      alert("Failed to like: " + (err.message || "Unknown error"));
    }
  };

  const handleSaveEdit = async () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) return;
    setSaving(true);
    try {
      const updated = await updateCareerPost({ school, id: post._id, title, content });
      const next = updated?.post || updated;
      setPost(next);
      setIsEditing(false);
    } catch (err) {
      alert("Update failed: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(post?.title || "");
    setEditContent(post?.content || "");
    setIsEditing(false);
  };

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-red-700"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        {error}
      </div>
    );
  }
  if (!post) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-lg font-semibold text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Posted by <span className="font-medium">anonymous</span> •{" "}
              {dayjs(post.createdAt).fromNow()}
            </p>
          </div>

          <div className="p-5 sm:p-6">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Content"
                className="h-56 w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            ) : (
              <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-900">
                {post.content}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={handleThumb}
                className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              >
                👍 Like
              </button>
              <span className="text-xs text-gray-500">
                {post.thumbsUpUsers?.length || 0} likes
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAuthor && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-lg border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
              {isAuthor && isEditing && (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-lg border px-3 py-1 text-sm text-white"
                    style={{ backgroundColor: "#111827" }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-lg border px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Comments (same endpoint `/api/:school/comments/:postId`) */}
          <div className="border-t border-gray-100 p-5 sm:p-6">
            <CommentSection postId={post._id} />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate(schoolPath("/career"))}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back to list
          </button>
        </div>
      </div>
    </div>
  );
}
