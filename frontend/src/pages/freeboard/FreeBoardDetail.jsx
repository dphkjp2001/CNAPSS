// frontend/src/pages/freeboard/FreeBoardDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import {
  getPost,
  getPublicPost,
  deletePost,
  updatePost,
  votePost, // ✅ Up/Down API
} from "../../api/posts";
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

  const isAuthed = !!(user?.email || (token && String(token).length > 0));

  // ✅ 투표 로컬 상태(낙관적 업데이트)
  const [upCount, setUpCount] = useState(0);
  const [downCount, setDownCount] = useState(0);
  const [myVote, setMyVote] = useState(null); // "up" | "down" | null
  const score = upCount - downCount;

  const loadPost = async () => {
    setError("");
    try {
      // 1) 공개 상세(비로그인도 확인 가능)
      const pub = await getPublicPost({ school, id });
      setPost(pub);
      setEditTitle(pub?.title || "");
      setEditContent(pub?.content || "");
      setUpCount(pub?.upCount || 0);
      setDownCount(pub?.downCount || 0);
    } catch (err) {
      if (!(err?.status === 404)) {
        setError(err?.message || "Failed to load the post.");
        return;
      }
    }

    // 2) 로그인 상태면 보호 상세로 내 투표 상태(myVote)까지 보강
    if (isAuthed) {
      try {
        const prot = await getPost({ school, id });
        setPost(prot);
        setEditTitle(prot?.title || "");
        setEditContent(prot?.content || "");
        setUpCount(prot?.upCount || 0);
        setDownCount(prot?.downCount || 0);
        setMyVote(prot?.myVote || null);
      } catch {
        /* public 성공했으면 보호 실패는 무시 */
      }
    }
  };

  useEffect(() => {
    if (!school || !id) return;
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, school, isAuthed]);

  // ✅ 알림 딥링크 읽음 반영
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
      } catch {}
    }
    markRead();
  }, [location.search, user?.email, school]);

  // 🔎 하이라이트 대상 comment id
  const highlightId = useMemo(() => {
    const hash = location.hash || "";
    const fromHash = hash.startsWith("#comment-")
      ? hash.slice("#comment-".length)
      : null;
    const nid = new URLSearchParams(location.search).get("nid");
    return fromHash || nid || null;
  }, [location.hash, location.search]);

  // ✅ 작성자 판별: email / id / isMine 모두 대응
  const isAuthor = useMemo(() => {
    const p = post;
    const u = user;
    if (!p || !u) return false;

    const myEmail = String(u.email || "").toLowerCase();
    const myIds = [u.id, u._id].filter(Boolean).map(String);

    const authorEmails = [
      p.email,
      p.authorEmail,
      p.userEmail,
      p.author?.email,
    ]
      .filter(Boolean)
      .map((e) => String(e).toLowerCase());

    const authorIds = [
      p.userId,
      p.authorId,
      p.author?._id,
      p.author?.id,
    ]
      .filter(Boolean)
      .map(String);

    const emailMatch = myEmail && authorEmails.includes(myEmail);
    const idMatch = authorIds.some((id) => myIds.includes(id));
    const flagMatch = Boolean(p.isMine);

    return emailMatch || idMatch || flagMatch;
  }, [user, post]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost({ school, id: post._id });
      alert("Post deleted.");
      navigate(schoolPath("/dashboard?tab=free"));
    } catch (err) {
      alert("Delete failed: " + (err?.message || "Unknown error"));
    }
  };

  // ✅ 낙관적 투표
  const optimisticVote = (dir) => {
    const prev = { upCount, downCount, myVote };
    let nextUp = upCount;
    let nextDown = downCount;
    let nextMy = myVote;

    if (dir === "up") {
      if (myVote === "up") {
        nextUp -= 1; nextMy = null;
      } else if (myVote === "down") {
        nextDown -= 1; nextUp += 1; nextMy = "up";
      } else {
        nextUp += 1; nextMy = "up";
      }
    } else {
      if (myVote === "down") {
        nextDown -= 1; nextMy = null;
      } else if (myVote === "up") {
        nextUp -= 1; nextDown += 1; nextMy = "down";
      } else {
        nextDown += 1; nextMy = "down";
      }
    }

    setUpCount(nextUp);
    setDownCount(nextDown);
    setMyVote(nextMy);
    return prev; // 롤백용 스냅샷
  };

  const handleVote = async (dir) => {
    if (!user) {
      alert("Please log in to vote.");
      return;
    }
    const snapshot = optimisticVote(dir);
    try {
      const result = await votePost({ school, id: post._id, dir });
      if (typeof result?.upCount === "number") setUpCount(result.upCount);
      if (typeof result?.downCount === "number") setDownCount(result.downCount);
      if (typeof result?.myVote !== "undefined") setMyVote(result.myVote);
    } catch (err) {
      // 실패 시 롤백
      setUpCount(snapshot.upCount);
      setDownCount(snapshot.downCount);
      setMyVote(snapshot.myVote);
      alert("Vote failed: " + (err?.message || "Unknown error"));
    }
  };

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
      alert("Update failed: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
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
                <p className="whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
              </div>
            )}

            {/* ✅ Vote controls */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1">
                <button
                  onClick={() => handleVote("up")}
                  disabled={!user || isAuthor}
                  className={`rounded-md px-3 py-1 text-sm font-semibold ${
                    myVote === "up"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  } disabled:opacity-60`}
                  title={
                    !user
                      ? "Log in to vote"
                      : isAuthor
                      ? "You can’t vote on your own post."
                      : "Upvote"
                  }
                  aria-label="Upvote"
                >
                  👍 {upCount}
                </button>

                <button
                  onClick={() => handleVote("down")}
                  disabled={!user || isAuthor}
                  className={`rounded-md px-3 py-1 text-sm font-semibold ${
                    myVote === "down"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  } disabled:opacity-60`}
                  title={
                    !user
                      ? "Log in to vote"
                      : isAuthor
                      ? "You can’t vote on your own post."
                      : "Downvote"
                  }
                  aria-label="Downvote"
                >
                  👎 {downCount}
                </button>

                <span className="ml-2 text-sm font-medium text-gray-700">
                  Score: {score}
                </span>
              </div>

              {isAuthor && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: "#6b46c1" }}
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
                    onClick={() => {
                      setEditTitle(post?.title || "");
                      setEditContent(post?.content || "");
                      setIsEditing(false);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}

              <Link
                to={schoolPath("/dashboard?tab=free")}
                className="ml-auto text-sm font-medium text-blue-600 underline underline-offset-2"
              >
                ← Back to List
              </Link>
            </div>
          </div>
        </div>

        {post?._id && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <CommentSection
              postId={post._id}
              authorEmail={post.email}
              highlightId={highlightId}
              anonymousMode={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}












