// frontend/src/pages/freeboard/FreeBoardDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { getPost, getPublicPost, deletePost, toggleThumbs, updatePost } from "../../api/posts";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { apiFetch } from "../../api/http";

dayjs.extend(relativeTime);
dayjs.locale("en");

export default function FreeBoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  // ✏️ 인라인 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPost = async () => {
    try {
      // 🔓 비로그인: 공개 API, 🔒 로그인: 보호 API
      const data = token
        ? await getPost({ school, id })
        : await getPublicPost({ school, id });

      setPost(data);
      // 편집 폼 값 동기화
      setEditTitle(data?.title || "");
      setEditContent(data?.content || "");
    } catch (err) {
      setError(err.message || "Failed to load the post.");
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, school, token]);

  // ✅ 알림 딥링크로 진입 시 서버에 읽음 반영
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

  // 🔎 스크롤/하이라이트 대상 comment id 추출 (#comment-.. or ?nid=..)
  const highlightId = useMemo(() => {
    const hash = location.hash || "";
    const fromHash = hash.startsWith("#comment-") ? hash.slice("#comment-".length) : null;
    const nid = new URLSearchParams(location.search).get("nid");
    return fromHash || nid || null;
  }, [location.hash, location.search]);

  const isAuthor = useMemo(
    () => (user?.email || "").toLowerCase() === (post?.email || "").toLowerCase(),
    [user, post]
  );

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost({ school, id: post._id });
      alert("Post deleted.");
      navigate(schoolPath("/freeboard"));
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  const handleThumb = async () => {
    // ✋ 요구사항: 비로그인은 좋아요 포함 “다른 기능” 불가 → 아무 것도 안 함(게이트도 열지 않음)
    if (!user) return;
    try {
      await toggleThumbs({ school, id: post._id });
      // 낙관적 업데이트
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
      // 서버 기준으로 다시 동기화
      await loadPost();
    } catch (err) {
      alert("Failed to like: " + (err.message || "Unknown error"));
    }
  };

  // ✏️ 인라인 저장
  const handleSaveEdit = async () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) return;
    setSaving(true);
    try {
      const updated = await updatePost({ school, id: post._id, title, content });
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
              <div className="prose prose-sm max-w-none text-gray-800">
                <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleThumb}
                disabled={!user || isAuthor} // ← 비로그인/자기글이면 비활성화(게이트 안 뜸)
                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                aria-label="like post"
                title={
                  !user
                    ? "Log in to like (disabled for guests)"
                    : isAuthor
                    ? "You can’t like your own post."
                    : "Like post"
                }
              >
                👍 {post.thumbsUpUsers?.length || 0}
              </button>

              {isAuthor && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
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

              {isAuthor && isEditing && (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
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
            {/* 🎯 페이지 진입 시 해당 댓글로 스크롤 + 하이라이트 */}
            <CommentSection
              postId={post._id}
              authorEmail={post.email}
              highlightId={highlightId}
            />
          </div>
        )}
      </div>
    </div>
  );
}






