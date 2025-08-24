// frontend/src/pages/freeboard/FreeBoardDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { getPost, deletePost, toggleThumbs } from "../../api/posts";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";


dayjs.extend(relativeTime);
dayjs.locale("en");

export default function FreeBoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const { token } = useAuth();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  const loadPost = async () => {
    try {
      const data = await getPost({ school, token, id }); // ✅ guard with school
      setPost(data);
    } catch (err) {
      setError(err.message || "Failed to load the post.");
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, school]);

  const isAuthor = useMemo(() => user?.email === post?.email, [user, post]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost(id, user.email, school); // ✅ scoped delete
      alert("Post deleted.");
      navigate(schoolPath("/freeboard"));
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  const handleThumb = async () => {
    try {
      await toggleThumbs({ school, token, id: post._id }); // ✅ /api/:school/posts/:id/thumbs
 // 성공 시 로컬 상태 갱신 (예: setPost)
      setPost((p) =>
      !p ? p : {...p,
      thumbsUpUsers: (p.thumbsUpUsers || []).includes((user?.email||"").toLowerCase())
       ? p.thumbsUpUsers.filter(e => e.toLowerCase() !== (user?.email||"").toLowerCase())
       : [...(p.thumbsUpUsers||[]), (user?.email||"").toLowerCase()],
    });
      await loadPost();
    } catch (err) {
      alert("Failed to like: " + (err.message || "Unknown error"));
    }
  };

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-red-700"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
      >
        {error}
      </div>
    );
  }
  if (!post) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm text-gray-600"
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
            <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Posted by <span className="font-medium">anonymous</span> • {dayjs(post.createdAt).fromNow()}
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="prose prose-sm max-w-none text-gray-800">
              <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleThumb}
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
                aria-label="like post"
              >
                👍 {post.thumbsUpUsers?.length || 0}
              </button>

              {isAuthor && (
                <>
                  <button
                    onClick={() => navigate(schoolPath(`/freeboard/edit/${post._id}`))}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-600"
                  >
                    Delete
                  </button>
                </>
              )}

              <Link
                to={schoolPath("/freeboard")}
                className="ml-auto text-sm font-medium text-blue-600 underline underline-offset-2"
              >
                ← Back to List
              </Link>
            </div>
          </div>
        </div>

        {post?._id && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <CommentSection postId={post._id} authorEmail={post.email} />
          </div>
        )}
      </div>
    </div>
  );
}

